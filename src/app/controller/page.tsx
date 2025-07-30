"use client"

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { io, Socket } from 'socket.io-client';
import clientLogger from '@/lib/client-logger';

export default function ControllerPage() {
  const [claimNumber, setClaimNumber] = useState<string>('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize socket connection
  useEffect(() => {
    // Create socket connection with fallback options
    const socketInstance = io('http://localhost:3000', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000
    });
    
    console.log('Attempting to connect to WebSocket server...');

    // Socket event handlers
    socketInstance.on('connect', () => {
      setIsConnected(true);
      clientLogger.info('Socket connected', { socketId: socketInstance.id });
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
      clientLogger.info('Socket disconnected');
    });

    socketInstance.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setError(`Connection error: ${err.message}`);
      clientLogger.error('Socket connection error', { error: err.message });
    });

    // Save socket instance
    setSocket(socketInstance);

    // Clean up on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Handle claim number input change
  const handleClaimNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setClaimNumber(e.target.value);
  };

  // Handle spin button click
  const handleSpin = async () => {
    if (!claimNumber.trim()) {
      setError('Please enter a claim number');
      return;
    }

    if (!socket || !isConnected) {
      setError('Not connected to server');
      return;
    }

    try {
      setError(null);
      
      // First get the prize from the API
      const prizeData = await handleGetPrize(claimNumber);
      
      // Log detailed prize data for debugging
      console.log('Prize data from API:', prizeData);
      console.log('Prize index:', prizeData.prizeIndex);
      console.log('Prize ID:', prizeData.id);
      console.log('Prize name:', prizeData.name);
      
      // Make sure prizeIndex is a number and not undefined
      if (prizeData.prizeIndex === undefined) {
        // Calculate a fallback prize index if not provided
        const totalPrizes = 8; // Default number of prize segments
        prizeData.prizeIndex = prizeData.id % totalPrizes;
        console.log('Calculated fallback prize index:', prizeData.prizeIndex);
      }
      
      // Then emit spin event with claim number and prize data
      socket.emit('submit-claim', claimNumber);
      socket.emit('spin-wheel', { claimNumber, prizeData });
      
      clientLogger.info('Spin wheel triggered', { claimNumber, prizeData });
    } catch (err) {
      console.error('Error triggering spin:', err);
      setError(err instanceof Error ? err.message : 'Failed to trigger spin');
      clientLogger.error('Error triggering spin', { 
        error: err instanceof Error ? err.message : String(err) 
      });
    }
  };

  // Handle API call to get prize and trigger spin
  const handleGetPrize = async (claimNumber: string) => {
    try {
      // Get attendee ID from localStorage with error handling
      let attendeeId;
      try {
        const attendeeData = localStorage.getItem('attendeeId');
        if (!attendeeData) {
          throw new Error('No attendee data found');
        }
        
        attendeeId = JSON.parse(attendeeData);
        if (!attendeeId) {
          throw new Error('Invalid attendee data');
        }
      } catch (storageErr) {
        console.error('Error retrieving attendee data:', storageErr);
        throw new Error('Unable to retrieve your information. Please refresh the page and try again.');
      }
      
      // Add cache-busting parameter to prevent 304 responses
      const timestamp = new Date().getTime();
      console.log('Calling API with timestamp:', timestamp);
      
      // Call API to assign a prize with timeout and error handling
      let response;
      try {
        // Create an AbortController to handle timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        response = await fetch(`/api/assign-and-spin?t=${timestamp}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          },
          body: JSON.stringify({
            attendeeId,
            eventId: 1,
            claimNumber
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
      } catch (error) {
        console.error('Fetch error:', error);
        const fetchErr = error as Error;
        if (fetchErr.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.');
        }
        throw new Error('Network error. Please check your connection and try again.');
      }
      
      if (!response.ok) {
        let errorData: { code?: string; error?: string } = {};
        try {
          errorData = await response.json() as { code?: string; error?: string };
        } catch (jsonErr) {
          console.error('Error parsing error response:', jsonErr);
        }
        
        // Special handling for no prizes available
        if (response.status === 404 && errorData.code === 'NO_PRIZES_AVAILABLE') {
          console.log('No prizes available');
          throw new Error('No prizes available');
        }
        throw new Error(errorData.error || `Server error (${response.status}). Please try again.`);
      }
      
      let data;
      try {
        data = await response.json();
        console.log('API Response:', data);
        return data;
      } catch (jsonErr) {
        console.error('Error parsing response:', jsonErr);
        throw new Error('Invalid response from server. Please try again.');
      }
    } catch (err) {
      console.error('Error getting prize:', err);
      throw err;
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Prize Wheel Controller</h1>
      
      {/* Connection status */}
      <div className="mb-4">
        <span className={`inline-block w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
        <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* Claim number input */}
      <div className="mb-6">
        <label htmlFor="claimNumber" className="block text-sm font-medium mb-2">
          Claim Number
        </label>
        <input
          type="text"
          id="claimNumber"
          value={claimNumber}
          onChange={handleClaimNumberChange}
          className="w-full p-2 border border-gray-300 rounded"
          placeholder="Enter claim number"
        />
      </div>
      
      {/* Spin button */}
      <Button 
        onClick={handleSpin}
        className="mb-8 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
        disabled={!isConnected}
      >
        Spin Wheel
      </Button>
      
      {/* Instructions */}
      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Instructions</h2>
        <p>1. Enter a valid claim number above</p>
        <p>2. Click the "Spin Wheel" button to trigger the wheel on the display page</p>
        <p>3. View the wheel spin results on the /spinthewheel page</p>
      </div>
    </div>
  );
}
