"use client"

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { type Prize } from "@/constants/prizes";
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import './spinthewheel.css'; // Using the new CSS file
import './spinthewheel-desktop.css'; // Using desktop optimized CSS
import clientLogger from '@/lib/client-logger';

// Dynamically import the Wheel component with SSR disabled
const RouletteWheel = dynamic(
  () => import('react-custom-roulette').then((mod) => mod.Wheel),
  { ssr: false }
);

interface SpinTheWheelProps {
  onSpinStart?: () => boolean | void | Promise<boolean>;
  onSpinComplete?: (prize: Prize | null) => void;
  onError?: (message: string) => void;
  testMode?: boolean;
  // New props for direct control from parent component
  mustSpin?: boolean;
  prizeNumber?: number;
  onSpinEnd?: () => void;
}

export default function SpinTheWheel({ 
  onSpinStart, 
  onSpinComplete, 
  onError, 
  testMode = false, 
  mustSpin: externalMustSpin, 
  prizeNumber: externalPrizeNumber, 
  onSpinEnd 
}: SpinTheWheelProps) {
  const [availablePrizes, setAvailablePrizes] = useState<Prize[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [assignedPrize, setAssignedPrize] = useState<Prize | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);
  const [isConnected, setIsConnected] = useState(true); // Socket connection status
  
  // Use a ref to track loading state instead of window variable
  const isLoadingPrizesRef = useRef(false);

  // Data for react-custom-roulette
  const [wheelData, setWheelData] = useState<Array<{
    option: string;
    style: { backgroundColor: string; textColor: string };
  }>>([]);

  // Load all prizes for the wheel
  useEffect(() => {
    // Flag to track if component is mounted
    let isMounted = true;
    
    // Use the ref to prevent duplicate requests
    if (isLoadingPrizesRef.current) {
      console.log('Already loading prizes, skipping duplicate call');
      return;
    }
    
    isLoadingPrizesRef.current = true;
    
    // Function to fetch prizes with retry logic
    const fetchPrizesWithRetry = async (retries = 3, delay = 1000) => {
      for (let attempt = 1; attempt <= retries + 1; attempt++) {
        try {
          console.log(`Loading prizes attempt ${attempt}/${retries + 1}`);
          clientLogger.info(`Loading prizes attempt ${attempt}/${retries + 1}`);
          
          // Create an AbortController for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
          
          // Make the request with timeout to our new API endpoint
          const response = await Promise.race([
            fetch('/api/get-prizes', {
              signal: controller.signal,
              headers: {
                'Cache-Control': 'no-cache'
              }
            }),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('API request timed out')), 5000)
            )
          ]);
          
          clearTimeout(timeoutId);
          
          // Check if response is a fetch Response
          if (response instanceof Response) {
            if (!response.ok) {
              const errorText = await response.text();
              clientLogger.error(`API returned error status ${response.status}`, {
                status: response.status,
                response: errorText
              });
              throw new Error(`API returned ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            if (data && Array.isArray(data)) {
              clientLogger.info('Successfully fetched prizes', { count: data.length });
              return data;
            }
            
            clientLogger.error('Invalid data format returned from API', { data });
            throw new Error('Invalid data format returned from API');
          }
          
          clientLogger.error('No valid response from API');
          throw new Error('No valid response from API');
        } catch (err: unknown) {
          console.error(`Attempt ${attempt} failed:`, err);
          
          // Log the error with BetterStack
          if (err instanceof Error) {
            clientLogger.error(`Prize fetch attempt ${attempt} failed`, {
              error: err.message,
              name: err.name,
              stack: err.stack
            });
          } else {
            clientLogger.error(`Prize fetch attempt ${attempt} failed with unknown error`, {
              error: String(err)
            });
          }
          
          // If this is not the last attempt, wait before retrying
          if (attempt <= retries) {
            console.log(`Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          // If we've exhausted all retries, rethrow the error
          throw err;
        }
      }
      
      // This should never be reached due to the throw in the catch block
      throw new Error('Unexpected end of fetchPrizesWithRetry');
    };
    
    const loadPrizes = async () => {
      try {
        console.log('Loading prizes for spinthewheel display...');
        // setLoading(true);
        
        // Fetch prizes with retry logic
        const allPrizes = await fetchPrizesWithRetry();
        
        if (!allPrizes || allPrizes.length === 0) {
          console.warn('No prizes found in database');
          if (isMounted) {
            setError('No prizes available');
            onError?.('No prizes available to display');
          }
          return;
        }
        
        console.log(`Successfully loaded ${allPrizes.length} prizes`);
        
        // Sort prizes by ID to ensure consistent ordering with API
        const sortedPrizes = [...allPrizes].sort((a, b) => a.id - b.id);
        
        console.log('Sorted prizes for wheel:', sortedPrizes.map(p => ({ id: p.id, name: p.name })));
        
        // Use all prizes for the wheel display
        const prizesWithPosition = sortedPrizes.map((prize, index) => {
          // Map prize ID to wheel position (index)
          const mappedPrize = {
            id: prize.id,
            name: prize.name,
            displayText: prize.display_text || prize.name, // Use display_text from DB or fallback to name
            color: prize.color || '#9cf7f7', // Default color if not specified
            textColor: prize.text_color || '#000000', // Default text color
            weight: 100, // Default weight
            stock: prize.stock,
            wheelPosition: index, // Store the position for later reference
            // Store the ID-based position for matching with API
            idBasedPosition: prize.id % sortedPrizes.length
          };
          
          console.log(`Prize mapping: ID ${prize.id} -> Position ${index} (ID mod ${sortedPrizes.length} = ${prize.id % sortedPrizes.length})`);
          return mappedPrize;
        });
        
        if (isMounted) {
          setAvailablePrizes(prizesWithPosition);
          
          // Store the prize mapping in localStorage for the spinthewheel page to use
          try {
            localStorage.setItem('spinWheelData', JSON.stringify(prizesWithPosition));
            console.log('SpinWheel data stored in localStorage');
          } catch (err) {
            console.error('Failed to store spinwheel data in localStorage:', err);
          }
        }
        
        // Create data for react-custom-roulette
        const wheelItems = prizesWithPosition.map(prize => ({
          option: prize.displayText,
          style: {
            backgroundColor: prize.color,
            textColor: '#FFFFFF' // Force all text to be white
          }
        }));
        
        console.log('Final wheel data mapping:');
        wheelItems.forEach((item, index) => {
          console.log(`Wheel segment ${index}: ${item.option}`);
        });
        
        if (isMounted) {
          setWheelData(wheelItems);
          console.log('SpinWheel data prepared successfully');
        }
      } catch (err: unknown) {
        console.error('Error loading prizes:', err);
        
        // More detailed error information
        if (err instanceof Error) {
          console.error(`Error name: ${err.name}, message: ${err.message}`);
          if (err.stack) console.error(`Stack trace: ${err.stack}`);
          
          // Log to BetterStack
          clientLogger.error('Error loading prizes for spinthewheel', {
            error: err.message,
            name: err.name,
            stack: err.stack
          });
      
          // Only update state if component is still mounted
          if (isMounted) {
            // Check for specific error types
            if (err.message?.includes('timeout') || err.name === 'AbortError') {
              setError('Connection timed out. Please try again.');
              onError?.('Connection timed out while loading prizes. Please try again.');
              clientLogger.warn('Connection timeout detected', { errorType: 'timeout' });
            } else if (!navigator.onLine) {
              setError('Network connection issue. Please check your internet and try again.');
              onError?.('Network connection issue. Please check your internet connection and try again.');
              clientLogger.warn('Network connection issue detected', { errorType: 'offline' });
            } else {
              setError('Failed to load prizes. Please try again later.');
              onError?.('Failed to load prizes. Please try again later.');
              clientLogger.error('Unknown error loading prizes', { errorType: 'unknown' });
            }
          }
        } else {
          // Handle non-Error objects
          clientLogger.error('Non-error object thrown while loading prizes for spinthewheel', {
            error: String(err),
            type: typeof err
          });
          
          if (isMounted) {
            setError('An unexpected error occurred. Please try again later.');
            onError?.('An unexpected error occurred. Please try again later.');
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
        
        // Reset the loading flag without a delay
        isLoadingPrizesRef.current = false;
      }
    };

    loadPrizes();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
      isLoadingPrizesRef.current = false;
    };
  }, []);

  // Handle external control props
  useEffect(() => {
    if (externalMustSpin !== undefined) {
      setMustSpin(externalMustSpin);
    }
  }, [externalMustSpin]);

  useEffect(() => {
    if (externalPrizeNumber !== undefined) {
      setPrizeNumber(externalPrizeNumber);
    }
  }, [externalPrizeNumber]);

  // Handle spin completion
  const handleStopSpinning = () => {
    console.log('Spin completed');
    setSpinning(false);
    
    // Call the onSpinEnd callback if provided
    if (onSpinEnd) {
      onSpinEnd();
    }
  };

  return (
    <div className="spinthewheel-desktop-container">
      <h1 className="spinthewheel-title">Spin The Wheel</h1>
      
      {/* Connection status */}
      <div className="connection-status">
        <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></span>
        <span className="status-text">{isConnected ? 'Connected' : 'Disconnected'}</span>
      </div>
      
      {/* Wheel component with desktop-optimized container */}
      <div className="spinthewheel-viewport-container">
        <div className="spinthewheel-container">
          {wheelData.length > 0 ? (
            <RouletteWheel
              mustStartSpinning={mustSpin}
              prizeNumber={prizeNumber}
              data={wheelData}
              backgroundColors={['#ff8f43', '#70bbe0', '#0b3351', '#f9dd50']}
              textColors={['#ffffff']}
              fontSize={16}
              outerBorderColor="#eeeeee"
              outerBorderWidth={2}
              innerBorderColor="#30261a"
              innerBorderWidth={0}
              innerRadius={0}
              radiusLineColor="#eeeeee"
              radiusLineWidth={1}
              spinDuration={0.5}
              onStopSpinning={handleStopSpinning}
              startingOptionIndex={0}
            />
          ) : (
            <div className="text-gray-500">Loading wheel...</div>
          )}
        </div>
      </div>
    </div>
  );
}
