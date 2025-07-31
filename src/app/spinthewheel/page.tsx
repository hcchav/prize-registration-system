"use client"

import { useState, useEffect } from 'react';
import SpinTheWheel from '@/components/SpinTheWheel';
import { io, Socket } from 'socket.io-client';
import clientLogger from '@/lib/client-logger';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import '@/components/modal-styles.css';

// Dynamically import ReactConfetti to avoid SSR issues
const ReactConfetti = dynamic(() => import('react-confetti'), {
  ssr: false,
});

export default function SpinTheWheelPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimNumber, setClaimNumber] = useState<string>('');
  const [shouldSpin, setShouldSpin] = useState(false);
  const [spinComplete, setSpinComplete] = useState(false);
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCongratsModal, setShowCongratsModal] = useState(false);
  const [noPrizeAvailable, setNoPrizeAvailable] = useState(false);
  const [prize, setPrize] = useState<any>(null);
  
  // Get window size for confetti
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  // Update window size when window resizes
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Initialize socket connection
  useEffect(() => {
    // Get the current hostname dynamically
    const protocol = window.location.protocol === 'https:' ? 'https://' : 'http://';
    const host = window.location.hostname;
    const port = window.location.port || (protocol === 'https://' ? '443' : '80');
    const socketUrl = `${protocol}${host}:${port}`;
    
    console.log('SPINTHEWHEEL: Connecting to socket at:', socketUrl);
    
    // Create socket connection with fallback options
    const socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000
    });
    
    console.log('SPINTHEWHEEL: Attempting to connect to WebSocket server...');
    console.log('SPINTHEWHEEL: Socket instance created:', socketInstance);

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

    // Listen for close-modal events
    socketInstance.on('close-modal', () => {
      console.log('SPINTHEWHEEL: Received close-modal event');
      console.log('SPINTHEWHEEL: Socket ID when receiving close-modal:', socketInstance.id);
      console.log('SPINTHEWHEEL: Socket connected status:', socketInstance.connected);
      clientLogger.info('Received close-modal event', { socketId: socketInstance.id });
      setShowCongratsModal(false);
      setShowConfetti(false);
    });

    // Debug socket events
    socketInstance.onAny((event, ...args) => {
      console.log(`SPINTHEWHEEL: Received event: ${event}`, args);
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
      <div className="flex justify-center items-center w-full" style={{ opacity: showCongratsModal ? 0.3 : 1, transition: 'opacity 0.3s ease' }}>
        <SpinTheWheel 
          onSpinStart={handleSpinStart}
          onSpinComplete={(prize: any) => {
            console.log('Spin complete, prize:', prize);
            clientLogger.info('Spin complete', { prize });
            setSpinComplete(true);
            
            // Show confetti and congratulations modal
            if (prize) {
              setPrize(prize);
              setShowConfetti(true);
              setShowCongratsModal(true);
              
              // Hide confetti after 5 seconds
              setTimeout(() => {
                setShowConfetti(false);
              }, 5000);
            } else {
              setNoPrizeAvailable(true);
              setShowCongratsModal(true);
            }
          }}
          onError={(msg) => setError(msg)}
          mustSpin={mustSpin}
          prizeNumber={prizeNumber}
          onSpinEnd={(spinPrize) => {
            console.log('Spin ended, received prize:', spinPrize);
            setMustSpin(false);
            setShouldSpin(false);
            setSpinComplete(true);
            
            // Use the prize from the wheel if available, otherwise use the one from socket
            const finalPrize = spinPrize || prize;
            console.log('Final prize for confetti/modal:', finalPrize);
            
            // Always emit spin-complete event back to controller
            if (socket && socket.connected) {
              console.log('SPINTHEWHEEL: Emitting spin-complete event with prize:', finalPrize);
              clientLogger.info('Emitting spin-complete event');
              socket.emit('spin-complete', { prize: finalPrize });
              console.log('SPINTHEWHEEL: Socket ID when emitting:', socket.id);
              console.log('SPINTHEWHEEL: Socket connected status:', socket.connected);
              
              // Also log the prize data for debugging
              if (finalPrize) {
                console.log('SPINTHEWHEEL: Prize details being sent to controller:');
                console.log('- Name:', finalPrize.name || finalPrize.displayText);
                console.log('- ID:', finalPrize.id);
                console.log('- Index:', finalPrize.prizeIndex);
              } else {
                console.log('SPINTHEWHEEL: No prize data available to send to controller');
              }
            } else {
              console.error('SPINTHEWHEEL: Cannot emit spin-complete event - socket not connected');
              console.log('SPINTHEWHEEL: Socket object:', socket);
            }
            
            // Show confetti and congratulations modal
            if (finalPrize) {
              setPrize(finalPrize);
              setShowConfetti(true);
              setShowCongratsModal(true);
              
              // Hide confetti after 5 seconds
              setTimeout(() => {
                setShowConfetti(false);
              }, 5000);
            } else if (noPrizeAvailable) {
              setShowCongratsModal(true);
            }
          }}
        />
      </div>
      
      {/* Confetti Effect */}
      {showConfetti && !noPrizeAvailable && (
        <div className="fixed inset-0 z-[100] pointer-events-none">
          <ReactConfetti
            width={windowSize.width}
            height={windowSize.height}
            recycle={true}
            numberOfPieces={200}
            gravity={0.2}
            colors={['#418FDE', '#2e7bc4', '#1a67aa', '#0c4b8c', '#00263a']}
          />
        </div>
      )}

      {/* Congrats Modal */}
      {showCongratsModal && (
        <div className="congrats-modal-overlay">
          <div className="congrats-modal-backdrop"></div>
          <div className="congrats-modal-content">
            {noPrizeAvailable ? (
              <>
                <div className="congrats-modal-no-prize-title">
                  All Prizes Claimed. Thank you for participating!
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
                setShowCongratsModal(false);
                setShowConfetti(false);
                
                // Emit event to close controller modal as well
                if (socket && socket.connected) {
                  console.log('SPINTHEWHEEL: Emitting close-modal event');
                  clientLogger.info('Emitting close-modal event');
                  socket.emit('close-modal');
                }
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
      
      {/* Spin result */}
      {spinComplete && !showCongratsModal && (
        <div className="mt-6 p-4 bg-green-100 rounded-lg w-full max-w-md text-center">
          <h2 className="text-xl font-semibold">Spin Complete!</h2>
        </div>
      )}
    </div>
  );
}
