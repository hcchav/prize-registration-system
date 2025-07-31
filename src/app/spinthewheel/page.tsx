"use client"

import { useState, useEffect } from 'react';
import SpinTheWheel from '@/components/SpinTheWheel';
import { io, Socket } from 'socket.io-client';
import clientLogger from '@/lib/client-logger';
import Image from 'next/image';

export default function SpinTheWheelPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimNumber, setClaimNumber] = useState<string>('');
  const [shouldSpin, setShouldSpin] = useState(false);
  const [spinComplete, setSpinComplete] = useState(false);
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);

  // Initialize socket connection
  useEffect(() => {
    // Get the current hostname dynamically
    const protocol = window.location.protocol === 'https:' ? 'https://' : 'http://';
    const host = window.location.hostname;
    const port = window.location.port || (protocol === 'https://' ? '443' : '80');
    const socketUrl = `${protocol}${host}:${port}`;
    
    console.log('Connecting to socket at:', socketUrl);
    
    // Create socket connection with fallback options
    const socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000
    });
    
    console.log('Attempting to connect to WebSocket server...');

    // Socket event handlers
    socketInstance.on('connect', () => {
      setIsConnected(true);
      clientLogger.info('Wheel display connected', { socketId: socketInstance.id });
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
      clientLogger.info('Wheel display disconnected');
    });

    socketInstance.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setError(`Connection error: ${err.message}`);
      clientLogger.error('Socket connection error', { error: err.message });
    });

    // Listen for wheel spin events from controller
    socketInstance.on('wheel-spin', (data) => {
      console.log('Received spin command:', data);
      console.log('Full prize data received:', JSON.stringify(data.prizeData, null, 2));
      clientLogger.info('Received spin command', { data });
      
      if (data && data.claimNumber) {
        setClaimNumber(data.claimNumber);
        console.log('Claim number set to:', data.claimNumber);
      }
      
      // Store prize data in localStorage for the wheel component to use
      if (data && data.prizeData) {
        try {
          // Store the prize data in localStorage
          localStorage.setItem('selectedPrize', JSON.stringify(data.prizeData));
          console.log('Prize data stored in localStorage:', data.prizeData);
          
          // IMPORTANT: The react-custom-roulette Wheel component expects prizeNumber to be
          // the index in the data array, NOT the prize ID or any other value.
          // We need to ensure we're setting the correct index that matches our wheel data.
          
          // First, try to get the wheel data to determine the correct index
          const storedWheelData = localStorage.getItem('spinWheelData') || localStorage.getItem('wheelData');
          
          if (storedWheelData) {
            const wheelData = JSON.parse(storedWheelData);
            console.log('Wheel data from localStorage:', wheelData);
            
            // If prizeIndex is provided directly from API, use it as the most reliable source
            if (data.prizeData.prizeIndex !== undefined) {
              const prizeIndex = Number(data.prizeData.prizeIndex);
              console.log('Using prizeIndex directly from API:', prizeIndex);
              
              // Verify the index is within bounds of our wheel data
              const safeIndex = prizeIndex % wheelData.length;
              console.log(`Calculated safe index: ${prizeIndex} % ${wheelData.length} = ${safeIndex}`);
              setPrizeNumber(safeIndex);
            } 
            // If we have a prize ID, try to find its position in the wheel data
            else if (data.prizeData.id !== undefined) {
              const prizeId = Number(data.prizeData.id);
              console.log('Prize ID from API:', prizeId);
              
              // Find the prize in the wheel data by ID
              const prizeEntry = wheelData.find((p: any) => p.id === prizeId);
              if (prizeEntry && prizeEntry.wheelPosition !== undefined) {
                console.log('Found prize in wheel data by ID:', prizeEntry);
                console.log('Using wheel position from matching prize:', prizeEntry.wheelPosition);
                setPrizeNumber(prizeEntry.wheelPosition);
              } else {
                // Calculate index based on position in the array
                const prizeIndex = wheelData.findIndex((p: any) => p.id === prizeId);
                if (prizeIndex !== -1) {
                  console.log(`Found prize at index ${prizeIndex} in wheel data array`);
                  setPrizeNumber(prizeIndex);
                } else {
                  // Fallback: Calculate from ID modulo wheel segments
                  const position = prizeId % wheelData.length;
                  console.log(`Calculating position from ID: ${prizeId} mod ${wheelData.length} = ${position}`);
                  setPrizeNumber(position);
                }
              }
            } else {
              // Default to position 0 if no valid data
              console.log('Invalid or missing prize data, using default position (0)');
              setPrizeNumber(0);
            }
          } else {
            // No wheel data available, use prizeIndex if available or calculate from ID
            if (data.prizeData.prizeIndex !== undefined) {
              const prizeIndex = Number(data.prizeData.prizeIndex);
              console.log('No wheel data, using prizeIndex from API:', prizeIndex);
              setPrizeNumber(prizeIndex);
            } else if (data.prizeData.id !== undefined) {
              const prizeId = Number(data.prizeData.id);
              const totalPrizes = 8; // Default if we don't know the actual count
              const position = prizeId % totalPrizes;
              console.log(`No wheel data, calculating from ID: ${prizeId} mod ${totalPrizes} = ${position}`);
              setPrizeNumber(position);
            } else {
              console.log('No prize ID or index available, using default position (0)');
              setPrizeNumber(0);
            }
          }
        } catch (err) {
          console.error('Error processing prize data:', err);
          // Set a default prize number in case of error
          setPrizeNumber(0);
        }
      } else {
        // No prize data received
        console.warn('No prize data received, using default prize position (0)');
        setPrizeNumber(0);
      }
      
      // Directly trigger wheel spin using the mustSpin state
      // This will be used by the wheel component
      setMustSpin(true);
      setShouldSpin(true);
    });

    // Listen for claim number submissions
    socketInstance.on('claim-submitted', (claimNumber) => {
      console.log('Claim number received:', claimNumber);
      clientLogger.info('Claim number received', { claimNumber });
      setClaimNumber(claimNumber);
    });

    // Save socket instance
    setSocket(socketInstance);

    // Clean up on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Handle spin start - no longer needed as we're controlling the wheel directly
  const handleSpinStart = () => {
    console.log('handleSpinStart called, shouldSpin:', shouldSpin);
    return true; // Always allow spinning
  };

  // Handle spin complete
  const handleSpinComplete = (prize: any) => {
    console.log('Spin complete, prize:', prize);
    clientLogger.info('Spin complete', { prize });
    setSpinComplete(true);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen bg-white pt-[20vh]">
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
      <h1 className="text-3xl font-bold mb-6">Spin The Wheel</h1>
      
      {/* Connection status */}
      <div className="mb-4 text-center">
        <span className={`inline-block w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
        <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 w-full max-w-3xl text-center">
          {error}
        </div>
      )}
      
      {/* Claim number display */}
      {claimNumber && (
        <div className="mb-6 p-4 bg-gray-100 rounded-lg w-full max-w-md text-center">
          <h2 className="text-xl font-semibold">Claim Number</h2>
          <p className="text-3xl font-bold">{claimNumber}</p>
        </div>
      )}
      
      {/* SpinTheWheel component - centered container */}
      <div className="flex justify-center items-center w-full">
        <SpinTheWheel 
          onSpinStart={handleSpinStart}
          onSpinComplete={handleSpinComplete}
          onError={(msg) => setError(msg)}
          mustSpin={mustSpin}
          prizeNumber={prizeNumber}
          onSpinEnd={() => {
            setMustSpin(false);
            setShouldSpin(false);
          }}
        />
      </div>
      
      {/* Spin result */}
      {spinComplete && (
        <div className="mt-6 p-4 bg-green-100 rounded-lg w-full max-w-md text-center">
          <h2 className="text-xl font-semibold">Spin Complete!</h2>
        </div>
      )}
    </div>
  );
}
