// supabase.ts
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL and Key must be provided");
}

// Create a single supabase client for interacting with your database
export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  }
});

testSupabaseConnection();

/**
 * Test the Supabase connection and table access
 * @param tableName Optional table name to test (default: 'attendees')
 */
export async function testSupabaseConnection(tableName: keyof Database['public']['Tables'] = 'attendees') {
  try {
    console.log(`Testing Supabase connection to table: ${tableName}`);
    
    const { data, error, status } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      console.error('Supabase query error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return { success: false, error };
    }

    console.log(`Successfully connected to ${tableName}. Found ${data?.length || 0} rows.`);
    return { success: true, data };
  } catch (error) {
    console.error('Error testing Supabase connection:', error);
    return { success: false, error };
  }
}

// Uncomment to test the connection when this module is imported
// testSupabaseConnection().then(console.log).catch(console.error);
