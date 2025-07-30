"use client"

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { io, Socket } from 'socket.io-client';
import clientLogger from '@/lib/client-logger';
import Image from 'next/image';
import '@/components/controller.css';

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
    <div className="controller-container pt-[20vh]">
      <div id="registration-header" className="portrait-header fixed top-0 left-0 right-0 z-50 w-full flex justify-center items-center h-[20vh] bg-white shadow-xl">
        <div className="absolute inset-x-0 bottom-0 h-[4px] bg-gradient-to-r from-transparent via-[#abcae9] to-transparent"></div>
        <div className="portrait-logo-container w-[100%] h-[100%] max-w-[1000px] relative">
          <Image
            src="/Mockup.svg"
            alt="Registration Header"
            fill
            className="portrait-logo object-contain"
            priority
          />
        </div>
      </div>
      <div className="controller-header">
        <h1 className="controller-title">Prize Wheel Controller</h1>
        <p className="controller-subtitle">Control the prize wheel display</p>
      </div>
      
      {/* Connection status */}
      <div className="connection-status">
        <span className={`status-indicator ${isConnected ? 'status-connected' : 'status-disconnected'}`}></span>
        <span className="status-text">{isConnected ? 'Connected' : 'Disconnected'}</span>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {/* Claim number input */}
      <div className="input-group">
        <label htmlFor="claimNumber" className="input-label">
          Claim Number
        </label>
        <input
          type="number"
          id="claimNumber"
          value={claimNumber}
          onChange={handleClaimNumberChange}
          className="claim-input"
          placeholder="Enter claim number"
          min="0"
          inputMode="numeric"
          pattern="[0-9]*"
        />
      </div>
      
      {/* Spin button */}
      <Button 
        onClick={handleSpin}
        className="spin-button"
        disabled={!isConnected}
      >
        Spin Wheel
      </Button>
      
      {/* Instructions removed as requested */}
    </div>
  );
}
