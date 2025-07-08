// Simple script to test BetterStack logging
const https = require('https');

// Log data to send
const logData = {
  level: 'info',
  message: 'Test log from direct API call',
  timestamp: new Date().toISOString(),
  service: 'prize-registration',
  environment: 'test',
  metadata: {
    test: true,
    source: 'test-script'
  }
};

// Convert data to JSON string
const data = JSON.stringify(logData);

// Set up request options
const options = {
  hostname: 's1373787.eu-nbg-2.betterstackdata.com',
  port: 443,
  path: '/',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'Authorization': 'Bearer x6r5hPctDgpHHSpE7YihaDfr'
  }
};

// Create and send the request
const req = https.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  
  res.on('data', (chunk) => {
    console.log(`RESPONSE BODY: ${chunk}`);
  });
  
  res.on('end', () => {
    console.log('No more data in response.');
    if (res.statusCode === 202) {
      console.log('✅ Log successfully sent to BetterStack!');
    } else {
      console.log('❌ Failed to send log to BetterStack.');
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

// Write data to request body
req.write(data);
req.end();

console.log('Sending test log to BetterStack...');
