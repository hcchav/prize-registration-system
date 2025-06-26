"use client"

import { useState, useEffect } from 'react';
import Wheel from '@/components/Wheel';
import { Button } from "@/components/ui/button";
import { type Prize } from "@/constants/prizes";

export default function WheelTest() {
  const [testCount, setTestCount] = useState(0);
  const [testResults, setTestResults] = useState<Array<{
    timestamp: string;
    success: boolean;
    prize?: string;
    error?: string;
  }>>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [autoTest, setAutoTest] = useState(false);
  const [testDelay, setTestDelay] = useState(3000); // 3 seconds default
  const [mockAttendeeId, setMockAttendeeId] = useState('');

  // Create a mock attendee ID on component mount
  useEffect(() => {
    // Generate a random ID for testing
    const randomId = Math.floor(Math.random() * 1000000);
    setMockAttendeeId(randomId.toString());
    
    // Store it in localStorage to be used by the wheel component
    localStorage.setItem('attendeeId', JSON.stringify(randomId));
  }, []);

  // Handle spin start
  const handleSpinStart = () => {
    console.log('Spin started');
    const now = new Date();
    setTestResults(prev => [
      ...prev,
      {
        timestamp: now.toISOString(),
        success: false,
        prize: 'Spinning...'
      }
    ]);
  };

  // Handle spin complete
  const handleSpinComplete = (prize: Prize | null) => {
    console.log('Spin completed', prize);
    setTestCount(prev => prev + 1);
    
    // Update the last result
    setTestResults(prev => {
      const newResults = [...prev];
      if (newResults.length > 0) {
        const lastResult = newResults[newResults.length - 1];
        newResults[newResults.length - 1] = {
          ...lastResult,
          success: true,
          prize: prize?.name || 'No prize'
        };
      }
      return newResults;
    });

    // If auto test is enabled, trigger the next test after delay
    if (autoTest) {
      setTimeout(() => {
        // Reset the wheel by forcing a remount
        setIsRunning(false);
        setTimeout(() => {
          setIsRunning(true);
        }, 100);
      }, testDelay);
    }
  };

  // Handle error
  const handleError = (message: string) => {
    console.error('Spin error:', message);
    
    // Update the last result with error
    setTestResults(prev => {
      const newResults = [...prev];
      if (newResults.length > 0) {
        const lastResult = newResults[newResults.length - 1];
        newResults[newResults.length - 1] = {
          ...lastResult,
          success: false,
          error: message
        };
      }
      return newResults;
    });

    // If auto test is enabled, trigger the next test after delay
    if (autoTest) {
      setTimeout(() => {
        // Reset the wheel by forcing a remount
        setIsRunning(false);
        setTimeout(() => {
          setIsRunning(true);
        }, 100);
      }, testDelay);
    }
  };

  // Toggle auto test
  const toggleAutoTest = () => {
    const newState = !autoTest;
    setAutoTest(newState);
    
    // If turning on auto test, start the first test
    if (newState && !isRunning) {
      setIsRunning(true);
    }
  };

  // Clear test results
  const clearResults = () => {
    setTestResults([]);
    setTestCount(0);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Prize Wheel Test Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              Mock Attendee ID: <span className="font-mono">{mockAttendeeId}</span>
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Tests Run: <span className="font-bold">{testCount}</span>
            </p>
            
            <div className="flex flex-col space-y-4">
              <Button 
                onClick={toggleAutoTest}
                className={`${autoTest ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
              >
                {autoTest ? 'Stop Auto Testing' : 'Start Auto Testing'}
              </Button>
              
              {autoTest && (
                <div className="flex items-center space-x-2">
                  <label className="text-sm">Test Delay (ms):</label>
                  <input 
                    type="number" 
                    value={testDelay}
                    onChange={(e) => setTestDelay(Number(e.target.value))}
                    className="border rounded px-2 py-1 w-24"
                    min="1000"
                    max="10000"
                    step="500"
                  />
                </div>
              )}
              
              <Button 
                onClick={() => {
                  setIsRunning(false);
                  setTimeout(() => setIsRunning(true), 100);
                }}
                variant="outline"
              >
                Reset Wheel
              </Button>
              
              <Button 
                onClick={clearResults}
                variant="outline"
                className="border-red-300 text-red-500 hover:bg-red-50"
              >
                Clear Results
              </Button>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Prize Wheel</h2>
          {isRunning ? (
            <Wheel
              onSpinStart={handleSpinStart}
              onSpinComplete={handleSpinComplete}
              onError={handleError}
              testMode={true}
            />
          ) : (
            <div className="flex justify-center items-center h-64 bg-gray-100 rounded-lg">
              <Button onClick={() => setIsRunning(true)}>
                Load Wheel
              </Button>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Test Results</h2>
        
        {testResults.length === 0 ? (
          <p className="text-gray-500 italic">No test results yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Time</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Prize/Error</th>
                </tr>
              </thead>
              <tbody>
                {testResults.map((result, index) => {
                  const time = new Date(result.timestamp);
                  const formattedTime = `${time.toLocaleTimeString()}.${time.getMilliseconds().toString().padStart(3, '0')}`;
                  
                  return (
                    <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="px-4 py-2">{testResults.length - index}</td>
                      <td className="px-4 py-2 font-mono text-sm">{formattedTime}</td>
                      <td className="px-4 py-2">
                        {result.success ? (
                          <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Success
                          </span>
                        ) : result.error ? (
                          <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            Error
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {result.error || result.prize || 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        <div className="mt-4">
          <h3 className="font-semibold mb-2">Console Output</h3>
          <div className="bg-gray-900 text-gray-100 p-4 rounded font-mono text-sm h-48 overflow-y-auto">
            <p className="text-gray-400">Open your browser's developer console (F12) to view detailed logs</p>
          </div>
        </div>
      </div>
    </div>
  );
}
