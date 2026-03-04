import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let mockSupabaseService: any;

  beforeEach(() => {
    reflector = new Reflector();
    mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
      }),
    };
    guard = new RolesGuard(reflector, mockSupabaseService);
  });

  const createMockContext = (user: any, roles?: string[]): ExecutionContext => {
    const mockRequest = {
      user,
      headers: { 'x-tenant-id': 'tenant-123' },
      params: {},
    };

    const ctx = {
      switchToHttp: () => ({ getRequest: () => mockRequest }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;

    if (roles) {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles);
    } else {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    }

    return ctx;
  };

  it('should allow access when no roles are required', async () => {
    const ctx = createMockContext({ id: 'user-1' });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('should throw ForbiddenException when no user on request', async () => {
    const ctx = createMockContext(null, ['PLATFORM_SUPER_ADMIN']);
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should allow access when user has required role', async () => {
    const result = { data: [{ role: 'PLATFORM_SUPER_ADMIN' }], error: null };
    const chainable = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      then: jest.fn((resolve: any) => resolve(result)),
    };
    mockSupabaseService.getClient.mockReturnValue({
      from: jest.fn().mockReturnValue(chainable),
    });

    const ctx = createMockContext({ id: 'user-1' }, ['PLATFORM_SUPER_ADMIN']);
    const canAccess = await guard.canActivate(ctx);
    expect(canAccess).toBe(true);
  });

  it('should deny access when user lacks required role', async () => {
    const result = { data: [{ role: 'RIDER' }], error: null };
    const chainable = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      then: jest.fn((resolve: any) => resolve(result)),
    };
    mockSupabaseService.getClient.mockReturnValue({
      from: jest.fn().mockReturnValue(chainable),
    });

    const ctx = createMockContext({ id: 'user-1' }, ['PLATFORM_SUPER_ADMIN']);
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should deny access when DB returns error', async () => {
    const result = { data: null, error: { message: 'DB error' } };
    const chainable = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      then: jest.fn((resolve: any) => resolve(result)),
    };
    mockSupabaseService.getClient.mockReturnValue({
      from: jest.fn().mockReturnValue(chainable),
    });

    const ctx = createMockContext({ id: 'user-1' }, ['PLATFORM_SUPER_ADMIN']);
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });
});
