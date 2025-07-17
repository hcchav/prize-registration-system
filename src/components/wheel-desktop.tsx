"use client"

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { type Prize } from "@/constants/prizes";
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import './wheel-desktop.css'; // Using our desktop-specific CSS file
import clientLogger from '@/lib/client-logger';

// Dynamically import the Wheel component with SSR disabled
const RouletteWheel = dynamic(
  () => import('react-custom-roulette').then((mod) => mod.Wheel),
  { ssr: false }
);

interface WheelProps {
  onSpinStart?: () => boolean | void | Promise<boolean>;
  onSpinComplete?: (prize: Prize | null) => void;
  onError?: (message: string) => void;
  testMode?: boolean;
  aboveButtonContent?: React.ReactNode;
}

export default function WheelDesktop({ onSpinStart, onSpinComplete, onError, testMode = false, aboveButtonContent }: WheelProps) {
  const [availablePrizes, setAvailablePrizes] = useState<Prize[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [assignedPrize, setAssignedPrize] = useState<Prize | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);
  
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
        console.log('Loading prizes for wheel display...');
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
        
        // Use all prizes for the wheel display
        const prizesWithPosition = allPrizes.map((prize, index) => ({
          id: prize.id,
          name: prize.name,
          displayText: prize.display_text || prize.name, // Use display_text from DB or fallback to name
          color: prize.color || '#9cf7f7', // Default color if not specified
          textColor: prize.text_color || '#000000', // Default text color
          weight: 100, // Default weight
          stock: prize.stock,
          wheelPosition: index // Store the position for later reference
        }));
        
        if (isMounted) {
          setAvailablePrizes(prizesWithPosition);
        }
        
        // Create data for react-custom-roulette
        const wheelItems = prizesWithPosition.map(prize => ({
          option: prize.displayText,
          style: {
            backgroundColor: prize.color,
            textColor: '#FFFFFF' // Force all text to be white
          }
        }));
        
        if (isMounted) {
          setWheelData(wheelItems);
          console.log('Wheel data prepared successfully');
        }
      } catch (err: unknown) {
        console.error('Error loading prizes:', err);
        
        // More detailed error information
          if (err instanceof Error) {
            console.error(`Error name: ${err.name}, message: ${err.message}`);
            if (err.stack) console.error(`Stack trace: ${err.stack}`);
            
            // Log to BetterStack
            clientLogger.error('Error loading prizes', {
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
          clientLogger.error('Non-error object thrown while loading prizes', {
            error: String(err),
            type: typeof err
          });
          
          if (isMounted) {
            setError('An unexpected error occurred. Please try again later.');
            onError?.('An unexpected error occurred. Please try again later.');
            clientLogger.error('Non-error object thrown while loading prizes', {
              error: String(err),
              type: typeof err
            });
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

  // Handle spin button click
  const handleSpin = useCallback(async () => {
    // Prevent multiple spins or spinning when no prizes available
    if (spinning || loading || !availablePrizes.length) return;

    try {
      console.log('Starting spin process');
      setLoading(true);
      
      // Call onSpinStart and check if it returns false (which means don't proceed)
      if (onSpinStart) {
        const result = onSpinStart();
        // Handle Promise or direct boolean result
        let shouldProceed = true;
        
        if (result instanceof Promise) {
          try {
            shouldProceed = await result;
          } catch (err) {
            console.error('Error in onSpinStart:', err);
            shouldProceed = false;
          }
        } else if (result === false) {
          shouldProceed = false;
        }
        
        if (!shouldProceed) {
          console.log('Spin prevented by onSpinStart');
          setLoading(false);
          return;
        }
      }
      
      setError(null);
      
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
            eventId: 1
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
          console.log('No prizes available, triggering fallback');
          // Trigger fallback modal
          onSpinComplete?.(null);
          setLoading(false);
          return;
        }
        throw new Error(errorData.error || `Server error (${response.status}). Please try again.`);
      }
      
      let data;
      try {
        data = await response.json();
        console.log('API Response:', data);
      } catch (jsonErr) {
        console.error('Error parsing response:', jsonErr);
        throw new Error('Invalid response from server. Please try again.');
      }
      
      // The API returns the prize data directly in the response
      const selectedPrize = data;
      if (!selectedPrize || !selectedPrize.id) {
        throw new Error('No prize data received from server.');
      }
      
      // Find the prize in our available prizes array
      const prizeIndex = availablePrizes.findIndex(p => p.id === selectedPrize.id);
      if (prizeIndex === -1) {
        throw new Error('Selected prize not found in available prizes.');
      }
      
      // Set the prize number for the wheel
      setPrizeNumber(prizeIndex);
      
      // Store the assigned prize for later use
      const assignedPrizeData = {
        ...availablePrizes[prizeIndex],
        id: selectedPrize.id,
        name: selectedPrize.name,
        displayText: selectedPrize.display_text || selectedPrize.name
      };

      //add here to send email of prize selection

      
      setAssignedPrize(assignedPrizeData);
      
      // Send prize confirmation email with 25-second delay
      try {
        // Get attendeeId from localStorage with proper error handling
        let attendeeId;
        const storedId = localStorage.getItem('attendeeId');
        
        if (storedId) {
          try {
            // Try to parse as JSON first
            attendeeId = JSON.parse(storedId);
          } catch (parseError) {
            // If parsing fails, use the raw string value
            attendeeId = storedId;
          }
        }
        
        if (attendeeId) {
          console.log('Will send prize confirmation email in 25 seconds for:', { 
            attendeeId, 
            prizeName: assignedPrizeData.displayText 
          });
          
          // Set a timeout to delay the email sending by 25 seconds
          setTimeout(() => {
            console.log('Now sending delayed prize confirmation email after 25 seconds');
            
            fetch('/api/send-prize-confirmation-email', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                attendeeId,
                prizeName: assignedPrizeData.displayText
              }),
            }).then(response => {
              if (!response.ok) {
                console.error('Failed to send prize confirmation email:', response.statusText);
              } else {
                console.log('Prize confirmation email sent successfully');
              }
            }).catch(error => {
              console.error('Error sending prize confirmation email:', error);
            });
          }, 25000); // 25 seconds delay
        }
      } catch (emailError) {
        console.error('Error preparing prize confirmation email:', emailError);
        // Don't block the wheel spin if email sending fails
      }
      
      // Start spinning the wheel
      setSpinning(true);
        setMustSpin(true);
      
    } catch (err) {
      console.error('Error during spin:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      onError?.(errorMessage);
      setLoading(false);
    }
  }, [availablePrizes, loading, onError, onSpinComplete, onSpinStart, spinning]);
  
  // Handle test spin (for development/testing only)
  const handleTestSpin = useCallback(() => {
    if (spinning || !availablePrizes.length) return;
    
    // Select a random prize
    const randomIndex = Math.floor(Math.random() * availablePrizes.length);
    const randomPrize = availablePrizes[randomIndex];
    
    // Set the prize number
    setPrizeNumber(randomIndex);
    
    // Store the assigned prize
    setAssignedPrize(randomPrize);
    
    // Start spinning
    setSpinning(true);
    setMustSpin(true);
  }, [availablePrizes, spinning]);
  
  // Handle when the wheel stops spinning
  const handleStopSpinning = useCallback(() => {
    console.log('Wheel stopped spinning');
    setSpinning(false);
    setMustSpin(false);
    setLoading(false);
    
    // Call the onSpinComplete callback with the assigned prize
    if (assignedPrize) {
      console.log('Calling onSpinComplete with prize:', assignedPrize);
      onSpinComplete?.(assignedPrize);
    }
  }, [assignedPrize, onSpinComplete]);

  return (
    <div className="wheel-desktop-container">

      {/* Viewport-based wheel container */}
      <div className="wheel-viewport-container" style={{ marginTop: '30px' }}>
        <div className="wheel-container">
          {wheelData.length > 0 && (
            <RouletteWheel
              mustStartSpinning={mustSpin}
              prizeNumber={prizeNumber}
              data={wheelData}
              onStopSpinning={handleStopSpinning}
              spinDuration={0.8}
              outerBorderWidth={1}
              outerBorderColor="#ffffff"
              innerRadius={5}
              innerBorderColor="#ffffff"
              innerBorderWidth={0.5}
              radiusLineColor="transparent"
              radiusLineWidth={0}
              textDistance={50}
              fontSize={24}
              perpendicularText={false}
              pointerProps={{
                src: '/blue_shape_smoothed.svg',                style: {
                  width: '75px',
                  height: '75px',
                  transform: 'rotate(0deg) translateX(0px) translateY(0px)'
                }
              }}
            />
          )}
        </div>
      </div>
      
      {/* Render content above the button if provided */}
      {aboveButtonContent}
      
      <Button
        onClick={handleSpin}
        disabled={spinning || loading}
        className={`w-full py-4 rounded-lg text-white font-bold h-[6.5rem] text-[2.5rem] max-w-none border-0 ${spinning || loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#418fde] hover:bg-[#3177c2] shadow-lg'}`}
      >
        {spinning || loading ? 'Spinning...' : 'SPIN THE WHEEL!'}
      </Button>
      
      {testMode && (
        <Button
          onClick={handleTestSpin}
          disabled={spinning}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-medium"
        >
          Test Spin (Random Prize)
        </Button>
      )}
      
      {error && (
        <div className="mt-4 p-2 bg-red-100 text-red-700 rounded text-center">
          {error}
        </div>
      )}
    </div>
  );
}
