import { JwtAuthGuard } from './jwt-auth.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let mockSupabaseService: any;
  let mockReflector: any;

  beforeEach(() => {
    mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        auth: {
          getUser: jest.fn()
        }
      }),
    };
    mockReflector = {
      getAllAndOverride: jest.fn()
    };
    guard = new JwtAuthGuard(mockSupabaseService, mockReflector);
  });

  it('allows public routes', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn()
    } as any;

    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
  });

  it('throws UnauthorizedException if no auth header', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ headers: {} })
      })
    } as any;

    await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
  });

  it('validates token via Supabase', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const mockUser = { id: 'u1', email: 'u1@uwd.com', role: 'rider' };
    mockSupabaseService.getClient().auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    const mockRequest: any = { headers: { authorization: 'Bearer valid-token' } };
    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest)
      })
    } as any;

    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
    expect(mockRequest.user.id).toBe('u1');
  });
});
