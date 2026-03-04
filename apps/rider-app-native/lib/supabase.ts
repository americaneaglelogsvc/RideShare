import { createClient } from '@supabase/supabase-js';

// Phase 2 Gateway bindings
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://stub-supabase-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'stub-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        detectSessionInUrl: false,
    },
});
