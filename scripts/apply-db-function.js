/**
 * Script to apply the select_and_update_random_prize database function to Supabase
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL or service role key not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyDbFunction() {
  try {
    console.log('Reading SQL function file...');
    const sqlFilePath = path.join(__dirname, '..', 'db', 'select_and_update_random_prize.sql');
    const sqlQuery = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('Applying SQL function to database...');
    
    // Execute the SQL directly using Supabase's REST API
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlQuery });
    
    if (error) {
      console.error('Error applying SQL function:', error);
      
      // Fallback method if exec_sql RPC is not available
      console.log('Trying alternative method to apply SQL function...');
      
      // Direct PostgreSQL query using Supabase's pg_* functions
      const { error: pgError } = await supabase.rpc('pg_execute', { query: sqlQuery });
      
      if (pgError) {
        console.error('Error with fallback method:', pgError);
        console.log('\nIMPORTANT: You may need to apply this SQL function manually in the Supabase SQL editor.');
        console.log('The SQL function is available in: db/select_and_update_random_prize.sql');
        process.exit(1);
      }
    }
    
    console.log('SQL function applied successfully!');
    console.log('Function "select_and_update_random_prize" is now available for use.');
  } catch (err) {
    console.error('Unexpected error:', err);
    console.log('\nIMPORTANT: You may need to apply this SQL function manually in the Supabase SQL editor.');
    console.log('The SQL function is available in: db/select_and_update_random_prize.sql');
    process.exit(1);
  }
}

// Run the function
applyDbFunction();
