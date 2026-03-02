import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly failureThreshold = 5;
  private readonly latencyThresholdMs = 5000;
  private readonly openDurationMs = 60_000;

  // In-memory state for fast checks (persisted to DB for dashboard visibility)
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureAt: Date | null = null;
  private openedAt: Date | null = null;
  private queuedPayments: Array<{ id: string; payload: any }> = [];

  constructor(private readonly supabaseService: SupabaseService) {
    this.loadState();
  }

  private async loadState(): Promise<void> {
    try {
      const supabase = this.supabaseService.getClient();
      const { data } = await supabase
        .from('circuit_breaker_state')
        .select('*')
        .eq('id', 'paysurity_gateway')
        .single();

      if (data) {
        this.state = data.state as CircuitState;
        this.failureCount = data.failure_count;
        this.lastFailureAt = data.last_failure_at ? new Date(data.last_failure_at) : null;
        this.openedAt = data.opened_at ? new Date(data.opened_at) : null;
      }
    } catch {
      // First boot — no state row yet
    }
  }

  private async persistState(): Promise<void> {
    try {
      const supabase = this.supabaseService.getClient();
      await supabase.from('circuit_breaker_state').upsert({
        id: 'paysurity_gateway',
        service_name: 'PaySurity Payment Gateway',
        state: this.state,
        failure_count: this.failureCount,
        last_failure_at: this.lastFailureAt?.toISOString() || null,
        opened_at: this.openedAt?.toISOString() || null,
        half_open_at: this.state === 'HALF_OPEN' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      });
    } catch (err: any) {
      this.logger.error('Failed to persist circuit breaker state: ' + err.message);
    }
  }

  /**
   * Check if the circuit allows a request to proceed.
   * Returns true if the request should proceed normally.
   * Returns false if the request should be queued.
   */
  isAllowed(): boolean {
    if (this.state === 'CLOSED') return true;

    if (this.state === 'OPEN') {
      // Check if open duration has elapsed → transition to HALF_OPEN
      if (this.openedAt && Date.now() - this.openedAt.getTime() > this.openDurationMs) {
        this.state = 'HALF_OPEN';
        this.persistState();
        this.logger.log('Circuit breaker → HALF_OPEN (testing probe request)');
        return true; // Allow one probe request
      }
      return false;
    }

    // HALF_OPEN: allow one probe request
    return true;
  }

  /**
   * Record a successful payment API call.
   */
  recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.logger.log('Circuit breaker → CLOSED (probe request succeeded)');
      this.state = 'CLOSED';
      this.failureCount = 0;
      this.openedAt = null;
      this.persistState();
      this.drainQueue();
    } else if (this.state === 'CLOSED') {
      this.failureCount = 0;
    }
  }

  /**
   * Record a failed or slow payment API call.
   */
  recordFailure(latencyMs?: number): void {
    const isLatencyFailure = latencyMs !== undefined && latencyMs > this.latencyThresholdMs;

    if (isLatencyFailure) {
      this.logger.warn(`PaySurity latency ${latencyMs}ms exceeds threshold ${this.latencyThresholdMs}ms`);
    }

    this.failureCount++;
    this.lastFailureAt = new Date();

    if (this.state === 'HALF_OPEN') {
      // Probe failed → re-open
      this.logger.warn('Circuit breaker → OPEN (probe request failed)');
      this.state = 'OPEN';
      this.openedAt = new Date();
      this.persistState();
      return;
    }

    if (this.failureCount >= this.failureThreshold) {
      this.logger.error(
        `Circuit breaker → OPEN (${this.failureCount} failures). Switching to Queued Mode.`,
      );
      this.state = 'OPEN';
      this.openedAt = new Date();
      this.persistState();

      // Alert admin via notification_log
      this.alertAdmin().catch(() => {});
    }
  }

  /**
   * Queue a payment for later processing when circuit is OPEN.
   */
  enqueue(id: string, payload: any): void {
    this.queuedPayments.push({ id, payload });
    this.logger.log(`Payment ${id} queued (circuit OPEN). Queue size: ${this.queuedPayments.length}`);
  }

  /**
   * Get current circuit state.
   */
  getState(): {
    state: CircuitState;
    failureCount: number;
    queueSize: number;
    lastFailureAt: string | null;
    openedAt: string | null;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      queueSize: this.queuedPayments.length,
      lastFailureAt: this.lastFailureAt?.toISOString() || null,
      openedAt: this.openedAt?.toISOString() || null,
    };
  }

  private async drainQueue(): Promise<void> {
    if (this.queuedPayments.length === 0) return;

    this.logger.log(`Draining ${this.queuedPayments.length} queued payments...`);
    const queue = [...this.queuedPayments];
    this.queuedPayments = [];

    for (const item of queue) {
      this.logger.log(`Re-processing queued payment ${item.id}`);
      // In production: re-invoke PaymentService.processPayment(item.payload)
    }
  }

  private async alertAdmin(): Promise<void> {
    const supabase = this.supabaseService.getClient();

    await supabase.from('notification_log').insert({
      tenant_id: null,
      recipient_email: 'ops@urwaydispatch.com',
      event_type: 'CIRCUIT_BREAKER_OPEN',
      subject: 'ALERT: PaySurity Gateway Circuit Breaker OPEN',
      metadata: {
        failure_count: this.failureCount,
        opened_at: this.openedAt?.toISOString(),
        queue_size: this.queuedPayments.length,
      },
    });
  }
}
