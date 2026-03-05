import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from './supabase.service';

/**
 * DatabaseService — Canonical DB abstraction layer (CANONICAL §1.9 GCP-ARCH-0001).
 *
 * Supports two modes controlled by env `DB_MODE`:
 *   - "supabase" (default): delegates to SupabaseService (current behavior)
 *   - "pg": uses node-postgres Pool for direct Cloud SQL / PostgreSQL access
 *
 * All new code SHOULD inject DatabaseService instead of SupabaseService directly.
 * Existing services continue to work via SupabaseService until migrated.
 */
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private mode: 'supabase' | 'pg';
  private pgPool: any = null; // pg.Pool — dynamically imported when mode=pg

  constructor(
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService,
  ) {
    this.mode = (this.configService.get<string>('DB_MODE') || 'supabase') as 'supabase' | 'pg';
  }

  async onModuleInit() {
    if (this.mode === 'pg') {
      try {
        const { Pool } = await import('pg');
        this.pgPool = new Pool({
          host: this.configService.get<string>('PG_HOST', 'localhost'),
          port: this.configService.get<number>('PG_PORT', 5432),
          database: this.configService.get<string>('PG_DATABASE', 'rideshare'),
          user: this.configService.get<string>('PG_USER', 'postgres'),
          password: this.configService.get<string>('PG_PASSWORD', ''),
          max: this.configService.get<number>('PG_POOL_MAX', 20),
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
          ssl: this.configService.get<string>('PG_SSL') === 'true'
            ? { rejectUnauthorized: false }
            : undefined,
        });
        this.logger.log('PostgreSQL Pool initialized (DB_MODE=pg)');
      } catch (err: any) {
        this.logger.error(`Failed to initialize pg Pool: ${err.message}. Falling back to supabase.`);
        this.mode = 'supabase';
      }
    } else {
      this.logger.log('Using Supabase client (DB_MODE=supabase)');
    }
  }

  async onModuleDestroy() {
    if (this.pgPool) {
      await this.pgPool.end();
      this.logger.log('PostgreSQL Pool closed');
    }
  }

  getMode(): 'supabase' | 'pg' {
    return this.mode;
  }

  /**
   * Execute a raw SQL query (pg mode) or RPC call (supabase mode).
   * For pg mode: standard parameterized query.
   * For supabase mode: delegates to supabase.rpc().
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (this.mode === 'pg' && this.pgPool) {
      const result = await this.pgPool.query(sql, params);
      return result.rows as T[];
    }
    // Supabase mode: raw SQL not directly supported via REST.
    // Use this for pg mode; for supabase, use the table/rpc methods below.
    throw new Error('Raw SQL queries are only supported in pg mode. Use table() or rpc() for supabase mode.');
  }

  /**
   * Execute an RPC (stored function) call.
   */
  async rpc<T = any>(functionName: string, args: Record<string, any> = {}): Promise<T> {
    if (this.mode === 'pg' && this.pgPool) {
      const argKeys = Object.keys(args);
      const placeholders = argKeys.map((_, i) => `$${i + 1}`).join(', ');
      const sql = argKeys.length > 0
        ? `SELECT * FROM ${functionName}(${placeholders})`
        : `SELECT * FROM ${functionName}()`;
      const result = await this.pgPool.query(sql, argKeys.map(k => args[k]));
      return result.rows as T;
    }

    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase.rpc(functionName, args);
    if (error) throw error;
    return data as T;
  }

  /**
   * Get a table query builder (supabase-style fluent API).
   * In pg mode, returns a lightweight query builder that builds SQL.
   * In supabase mode, returns the supabase table builder directly.
   */
  from(table: string) {
    if (this.mode === 'pg' && this.pgPool) {
      return new PgTableBuilder(this.pgPool, table);
    }
    return this.supabaseService.getClient().from(table);
  }

  /**
   * Execute within a transaction (pg mode only).
   * Supabase mode: executes sequentially (no true transaction via REST).
   */
  async transaction<T>(fn: (client: any) => Promise<T>): Promise<T> {
    if (this.mode === 'pg' && this.pgPool) {
      const client = await this.pgPool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }
    // Supabase mode: no REST transaction support, just run the function
    return fn(this.supabaseService.getClient());
  }

  /**
   * Convenience: get the raw supabase client (for gradual migration).
   * @deprecated Use from(), rpc(), or query() instead.
   */
  getSupabaseClient() {
    return this.supabaseService.getClient();
  }
}

/**
 * Lightweight query builder for pg mode that mimics supabase's fluent API.
 * Supports select, insert, update, delete with basic filtering.
 */
class PgTableBuilder {
  private pool: any;
  private table: string;
  private operation: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private selectColumns = '*';
  private conditions: { column: string; op: string; value: any }[] = [];
  private insertData: Record<string, any> | Record<string, any>[] | null = null;
  private updateData: Record<string, any> | null = null;
  private orderByClause: string | null = null;
  private limitCount: number | null = null;
  private singleResult = false;
  private countMode: 'exact' | null = null;
  private headMode = false;

  constructor(pool: any, table: string) {
    this.pool = pool;
    this.table = table;
  }

  select(columns = '*', options?: { count?: 'exact'; head?: boolean }) {
    this.operation = 'select';
    this.selectColumns = columns;
    if (options?.count) this.countMode = options.count;
    if (options?.head) this.headMode = options.head;
    return this;
  }

  insert(data: Record<string, any> | Record<string, any>[]) {
    this.operation = 'insert';
    this.insertData = data;
    return this;
  }

  update(data: Record<string, any>) {
    this.operation = 'update';
    this.updateData = data;
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  eq(column: string, value: any) {
    this.conditions.push({ column, op: '=', value });
    return this;
  }

  neq(column: string, value: any) {
    this.conditions.push({ column, op: '!=', value });
    return this;
  }

  gt(column: string, value: any) {
    this.conditions.push({ column, op: '>', value });
    return this;
  }

  gte(column: string, value: any) {
    this.conditions.push({ column, op: '>=', value });
    return this;
  }

  lt(column: string, value: any) {
    this.conditions.push({ column, op: '<', value });
    return this;
  }

  lte(column: string, value: any) {
    this.conditions.push({ column, op: '<=', value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    const dir = options?.ascending === false ? 'DESC' : 'ASC';
    this.orderByClause = `ORDER BY ${column} ${dir}`;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.singleResult = true;
    this.limitCount = 1;
    return this;
  }

  maybeSingle() {
    this.singleResult = true;
    this.limitCount = 1;
    return this;
  }

  async then(resolve: (result: { data: any; error: any; count?: number }) => void) {
    try {
      const result = await this.execute();
      resolve(result);
    } catch (error: any) {
      resolve({ data: null, error });
    }
  }

  private async execute(): Promise<{ data: any; error: any; count?: number }> {
    try {
      let sql = '';
      const params: any[] = [];
      let paramIndex = 1;

      const buildWhere = () => {
        if (this.conditions.length === 0) return '';
        const clauses = this.conditions.map(c => {
          params.push(c.value);
          return `${c.column} ${c.op} $${paramIndex++}`;
        });
        return `WHERE ${clauses.join(' AND ')}`;
      };

      switch (this.operation) {
        case 'select': {
          if (this.headMode && this.countMode) {
            sql = `SELECT COUNT(*) as count FROM ${this.table} ${buildWhere()}`;
            const result = await this.pool.query(sql, params);
            return { data: null, error: null, count: parseInt(result.rows[0].count) };
          }
          sql = `SELECT ${this.selectColumns} FROM ${this.table} ${buildWhere()}`;
          if (this.orderByClause) sql += ` ${this.orderByClause}`;
          if (this.limitCount) sql += ` LIMIT ${this.limitCount}`;
          break;
        }
        case 'insert': {
          const rows = Array.isArray(this.insertData) ? this.insertData : [this.insertData!];
          const keys = Object.keys(rows[0]);
          const valueSets = rows.map(row => {
            return `(${keys.map(k => { params.push(row[k]); return `$${paramIndex++}`; }).join(', ')})`;
          });
          sql = `INSERT INTO ${this.table} (${keys.join(', ')}) VALUES ${valueSets.join(', ')} RETURNING *`;
          break;
        }
        case 'update': {
          const sets = Object.keys(this.updateData!).map(k => {
            params.push(this.updateData![k]);
            return `${k} = $${paramIndex++}`;
          });
          sql = `UPDATE ${this.table} SET ${sets.join(', ')} ${buildWhere()} RETURNING *`;
          break;
        }
        case 'delete': {
          sql = `DELETE FROM ${this.table} ${buildWhere()} RETURNING *`;
          break;
        }
      }

      const result = await this.pool.query(sql, params);
      const data = this.singleResult ? (result.rows[0] || null) : result.rows;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  }
}
