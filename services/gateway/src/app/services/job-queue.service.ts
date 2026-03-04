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
}
