/**
 * Load test for the claim ID generation endpoint
 * 
 * This test simulates 50 concurrent requests to the generate-claim-id endpoint
 * to verify that the database function correctly handles concurrent requests
 * and generates unique claim IDs without conflicts.
 */

const axios = require('axios');

// Configuration
const NUM_REQUESTS = 50;
const API_URL = 'http://localhost:3000/api/generate-claim-id';

// Helper function to create a test attendee
async function createTestAttendee() {
  try {
    // Create a unique email for this test
    const uniqueId = Math.floor(Math.random() * 1000000);
    const email = `test-${uniqueId}@example.com`;
    
    // Create a test attendee via the API
    const response = await axios.post('http://localhost:3000/api/send-otp', {
      firstName: 'Test',
      lastName: 'User',
      email: email,
      phone: `+1555${uniqueId.toString().padStart(7, '0')}`,
      company: 'Test Company',
      method: 'email'
    });
    
    if (response.data && response.data.success) {
      console.log(`Created test attendee with email: ${email}`);
      return { email };
    } else {
      throw new Error('Failed to create test attendee');
    }
  } catch (error) {
    console.error('Error creating test attendee:', error.message);
    throw error;
  }
}

// Function to generate a claim ID for an attendee
async function generateClaimId(attendeeId) {
  try {
    const response = await axios.post(API_URL, {
      attendeeId
    });
    return response.data;
  } catch (error) {
    console.error(`Error generating claim ID for attendee ${attendeeId}:`, error.message);
    return { error: error.message };
  }
}

// Main test function
async function runLoadTest() {
  console.log(`Starting load test with ${NUM_REQUESTS} concurrent requests...`);
  
  try {
    // Create a test attendee first
    const { email } = await createTestAttendee();
    
    // Get the attendee ID
    const attendeeResponse = await axios.get(`http://localhost:3000/api/attendees?email=${email}`);
    if (!attendeeResponse.data || !attendeeResponse.data.attendees || !attendeeResponse.data.attendees.length) {
      throw new Error('Could not find created attendee');
    }
    
    const attendeeId = attendeeResponse.data.attendees[0].id;
    console.log(`Using attendee ID: ${attendeeId} for load test`);
    
    // Create an array of promises for concurrent requests
    const requests = Array(NUM_REQUESTS).fill().map(() => generateClaimId(attendeeId));
    
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
    
    console.log('First few claim IDs:', [...uniqueClaimIds].slice(0, 5));
    
    return {
      total: results.length,
      successful: claimIds.length,
      unique: uniqueClaimIds.size,
      isAllUnique: uniqueClaimIds.size === claimIds.length
    };
  } catch (error) {
    console.error('Load test failed:', error.message);
    return { error: error.message };
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  runLoadTest()
    .then(results => {
      console.log('Load test completed:', results);
      process.exit(results.error || !results.isAllUnique ? 1 : 0);
    })
    .catch(error => {
      console.error('Unhandled error in load test:', error);
      process.exit(1);
    });
}

module.exports = { runLoadTest };
