/**
 * @req CORP-ACCT-010 — Corporate account management
 */
import { CorporateAccountService } from './corporate-account.service';

describe('CorporateAccountService', () => {
  let service: CorporateAccountService;
  let mockFrom: any;

  beforeEach(() => {
    mockFrom = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn(),
    };

    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(mockFrom),
      }),
    };

    service = new CorporateAccountService(mockSupabaseService as any);
  });

  describe('createAccount', () => {
    it('creates a corporate account', async () => {
      const account = { id: 'corp-1', company_name: 'Acme Corp', tenant_id: 't1' };
      mockFrom.single.mockResolvedValue({ data: account, error: null });

      const result = await service.createAccount({
        tenantId: 't1', companyName: 'Acme Corp', email: 'corp@acme.com',
      } as any);
      expect(result.company_name).toBe('Acme Corp');
    });

    it('throws on DB error', async () => {
      mockFrom.single.mockResolvedValue({ data: null, error: { message: 'unique violation' } });
      await expect(service.createAccount({ tenantId: 't1', companyName: 'Dup' } as any)).rejects.toThrow();
    });
  });

  describe('getAccount', () => {
    it('returns account by ID', async () => {
      const account = { id: 'corp-1', company_name: 'Acme Corp' };
      mockFrom.single.mockResolvedValue({ data: account, error: null });
      const result = await service.getAccount('corp-1');
      expect(result.id).toBe('corp-1');
    });
  });

  describe('listAccountsForTenant', () => {
    it('returns all accounts for tenant', async () => {
      const accounts = [{ id: 'corp-1' }, { id: 'corp-2' }];
      mockFrom.order = jest.fn().mockResolvedValue({ data: accounts, error: null });
      const result = await service.listAccountsForTenant('t1');
      expect(result).toHaveLength(2);
    });
  });

  describe('addEmployee', () => {
    it('adds an employee to corporate account', async () => {
      const emp = { id: 'emp-1', account_id: 'corp-1', rider_id: 'rider-1' };
      mockFrom.single.mockResolvedValue({ data: emp, error: null });
      const result = await service.addEmployee({ accountId: 'corp-1', riderId: 'rider-1' } as any);
      expect(result.account_id).toBe('corp-1');
    });
  });

  describe('updateAccount', () => {
    it('updates account fields', async () => {
      const updated = { id: 'corp-1', monthly_budget_cents: 100000 };
      mockFrom.single.mockResolvedValue({ data: updated, error: null });
      const result = await service.updateAccount('corp-1', { monthly_budget_cents: 100000 } as any);
      expect((result as any).monthly_budget_cents).toBe(100000);
    });
  });
});
