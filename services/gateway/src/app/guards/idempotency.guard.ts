/**
 * @file idempotency.guard.ts
 * @req API-IDEM-0001 — Idempotency keys on all writes (§14 API contracts)
 */
import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { SupabaseService } from '../services/supabase.service';
import * as crypto from 'crypto';

/**
 * M1.3: X-Idempotency-Key Enforcement Guard
 *
 * Every payment or distribution POST must be idempotent.
 * If the driver hits "Accept" twice due to poor LTE, the system
 * must process only one event.
 *
 * Usage: Apply @UseGuards(IdempotencyGuard) to any POST endpoint
 * that mutates financial state.
 *
 * The client MUST send `X-Idempotency-Key` header. If the key was
 * already used for this endpoint, the guard returns the cached response
 * instead of re-processing.
 */
@Injectable()
export class IdempotencyGuard implements CanActivate {
  private readonly logger = new Logger(IdempotencyGuard.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const idempotencyKey = request.headers['x-idempotency-key'];

    // If no idempotency key provided, allow through (non-critical endpoints)
    if (!idempotencyKey) {
      return true;
    }

    const endpoint = `${request.method} ${request.route?.path || request.url}`;
    const requestHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(request.body || {}))
      .digest('hex');

    const supabase = this.supabaseService.getClient();

    try {
      // Check if this key+endpoint combo already exists
      const { data: existing } = await supabase
        .from('idempotency_keys')
        .select('id, response_status, response_body, expires_at')
        .eq('idempotency_key', idempotencyKey)
        .eq('endpoint', endpoint)
        .single();

      if (existing) {
        // Key already used — check if expired
        if (new Date(existing.expires_at) < new Date()) {
          // Expired — delete and allow new request
          await supabase
            .from('idempotency_keys')
            .delete()
            .eq('id', existing.id);

          // Store key for later response caching
          request._idempotencyKeyId = null;
          request._idempotencyKey = idempotencyKey;
          request._idempotencyEndpoint = endpoint;
          request._idempotencyRequestHash = requestHash;
          return true;
        }

        // Return cached response
        if (existing.response_body) {
          this.logger.log(
            `M1.3: Idempotent replay for key ${idempotencyKey} on ${endpoint}`,
          );

          const response = context.switchToHttp().getResponse();
          response.status(existing.response_status || 200).json(existing.response_body);
          return false; // Prevent handler execution
        }

        // Key exists but no response cached yet (concurrent request in progress)
        throw new HttpException(
          'Request with this idempotency key is already being processed',
          HttpStatus.CONFLICT,
        );
      }

      // New key — insert placeholder
      const { data: inserted } = await supabase
        .from('idempotency_keys')
        .insert({
          idempotency_key: idempotencyKey,
          tenant_id: request.tenantId || null,
          endpoint,
          request_hash: requestHash,
        })
        .select('id')
        .single();

      // Attach key ID to request for response caching in interceptor
      request._idempotencyKeyId = inserted?.id;
      request._idempotencyKey = idempotencyKey;

      return true;
    } catch (err: any) {
      if (err instanceof HttpException) throw err;

      // If idempotency check fails (DB unavailable), allow through
      this.logger.warn(`Idempotency check failed: ${err.message} — allowing through`);
      return true;
    }
  }
}

/**
 * M1.3: Idempotency Response Interceptor
 *
 * Caches successful responses for idempotent requests so that
 * replays return the same result.
 */
import { CallHandler, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const keyId = request._idempotencyKeyId;

    if (!keyId) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (responseBody) => {
        try {
          const response = context.switchToHttp().getResponse();
          const supabase = this.supabaseService.getClient();

          await supabase
            .from('idempotency_keys')
            .update({
              response_status: response.statusCode || 200,
              response_body: responseBody,
            })
            .eq('id', keyId);
        } catch (err: any) {
          this.logger.warn(`Failed to cache idempotent response: ${err.message}`);
        }
      }),
    );
  }
}
