import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * CorrelationMiddleware — CANONICAL §11 "Centralized logs with correlation identifiers."
 *
 * Generates a UUID per inbound request, sets it as:
 *   - `x-request-id` response header
 *   - `req.correlationId` on the request object (accessible by services)
 *
 * If the caller provides an `x-request-id` header, it is reused (propagation).
 */

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = (req.headers['x-request-id'] as string) || uuidv4();
    req.correlationId = correlationId;

    res.setHeader('x-request-id', correlationId);

    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      this.logger.log(
        `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms [${correlationId}]`,
      );
    });

    next();
  }
}
