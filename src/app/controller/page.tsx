"use client"

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { io, Socket } from 'socket.io-client';
import clientLogger from '@/lib/client-logger';
import Image from 'next/image';
import '@/components/controller.css';
import '@/components/modal-styles.css';

export default function ControllerPage() {
  const [claimNumber, setClaimNumber] = useState<string>('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [noPrizeAvailable, setNoPrizeAvailable] = useState(false);
  const [prize, setPrize] = useState<any>(null);

  // Initialize socket connection
  useEffect(() => {
    // Get the current hostname dynamically
    const protocol = window.location.protocol === 'https:' ? 'https://' : 'http://';
    const host = window.location.hostname;
    const port = window.location.port || (protocol === 'https://' ? '443' : '80');
    const socketUrl = `${protocol}${host}:${port}`;
    
    console.log('CONTROLLER: Connecting to socket at:', socketUrl);
    
    // Create socket connection with fallback options
    const socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000
    });
    
    console.log('CONTROLLER: Attempting to connect to WebSocket server...');
    console.log('CONTROLLER: Socket instance created:', socketInstance);

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
    
    // Listen for spin complete event from spinthewheel page
    socketInstance.on('spin-complete', (data) => {
      console.log('CONTROLLER: Spin complete event received:', data);
      clientLogger.info('CONTROLLER: Spin complete event received', { data });
      
      setIsSpinning(false);
      
      if (data && data.prize) {
        console.log('CONTROLLER: Prize received in spin-complete event:', data.prize);
        setPrize(data.prize);
      } else if (data && data.noPrizeAvailable) {
        console.log('CONTROLLER: No prize available notification received');
        setNoPrizeAvailable(true);
      } else {
        console.log('CONTROLLER: Spin complete event received but no prize data');
      }
      
      // Make sure the modal stays visible but changes from "Spinning..." to "Congratulations"
      // We don't need to set showModal again since it's already showing
      console.log('CONTROLLER: Modal state after spin complete - isSpinning:', false);
    });

    // Listen for close-modal events
    socketInstance.on('close-modal', () => {
      console.log('CONTROLLER: Received close-modal event');
      clientLogger.info('Received close-modal event');
      setShowModal(false);
      setIsSpinning(false);
    });

    // Save socket instance
    setSocket(socketInstance);

    // Clean up on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Handle digit button click
  const handleDigitClick = (digit: string) => {
    setClaimNumber(prev => prev + digit);
  };

  // Handle delete button click
  const handleDeleteClick = () => {
    setClaimNumber(prev => prev.slice(0, -1));
  };

  // Handle clear button click
  const handleClearClick = () => {
    setClaimNumber('');
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
      
      // Show spinning modal
      setPrize(prizeData);
      setIsSpinning(true);
      setShowModal(true);
      
    } catch (err) {
      console.error('Error triggering spin:', err);
      setError(err instanceof Error ? err.message : 'Failed to trigger spin');
      clientLogger.error('Error triggering spin', { 
        error: err instanceof Error ? err.message : String(err) 
      });
      
      // Check if the error is "No prizes available"
      if (err instanceof Error && err.message === 'No prizes available') {
        setNoPrizeAvailable(true);
        setShowModal(true);
      }
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
    <>
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
      
      <div className="controller-container" >
 
      
      {/* Connection status */}
      <div className="">
        <span className={`status-indicator ${isConnected ? '' : 'status-disconnected'}`}></span>
        <span className="status-text">{isConnected ? '' : 'Disconnected'}</span>
      </div>
      
      {/* Error message */}
      {error && !showModal && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {/* Claim number input */}
      <div className="input-group">
      
        <div className="claim-display">
          {claimNumber || 'Enter claim number'}
        </div>
        <div className="pin-pad-container">
          <div className="pin-pad">
            <div className="pin-pad-numbers">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((digit) => (
                <button 
                  key={digit} 
                  className="pin-button"
                  onClick={() => handleDigitClick(digit.toString())}
                >
                  {digit}
                </button>
              ))}
            </div>
            <div className="pin-pad-actions">
              <button 
                className="pin-button pin-button-delete"
                onClick={handleDeleteClick}
              >
                Delete
              </button>
              <button 
                className="pin-button pin-button-clear"
                onClick={handleClearClick}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Spin button */}
      <Button 
        onClick={handleSpin}
        className="spin-button"
        disabled={!isConnected || isSpinning}
      >
        {isSpinning ? 'Spinning...' : 'SPIN'}
      </Button>

      {/* Modal */}
      {showModal && (
        <div className="congrats-modal-overlay">
          <div className="congrats-modal-backdrop"></div>
          <div className="congrats-modal-content">
            {noPrizeAvailable ? (
              <>
                <div className="congrats-modal-no-prize-title">
                  All Prizes Claimed. Thank you for participating!
                </div>
              </>
            ) : isSpinning ? (
              <>
                <div className="congrats-modal-title">
                  SPINNING...
                </div>
                <div className="mb-4">
                  <p className="congrats-modal-text">
                    Please wait while the wheel is spinning!
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="congrats-modal-title">
                  CONGRATULATIONS!
                </div>
                <div className="mb-4">
                  <p className="congrats-modal-text">
                  You have won a:
                  </p>
                  <p className="congrats-modal-prize-name">
                    {prize?.name || 'Your Prize'}
                  </p>                           
                </div>
              </>
            )}
            <button
              className="congrats-modal-button"
              onClick={() => {
                setShowModal(false);
                setIsSpinning(false);
                setClaimNumber(''); // Reset claim number for next spin
                
                // Emit event to close spinthewheel modal as well
                if (socket && socket.connected) {
                  console.log('CONTROLLER: Emitting close-modal event');
                  console.log('CONTROLLER: Socket ID when emitting close-modal:', socket.id);
                  console.log('CONTROLLER: Socket connected status:', socket.connected);
                  clientLogger.info('Emitting close-modal event', { socketId: socket.id });
                  socket.emit('close-modal');
                } else {
                  console.error('CONTROLLER: Cannot emit close-modal - socket not connected');
                  clientLogger.error('Cannot emit close-modal', { socketConnected: socket?.connected });
                }
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
      
      {/* Instructions removed as requested */}
    </div>
    </>
  );
}
