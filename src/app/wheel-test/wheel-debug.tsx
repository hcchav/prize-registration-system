"use client"

import { useState, useEffect, useRef } from 'react';
import Wheel from '@/components/Wheel';
import { Button } from "@/components/ui/button";
import { type Prize } from "@/constants/prizes";
import { WheelAnimationMonitor, WheelPerformanceTracker, BrowserPerformanceMonitor, checkBrowserCapabilities } from './debug-utils';

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
  const [debugInfo, setDebugInfo] = useState<any>(null);
  
  // Create instances of debug utilities
  const [animationMonitor] = useState(() => new WheelAnimationMonitor(
    (details) => {
      console.error('WHEEL STUCK DETECTED!', details);
      setTestResults(prev => [
        {
          timestamp: new Date().toLocaleTimeString(),
          success: false,
          error: `WHEEL STUCK! Duration: ${details.duration}ms, Frames: ${details.frameCount}`,
        },
        ...prev
      ]);
      performanceTracker.recordStuckSpin();
    }
  ));
  
  const [performanceTracker] = useState(() => new WheelPerformanceTracker());
  const [browserMonitor] = useState(() => new BrowserPerformanceMonitor());

  // Create a mock attendee ID on component mount
  useEffect(() => {
    // Generate a random ID for testing
    const randomId = Math.floor(Math.random() * 1000000);
    setMockAttendeeId(randomId.toString());
    
    // Store it in localStorage to be used by the wheel component
    localStorage.setItem('attendeeId', JSON.stringify(randomId));
    
    // Initialize debug info
    setDebugInfo({
      capabilities: checkBrowserCapabilities(),
      performance: browserMonitor.getMetrics(),
      wheelMetrics: performanceTracker.getMetrics()
    });
  }, []);

  // Handle spin start
  const handleSpinStart = () => {
    console.log('Spin started');
    const now = new Date();
    
    // Start monitoring the animation
    animationMonitor.startMonitoring();
    performanceTracker.recordSpinAttempt();
    browserMonitor.startMonitoring();
    
    // Update browser capabilities info
    setDebugInfo({
      capabilities: checkBrowserCapabilities(),
      performance: browserMonitor.getMetrics(),
      wheelMetrics: performanceTracker.getMetrics()
    });
    
    setTestResults(prev => [
      {
        timestamp: now.toLocaleTimeString(),
        success: false,
        error: 'Spinning...'
      },
      ...prev
    ]);
    
    setTestCount(prev => prev + 1);
  };

  // Handle spin complete
  const handleSpinComplete = (prize: Prize | null) => {
    console.log('Spin completed', prize);
    const now = new Date();
    
    // Stop monitoring
    animationMonitor.stopMonitoring();
    const spinDuration = browserMonitor.stopMonitoring();
    performanceTracker.recordSpinSuccess(spinDuration);
    
    // Update debug info
    setDebugInfo({
      capabilities: checkBrowserCapabilities(),
      performance: browserMonitor.getMetrics(),
      wheelMetrics: performanceTracker.getMetrics()
    });
    
    setTestResults(prev => {
      const updated = [...prev];
      const lastIndex = updated.findIndex(r => r.error === 'Spinning...');
      if (lastIndex !== -1) {
        updated[lastIndex] = {
          timestamp: now.toLocaleTimeString(),
          success: true,
          prize: prize?.name || 'Unknown'
        };
      }
      return updated;
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

  // Handle spin error
  const handleSpinError = (error: string) => {
    console.error('Spin error:', error);
    const now = new Date();
    
    // Stop monitoring and record failure
    animationMonitor.stopMonitoring();
    browserMonitor.stopMonitoring();
    performanceTracker.recordSpinFailure(error);
    
    // Update debug info
    setDebugInfo({
      capabilities: checkBrowserCapabilities(),
      performance: browserMonitor.getMetrics(),
      wheelMetrics: performanceTracker.getMetrics()
    });
    
    setTestResults(prev => {
      const updated = [...prev];
      const lastIndex = updated.findIndex(r => r.error === 'Spinning...');
      if (lastIndex !== -1) {
        updated[lastIndex] = {
          timestamp: now.toLocaleTimeString(),
          success: false,
          error
        };
      }
      return updated;
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
    
    if (newState) {
      // Start auto testing by forcing a remount
      setIsRunning(false);
      setTimeout(() => {
        setIsRunning(true);
      }, 100);
    }
  };

  // Reset test results
  const handleReset = () => {
    setTestResults([]);
    setTestCount(0);
    performanceTracker.resetMetrics();
    setDebugInfo({
      capabilities: checkBrowserCapabilities(),
      performance: browserMonitor.getMetrics(),
      wheelMetrics: performanceTracker.getMetrics()
    });
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Wheel Animation Test Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Test Controls</h2>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              Mock Attendee ID: <span className="font-mono">{mockAttendeeId}</span>
            </p>
            
            <p className="text-sm text-gray-600 mb-2">
              Tests run: <span className="font-semibold">{testCount}</span>
            </p>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Test Delay (ms):
            </label>
            <input
              type="number"
              value={testDelay}
              onChange={(e) => setTestDelay(parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-md"
              min="500"
              max="10000"
              step="500"
            />
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => {
                setIsRunning(false);
                setTimeout(() => setIsRunning(true), 100);
              }}
              variant="primary"
            >
              Reset Wheel
            </Button>
            
            <Button
              onClick={toggleAutoTest}
              variant={autoTest ? "secondary" : "outline"}
            >
              {autoTest ? "Stop Auto Test" : "Start Auto Test"}
            </Button>
            
            <div className="mt-4 w-full">
              <Button 
                onClick={handleReset}
                variant="outline"
                className="border-red-300 text-red-500 hover:bg-red-50"
              >
                Clear Results
              </Button>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Prize Wheel</h2>
          {isRunning ? (
            <Wheel
              onSpinStart={handleSpinStart}
              onSpinComplete={handleSpinComplete}
              onError={handleSpinError}
              testMode={true}
            />
          ) : (
            <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
              <p className="text-gray-500">Wheel is resetting...</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-bold">Test Results</h2>
        <div className="mt-4 max-h-96 overflow-y-auto">
          {testResults.length === 0 ? (
            <p className="text-gray-500">No test results yet</p>
          ) : (
            <ul className="space-y-2">
              {testResults.map((result, index) => (
                <li 
                  key={index} 
                  className={`p-2 rounded ${result.success ? 'bg-green-100' : 'bg-red-100'}`}
                >
                  <span className="font-mono text-xs">{result.timestamp}</span>
                  <div className="font-semibold">
                    {result.success ? (
                      <>✅ Prize: {result.prize}</>
                    ) : (
                      <>❌ Error: {result.error}</>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-bold">Debug Information</h2>
        
        <div className="mt-4">
          <h3 className="font-semibold">Performance Metrics:</h3>
          <pre className="bg-gray-200 p-2 rounded text-xs overflow-auto mt-2">
            {debugInfo ? JSON.stringify(debugInfo.wheelMetrics, null, 2) : 'No data yet'}
          </pre>
        </div>
        
        <div className="mt-4">
          <h3 className="font-semibold">Browser Performance:</h3>
          <pre className="bg-gray-200 p-2 rounded text-xs overflow-auto mt-2">
            {debugInfo ? JSON.stringify(debugInfo.performance, null, 2) : 'No data yet'}
          </pre>
        </div>
        
        <div className="mt-4">
          <h3 className="font-semibold">Browser Capabilities:</h3>
          <pre className="bg-gray-200 p-2 rounded text-xs overflow-auto mt-2">
            {debugInfo ? JSON.stringify(debugInfo.capabilities, null, 2) : 'No data yet'}
          </pre>
        </div>
      </div>
    </div>
  );
}
