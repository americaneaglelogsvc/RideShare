import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCode, StandardErrorResponse } from '../common/error-codes';

/**
 * StandardErrorFilter — CANONICAL req_id API-ERR-0001
 * Catches all exceptions and returns a uniform error envelope:
 *   { code, message, details, correlationId, statusCode, timestamp }
 */
@Catch()
export class StandardErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(StandardErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: ErrorCode = ErrorCode.INTERNAL_ERROR;
    let message = 'An unexpected error occurred';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as any;
        message = resp.message || exception.message;
        details = resp.details || resp.error;
        if (resp.code && Object.values(ErrorCode).includes(resp.code)) {
          code = resp.code;
        }
      }

      code = this.mapStatusToCode(statusCode, code);
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(`Unhandled error: ${exception.message}`, exception.stack);
    }

    const correlationId = (request as any).correlationId || request.headers['x-request-id'] || '';

    const errorResponse: StandardErrorResponse = {
      code,
      message: Array.isArray(message) ? message.join('; ') : message,
      details,
      correlationId: correlationId as string,
      statusCode,
      timestamp: new Date().toISOString(),
    };

    response.status(statusCode).json(errorResponse);
  }

  private mapStatusToCode(status: number, existingCode: ErrorCode): ErrorCode {
    if (existingCode !== ErrorCode.INTERNAL_ERROR) return existingCode;

    switch (status) {
      case 400: return ErrorCode.VALIDATION_ERROR;
      case 401: return ErrorCode.UNAUTHORIZED;
      case 403: return ErrorCode.FORBIDDEN;
      case 404: return ErrorCode.NOT_FOUND;
      case 409: return ErrorCode.CONFLICT;
      case 429: return ErrorCode.RATE_LIMITED;
      default: return ErrorCode.INTERNAL_ERROR;
    }
  }
}
