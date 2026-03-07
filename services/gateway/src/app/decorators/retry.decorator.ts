import { Injectable, Logger } from '@nestjs/common';

export interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: boolean;
}

@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);

  async executeWithRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {},
  ): Promise<T> {
    const {
      maxAttempts = 3,
      delay = 100,
      backoff = true,
    } = options;

    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxAttempts) {
          this.logger.error(`Operation failed after ${maxAttempts} attempts: ${lastError.message}`);
          throw lastError;
        }

        const waitTime = backoff ? delay * Math.pow(2, attempt - 1) : delay;
        this.logger.warn(`Attempt ${attempt} failed, retrying in ${waitTime}ms: ${lastError.message}`);
        
        await this.sleep(waitTime);
      }
    }

    throw lastError!;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export function Retry(options: RetryOptions = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const retryService = new RetryService();

    descriptor.value = async function (...args: any[]) {
      return retryService.executeWithRetry(() => originalMethod.apply(this, args), options);
    };

    return descriptor;
  };
}
