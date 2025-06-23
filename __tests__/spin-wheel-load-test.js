/**
 * Load test for the assign-and-spin endpoint
 * 
 * This test simulates 50 concurrent requests to the assign-and-spin endpoint
 * to verify that the prize assignment system correctly handles concurrent requests
 * and assigns prizes without conflicts.
 */

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuration
const NUM_REQUESTS = 50;
const API_URL = 'http://localhost:3000/api/assign-and-spin';

// Initialize Supabase client for test attendee creation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to create test attendees
async function createTestAttendees(count) {
  console.log(`Creating ${count} test attendees...`);
  const attendees = [];

  for (let i = 0; i < count; i++) {
    const uniqueId = Math.floor(Math.random() * 1000000);
    const email = `test-${uniqueId}@example.com`;
    const phone = `+1555${uniqueId.toString().padStart(7, '0')}`;
    
    // Create attendee directly in the database
    const { data, error } = await supabase
      .from('attendees')
      .insert([{
        first_name: 'Test',
        last_name: `User ${i+1}`,
        email: email,
        phone: phone,
        company: 'Test Company',
        verified: true, // Mark as verified so we can spin
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select();
    
    if (error) {
      console.error(`Error creating test attendee ${i+1}:`, error);
      continue;
    }
    
    if (data && data.length > 0) {
      attendees.push(data[0]);
      console.log(`Created attendee ${i+1}: ${data[0].id} (${email})`);
    }
  }
  
  return attendees;
}

// Function to spin the wheel for an attendee
async function spinWheel(attendeeId) {
  try {
    console.log(`Sending spin request for attendee ${attendeeId}...`);
    
    const response = await axios.post(API_URL, {
      attendeeId,
      eventId: 1
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
      timeout: 10000 // 10 second timeout
    });
    
    console.log(`Spin successful for attendee ${attendeeId}:`, response.data?.name || 'Unknown prize');
    
    return {
      success: true,
      attendeeId,
      prize: response.data
    };
  } catch (error) {
    let errorDetail = 'Unknown error';
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      errorDetail = `Server error ${error.response.status}: ${JSON.stringify(error.response.data)}`;
      console.error(`Error spinning wheel for attendee ${attendeeId}:`, errorDetail);
    } else if (error.request) {
      // The request was made but no response was received
      errorDetail = 'No response received from server (timeout or network issue)';
      console.error(`Error spinning wheel for attendee ${attendeeId}:`, errorDetail);
    } else {
      // Something happened in setting up the request that triggered an Error
      errorDetail = `Request setup error: ${error.message}`;
      console.error(`Error spinning wheel for attendee ${attendeeId}:`, errorDetail);
    }
    
    return { 
      success: false, 
      attendeeId,
      error: errorDetail
    };
  }
}

// Function to clean up test data after the test
async function cleanupTestData(attendeeIds) {
  if (!attendeeIds || attendeeIds.length === 0) return;
  
  console.log(`Cleaning up ${attendeeIds.length} test attendees...`);
  
  // Delete test attendees
  const { error } = await supabase
    .from('attendees')
    .delete()
    .in('id', attendeeIds);
    
  if (error) {
    console.error('Error cleaning up test data:', error);
  } else {
    console.log('Test data cleanup successful');
  }
}

// Main test function
async function runSpinWheelLoadTest() {
  console.log(`Starting spin wheel load test with ${NUM_REQUESTS} concurrent requests...`);
  
  try {
    // Create test attendees
    const testAttendees = await createTestAttendees(NUM_REQUESTS);
    if (testAttendees.length === 0) {
      throw new Error('Failed to create any test attendees');
    }
    
    console.log(`Created ${testAttendees.length} test attendees`);
    
    // Create an array of promises for concurrent requests
    const attendeeIds = testAttendees.map(a => a.id);
    const requests = attendeeIds.map(id => spinWheel(id));
    
    // Execute all requests concurrently
    console.time('Load test duration');
    const results = await Promise.all(requests);
    console.timeEnd('Load test duration');
    
    // Analyze results
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`Received ${results.length} responses`);
    console.log(`Successful spins: ${successful.length}`);
    console.log(`Failed spins: ${failed.length}`);
    
    if (failed.length > 0) {
      console.log('Common failure reasons:');
      const errorCounts = {};
      failed.forEach(result => {
        const error = result.error || 'Unknown error';
        errorCounts[error] = (errorCounts[error] || 0) + 1;
      });
      
      Object.entries(errorCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([error, count]) => {
          console.log(`- ${error}: ${count} occurrences`);
        });
    }
    
    // Check prize distribution
    if (successful.length > 0) {
      const prizeCounts = {};
      successful.forEach(result => {
        const prizeName = result.prize?.name || 'Unknown';
        prizeCounts[prizeName] = (prizeCounts[prizeName] || 0) + 1;
      });
      
      console.log('\nPrize distribution:');
      Object.entries(prizeCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([prize, count]) => {
          const percentage = ((count / successful.length) * 100).toFixed(1);
          console.log(`- ${prize}: ${count} (${percentage}%)`);
        });
    }
    
    // Clean up test data
    await cleanupTestData(attendeeIds);
    
    return {
      total: results.length,
      successful: successful.length,
      failed: failed.length,
      prizeDistribution: successful.reduce((acc, result) => {
        const prizeName = result.prize?.name || 'Unknown';
        acc[prizeName] = (acc[prizeName] || 0) + 1;
        return acc;
      }, {})
    };
  } catch (error) {
    console.error('Load test failed:', error.message);
    return { error: error.message };
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  runSpinWheelLoadTest()
    .then(results => {
      console.log('Spin wheel load test completed:', results);
      process.exit(0);
    })
    .catch(error => {
      console.error('Unhandled error in load test:', error);
      process.exit(1);
    });
}

module.exports = { runSpinWheelLoadTest };
