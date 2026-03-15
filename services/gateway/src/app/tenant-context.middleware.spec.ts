/**
 * @req TEN-BASE-0001 — Tenant context isolation, kill-switch enforcement
 */
import { TenantContextMiddleware } from './tenant-context.middleware';

describe('TenantContextMiddleware', () => {
  let middleware: TenantContextMiddleware;
  let mockSupabaseService: any;
  let next: jest.Mock;

  beforeEach(() => {
    mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn(),
        }),
      }),
    };
    next = jest.fn();
    middleware = new TenantContextMiddleware(mockSupabaseService);
  });

  const makeReqRes = (overrides: Partial<any> = {}) => {
    const req: any = {
      path: '/api/v1/trips',
      headers: {},
      header: jest.fn().mockImplementation((name: string) => req.headers[name.toLowerCase()]),
      hostname: 'localhost',
      tenantId: undefined,
      ...overrides,
    };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    return { req, res };
  };

  it('calls next() for health check endpoint without tenant check', async () => {
    const { req, res } = makeReqRes({ path: '/health' });
    await middleware.use(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('throws BadRequestException when no tenant identifier provided', async () => {
    const { req, res } = makeReqRes({ path: '/dashboard', headers: {} });
    await expect(middleware.use(req, res, next)).rejects.toThrow();
  });

  it('sets req.tenantId from x-tenant-id header', async () => {
    const fromMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 't1', is_suspended: false }, error: null }),
    };
    mockSupabaseService.getClient.mockReturnValue({ from: jest.fn().mockReturnValue(fromMock) });

    const { req, res } = makeReqRes({ headers: { 'x-tenant-id': 't1' } });
    await middleware.use(req, res, next);
    expect(req.tenantId).toBe('t1');
    expect(next).toHaveBeenCalled();
  });
});
