/**
 * @req API-IDEM-0001 — Idempotency keys on all writes
 */
import { IdempotencyGuard } from './idempotency.guard';

describe('IdempotencyGuard', () => {
  let guard: IdempotencyGuard;
  let mockFrom: any;

  beforeEach(() => {
    mockFrom = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(mockFrom),
      }),
    };

    guard = new IdempotencyGuard(mockSupabaseService as any);
  });

  const makeContext = (method: string, headers: Record<string, string>, body?: any) => {
    const mockRequest = { 
      method, 
      headers, 
      body: body ?? {}, 
      url: '/api/v1/test', // Fix for the 'endpoint' calculation
      route: { path: '/api/v1/test' }
    };
    const mockResponse = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as any;
  };

  it('passes through GET requests without idempotency check', async () => {
    const ctx = makeContext('GET', {});
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('allows new idempotency key and stores hash in DB', async () => {
    // single() throws when no rows found in some Postgrest versions, 
    // but the guard handles the error.
    mockFrom.single.mockResolvedValue({ data: null, error: { message: 'not found' } });
    mockFrom.insert.mockReturnThis();
    
    // For the insert call's final then/await
    mockFrom.then = jest.fn().mockResolvedValue({ data: { id: 'key-1' }, error: null });

    const ctx = makeContext('POST', { 'x-idempotency-key': 'unique-key-abc' });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('returns cached response and returns false for duplicate key', async () => {
    mockFrom.single.mockResolvedValue({
      data: {
        id: 'key-1',
        response_status: 200,
        response_body: JSON.stringify({ success: true }),
        expires_at: new Date(Date.now() + 10000).toISOString(),
      },
      error: null,
    });

    const ctx = makeContext('POST', { 'x-idempotency-key': 'duplicate-key' });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(false); 
  });
});
