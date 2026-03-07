import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SupabaseService {
  private supabase?: SupabaseClient;
  private connectionPool: SupabaseClient[] = [];
  private poolSize = 5;
  private currentPoolIndex = 0;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('VITE_SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      // For Cloud Run smoke tests and early scaffolding, don't crash the whole service.
      // Any endpoint that requires Supabase will fail when invoked via getClient().
      console.warn('Supabase configuration is missing. Supabase-backed operations will be unavailable.');
      return;
    }

    // Initialize connection pool
    for (let i = 0; i < this.poolSize; i++) {
      this.connectionPool.push(createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }));
    }

    this.supabase = this.connectionPool[0];
  }

  getClient(): SupabaseClient {
    if (!this.supabase) {
      throw new Error('Supabase client not initialized. Missing VITE_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY.');
    }
    return this.supabase;
  }

  // Helper method for authenticated operations
  async getAuthenticatedClient(token: string): Promise<SupabaseClient> {
    const supabaseUrl = this.configService.get<string>('VITE_SUPABASE_URL');
    const anonKey = this.configService.get<string>('VITE_SUPABASE_ANON_KEY');
    if (!supabaseUrl || !anonKey) {
      throw new Error('Supabase auth client not initialized. Missing VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY.');
    }

    const client = createClient(
      supabaseUrl,
      anonKey
    );

    await client.auth.setSession({
      access_token: token,
      refresh_token: '',
    });

    return client;
  }
}