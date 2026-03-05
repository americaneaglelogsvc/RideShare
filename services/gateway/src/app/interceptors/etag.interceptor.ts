import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { createHash } from 'crypto';
import { Request, Response } from 'express';

/**
 * ETagInterceptor — CANONICAL §7.5 "Policy Center ETag caching"
 *
 * For GET endpoints: generates ETag from response body hash,
 * checks If-None-Match header, returns 304 Not Modified if match.
 * Wire on policy/config endpoints for efficient caching.
 */
@Injectable()
export class ETagInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpCtx = context.switchToHttp();
    const request = httpCtx.getRequest<Request>();
    const response = httpCtx.getResponse<Response>();

    if (request.method !== 'GET') {
      return next.handle();
    }

    return next.handle().pipe(
      map(data => {
        const body = JSON.stringify(data);
        const hash = createHash('md5').update(body).digest('hex');
        const etag = `"${hash}"`;

        response.setHeader('ETag', etag);
        response.setHeader('Cache-Control', 'no-cache');

        const ifNoneMatch = request.headers['if-none-match'];
        if (ifNoneMatch === etag) {
          response.status(304);
          return undefined;
        }

        return data;
      }),
    );
  }
}
