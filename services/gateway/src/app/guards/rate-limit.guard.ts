import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';

/**
 * Lightweight in-memory rate limiter for protecting Admin and Webhook endpoints.
 * Uses a sliding window approach per IP address.
 *
 * For production scale, replace with @nestjs/throttler backed by Redis.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private readonly store: Map<string, { count: number; resetAt: number }> = new Map();

  constructor(windowMs = 60_000, maxRequests = 30) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Periodic cleanup every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (entry.resetAt < now) this.store.delete(key);
      }
    }, 5 * 60_000);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';
    const key = `${ip}:${context.getClass().name}`;
    const now = Date.now();

    const entry = this.store.get(key);

    if (!entry || entry.resetAt < now) {
      this.store.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    entry.count++;

    if (entry.count > this.maxRequests) {
      const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Rate limit exceeded. Try again in ${retryAfterSec} seconds.`,
          retryAfter: retryAfterSec,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}

/**
 * Stricter rate limiter for webhook endpoints: 100 req/min per IP.
 */
@Injectable()
export class WebhookRateLimitGuard extends RateLimitGuard {
  constructor() {
    super(60_000, 100);
  }
}

/**
 * Strict rate limiter for admin endpoints: 30 req/min per IP.
 */
@Injectable()
export class AdminRateLimitGuard extends RateLimitGuard {
  constructor() {
    super(60_000, 30);
  }
}
