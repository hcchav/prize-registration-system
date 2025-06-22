/**
 * Direct load test for the claim ID generation database function
 * 
 * This test bypasses the API and directly tests the database function
 * with 50 concurrent requests to verify that it correctly handles concurrency
 * and generates unique claim IDs without conflicts.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuration
const NUM_REQUESTS = 50;

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Function to generate a claim ID directly using the database function
async function generateClaimId() {
  try {
    const { data, error } = await supabase.rpc('get_strict_next_claim_id');
    
    if (error) {
      throw error;
    }
    
    return { claimId: data };
  } catch (error) {
    console.error('Error generating claim ID:', error.message);
    return { error: error.message };
  }
}

// Main test function
async function runDirectLoadTest() {
  console.log(`Starting direct load test with ${NUM_REQUESTS} concurrent requests...`);
  
  try {
    // Create an array of promises for concurrent requests
    const requests = Array(NUM_REQUESTS).fill().map(() => generateClaimId());
    
    // Execute all requests concurrently
    console.time('Load test duration');
    const results = await Promise.all(requests);
    console.timeEnd('Load test duration');
    
    // Analyze results
    const claimIds = results.map(result => result.claimId).filter(Boolean);
    const uniqueClaimIds = new Set(claimIds);
    
    console.log(`Received ${results.length} responses`);
    console.log(`Successful claim ID generations: ${claimIds.length}`);
    console.log(`Unique claim IDs: ${uniqueClaimIds.size}`);
    
    // Check for duplicates
    if (uniqueClaimIds.size !== claimIds.length) {
      console.error('WARNING: Duplicate claim IDs detected!');
      
      // Find duplicates
      const counts = {};
      claimIds.forEach(id => {
        counts[id] = (counts[id] || 0) + 1;
      });
      
      Object.entries(counts)
        .filter(([_, count]) => count > 1)
        .forEach(([id, count]) => {
          console.error(`Claim ID ${id} appears ${count} times`);
        });
    } else {
      console.log('SUCCESS: All claim IDs are unique!');
    }
    
    console.log('Claim IDs:', claimIds.sort((a, b) => a - b));
    
    return {
      total: results.length,
      successful: claimIds.length,
      unique: uniqueClaimIds.size,
      isAllUnique: uniqueClaimIds.size === claimIds.length,
      claimIds: claimIds.sort((a, b) => a - b)
    };
  } catch (error) {
    console.error('Load test failed:', error.message);
    return { error: error.message };
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  runDirectLoadTest()
    .then(results => {
      console.log('Direct load test completed:', results);
      process.exit(results.error || !results.isAllUnique ? 1 : 0);
    })
    .catch(error => {
      console.error('Unhandled error in load test:', error);
      process.exit(1);
    });
}

module.exports = { runDirectLoadTest };
