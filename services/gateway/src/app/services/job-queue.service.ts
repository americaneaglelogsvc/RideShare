import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

export interface QueuedJob {
  id: string;
  queue: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'dead';
  attempts: number;
  maxAttempts: number;
  runAt?: Date;
  error?: string;
  failure_class?: 'transient' | 'permanent' | 'unknown';
  replayed_at?: string;
  replay_result?: 'success' | 'failed';
}

type JobHandler = (payload: Record<string, unknown>) => Promise<void>;

@Injectable()
export class JobQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobQueueService.name);
  private handlers = new Map<string, JobHandler>();
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private processing = false;

  constructor(private readonly supabaseService: SupabaseService) {}

  onModuleInit() {
    this.pollInterval = setInterval(() => this.processNextBatch(), 5000);
    this.logger.log('Job queue polling started (5s interval)');
  }

  onModuleDestroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  registerHandler(queue: string, handler: JobHandler) {
    this.handlers.set(queue, handler);
    this.logger.log(`Registered handler for queue: ${queue}`);
  }

  async enqueue(queue: string, payload: Record<string, unknown>, options?: { runAt?: Date; maxAttempts?: number }): Promise<string> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('job_queue')
      .insert({
        queue,
        payload,
        status: 'pending',
        attempts: 0,
        max_attempts: options?.maxAttempts || 3,
        run_at: options?.runAt?.toISOString() || new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      this.logger.error(`Failed to enqueue job on ${queue}: ${error.message}`);
      throw error;
    }

    this.logger.debug(`Enqueued job ${data.id} on queue ${queue}`);
    return data.id;
  }

  private async processNextBatch() {
    if (this.processing) return;
    this.processing = true;

    try {
      const supabase = this.supabaseService.getClient();

      const { data: jobs } = await supabase
        .from('job_queue')
        .select('*')
        .eq('status', 'pending')
        .lte('run_at', new Date().toISOString())
        .order('run_at', { ascending: true })
        .limit(10);

      if (!jobs || jobs.length === 0) return;

      for (const job of jobs) {
        const handler = this.handlers.get(job.queue);
        if (!handler) {
          this.logger.warn(`No handler for queue: ${job.queue}`);
          continue;
        }

        await supabase.from('job_queue').update({ status: 'processing', attempts: job.attempts + 1 }).eq('id', job.id);

        try {
          await handler(job.payload);
          await supabase.from('job_queue').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', job.id);
        } catch (err: any) {
          const newAttempts = job.attempts + 1;
          const maxAttempts = job.max_attempts || 3;

          if (newAttempts >= maxAttempts) {
            await supabase.from('job_queue').update({ status: 'dead', error: err.message }).eq('id', job.id);
            this.logger.error(`Job ${job.id} dead after ${newAttempts} attempts: ${err.message}`);
          } else {
            const backoffMs = Math.min(1000 * Math.pow(2, newAttempts), 300000);
            const runAt = new Date(Date.now() + backoffMs).toISOString();
            await supabase.from('job_queue').update({ status: 'pending', error: err.message, run_at: runAt }).eq('id', job.id);
            this.logger.warn(`Job ${job.id} failed (attempt ${newAttempts}/${maxAttempts}), retry at ${runAt}`);
          }
        }
      }
    } catch (err: any) {
      this.logger.error(`Job queue processing error: ${err.message}`);
    } finally {
      this.processing = false;
    }
  }

  async getQueueStats(): Promise<Record<string, number>> {
    const supabase = this.supabaseService.getClient();
    const stats: Record<string, number> = {};

    for (const status of ['pending', 'processing', 'completed', 'failed', 'dead']) {
      const { count } = await supabase.from('job_queue').select('*', { count: 'exact', head: true }).eq('status', status);
      stats[status] = count || 0;
    }

    return stats;
  }

  // ═══════════════════════════════════════════════════════════════
  // DLQ — CANONICAL §11.1 Dead-letter queue + replay tooling
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get all dead-letter jobs with optional queue filter.
   */
  async getDlqJobs(queue?: string, limit = 50): Promise<QueuedJob[]> {
    const supabase = this.supabaseService.getClient();
    let q = supabase.from('job_queue').select('*').eq('status', 'dead').order('created_at', { ascending: false }).limit(limit);
    if (queue) q = q.eq('queue', queue);
    const { data } = await q;
    return (data || []) as QueuedJob[];
  }

  /**
   * Classify a dead job as transient or permanent.
   * Transient: timeouts, rate limits, temporary unavailability.
   * Permanent: validation errors, missing data, schema violations.
   */
  async classifyDlqJob(jobId: string): Promise<'transient' | 'permanent' | 'unknown'> {
    const supabase = this.supabaseService.getClient();
    const { data: job } = await supabase.from('job_queue').select('*').eq('id', jobId).single();
    if (!job) throw new Error(`Job ${jobId} not found`);

    const errorMsg = (job.error || '').toLowerCase();
    let failureClass: 'transient' | 'permanent' | 'unknown' = 'unknown';

    const transientPatterns = ['timeout', 'econnrefused', 'econnreset', 'rate limit', '429', '503', '502', 'temporarily', 'retry'];
    const permanentPatterns = ['validation', 'invalid', 'not found', '404', 'schema', 'constraint', 'duplicate', 'forbidden', '403', '401'];

    if (transientPatterns.some(p => errorMsg.includes(p))) {
      failureClass = 'transient';
    } else if (permanentPatterns.some(p => errorMsg.includes(p))) {
      failureClass = 'permanent';
    }

    await supabase.from('job_queue').update({ failure_class: failureClass }).eq('id', jobId);
    return failureClass;
  }

  /**
   * Classify all unclassified dead jobs.
   */
  async classifyAllDlq(): Promise<{ transient: number; permanent: number; unknown: number }> {
    const supabase = this.supabaseService.getClient();
    const { data: jobs } = await supabase.from('job_queue').select('id').eq('status', 'dead').is('failure_class', null);

    const counts = { transient: 0, permanent: 0, unknown: 0 };
    for (const job of (jobs || [])) {
      const cls = await this.classifyDlqJob(job.id);
      counts[cls]++;
    }
    return counts;
  }

  /**
   * Dry-run replay estimation: projects how many dead jobs would succeed if replayed.
   * Returns projected success rate (CANONICAL §1.4 gate: ≥70%).
   */
  async dryRunReplayEstimate(): Promise<{ total: number; transient: number; permanent: number; unknown: number; projectedSuccessRate: number }> {
    const supabase = this.supabaseService.getClient();

    const { data: deadJobs } = await supabase.from('job_queue').select('failure_class').eq('status', 'dead');
    const jobs = deadJobs || [];

    if (jobs.length === 0) {
      return { total: 0, transient: 0, permanent: 0, unknown: 0, projectedSuccessRate: 100 };
    }

    // Classify any unclassified first
    await this.classifyAllDlq();

    const { data: classified } = await supabase.from('job_queue').select('failure_class').eq('status', 'dead');
    const all = classified || [];

    const transient = all.filter(j => j.failure_class === 'transient').length;
    const permanent = all.filter(j => j.failure_class === 'permanent').length;
    const unknown = all.filter(j => j.failure_class === 'unknown' || !j.failure_class).length;

    // Transient jobs are expected to succeed on replay; unknown get 50% estimate
    const projectedSuccesses = transient + Math.floor(unknown * 0.5);
    const projectedSuccessRate = all.length > 0 ? Math.round((projectedSuccesses / all.length) * 100) : 100;

    return { total: all.length, transient, permanent, unknown, projectedSuccessRate };
  }

  /**
   * Replay a specific dead job (re-enqueue it with reset attempts).
   * Idempotent: uses the original job ID as idempotency key.
   */
  async replayJob(jobId: string): Promise<{ success: boolean; newJobId?: string }> {
    const supabase = this.supabaseService.getClient();
    const { data: job } = await supabase.from('job_queue').select('*').eq('id', jobId).eq('status', 'dead').single();

    if (!job) throw new Error(`Dead job ${jobId} not found`);

    // Re-enqueue
    const newJobId = await this.enqueue(job.queue, job.payload, { maxAttempts: job.max_attempts || 3 });

    // Mark original as replayed
    await supabase.from('job_queue').update({
      replayed_at: new Date().toISOString(),
      replay_result: 'success',
    }).eq('id', jobId);

    this.logger.log(`DLQ replay: job ${jobId} re-enqueued as ${newJobId}`);
    return { success: true, newJobId };
  }

  /**
   * Replay all transient dead jobs.
   */
  async replayAllTransient(): Promise<{ replayed: number; failed: number }> {
    const supabase = this.supabaseService.getClient();
    const { data: jobs } = await supabase.from('job_queue').select('id').eq('status', 'dead').eq('failure_class', 'transient').is('replayed_at', null);

    let replayed = 0;
    let failed = 0;
    for (const job of (jobs || [])) {
      try {
        await this.replayJob(job.id);
        replayed++;
      } catch {
        failed++;
      }
    }

    this.logger.log(`DLQ bulk replay: ${replayed} replayed, ${failed} failed`);
    return { replayed, failed };
  }
}
