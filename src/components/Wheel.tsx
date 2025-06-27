"use client"

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { type Prize } from "@/constants/prizes";
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import './wheel.css'; // We'll create this CSS file

// Dynamically import the Wheel component with SSR disabled
const RouletteWheel = dynamic(
  () => import('react-custom-roulette').then((mod) => mod.Wheel),
  { ssr: false }
);

interface WheelProps {
  onSpinStart?: () => void;
  onSpinComplete?: (prize: Prize | null) => void;
  onError?: (message: string) => void;
  testMode?: boolean;
}

export default function Wheel({ onSpinStart, onSpinComplete, onError, testMode = false }: WheelProps) {
  const [availablePrizes, setAvailablePrizes] = useState<Prize[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [assignedPrize, setAssignedPrize] = useState<Prize | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);
  
  // Data for react-custom-roulette
  const [wheelData, setWheelData] = useState<Array<{
    option: string;
    style: { backgroundColor: string; textColor: string };
  }>>([]);

  // Load all prizes for the wheel
  useEffect(() => {
    const loadPrizes = async () => {
      try {
        // First, load all prizes for the wheel display
        const { data: allPrizes, error: allPrizesError } = await supabase
          .from('prizes')
          .select('*')
          .order('id', { ascending: true });

        if (allPrizesError) throw allPrizesError;
        
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
        
        setAvailablePrizes(prizesWithPosition);
        
        // Create data for react-custom-roulette
        const wheelItems = prizesWithPosition.map(prize => ({
          option: prize.displayText,
          style: {
            backgroundColor: prize.color,
            textColor: '#FFFFFF' // Force all text to be white
          }
        }));
        
        setWheelData(wheelItems);
      } catch (err) {
        console.error('Error loading prizes:', err);
        onError?.('Failed to load prizes. Please try again later.');
      }
    };

    loadPrizes();
  }, [onError]);

  // Handle spin button click
  const handleSpin = useCallback(async () => {
    // Prevent multiple spins or spinning when no prizes available
    if (spinning || loading || !availablePrizes.length) return;

    try {
      console.log('Starting spin process');
      onSpinStart?.();
      setLoading(true);
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
      
      setAssignedPrize(assignedPrizeData);
      
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
    <div className="grid grid-cols-1 w-full flex flex-col items-center">
      <div className="relative h-[320px] w-full mb-4">
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
                src: '/blue_shape_smoothed.svg',
                style: {
                  width: '50px',
                  height: '50px',
                  transform: 'rotate(0deg) translateX(0px) translateY(0px)'
                }
              }}
            />
          )}
        </div>
      </div>
      
      <Button
        onClick={handleSpin}
        disabled={spinning || loading}
        className={`w-full py-3 rounded-md text-white font-regular ${spinning || loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#418fde] hover:bg-[#3177c2]'}`}
      >
        {spinning || loading ? 'Spinning...' : 'Spin the Wheel!'}
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
