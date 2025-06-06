"use client"

import { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { type Prize } from "@/constants/prizes";
import { PRIZES } from "@/constants/prizes";
import { supabase } from '@/lib/supabase';

interface WheelProps {
  onSpinStart?: () => void;
  onError?: (message: string) => void;
}

export default function Wheel({ onSpinStart, onError }: WheelProps) {
  const [availablePrizes, setAvailablePrizes] = useState<Prize[]>([]);
  const [inStockPrizes, setInStockPrizes] = useState<Prize[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [assignedPrize, setAssignedPrize] = useState<{
    id: number;
    name: string;
    wheelPosition: number;
    prizeIndex: number;
    displayText: string;
    weight: number;
    color: string;
    textColor: string;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const spinDurationRef = useRef<number>(5000); // 5 seconds
  
  interface WheelAngleRef {
    currentAngle: number;
    finalAngle?: number;
    targetPrize?: typeof assignedPrize;
  }
  
  const wheelAngleRef = useRef<WheelAngleRef>({ currentAngle: 0 });
  const animateRef = useRef<(timestamp: DOMHighResTimeStamp) => void>();
  const drawWheelRef = useRef<() => void>();
  const getSegmentAtPointerRef = useRef<(angle: number) => Prize>();
  const handleSpinCompleteRef = useRef<(prize: Prize) => Promise<void>>();
  const hasStartedSpinRef = useRef(false);


  // Add this function before the drawWheel function
const getSegmentAtPointer = useCallback((angle: number): Prize => {
  if (availablePrizes.length === 0) {
    return {
      id: -1,
      name: 'No Prize',
      displayText: 'No Prize',
      weight: 1,
      color: '#CCCCCC',
      textColor: '#000000'
    };
  }

  // Normalize the angle to 0-2π
  const normalizedAngle = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  
  // Calculate which segment we're in
  const totalPrizes = availablePrizes.length;
  const segmentAngle = (2 * Math.PI) / totalPrizes;
  let segmentIndex = Math.floor(normalizedAngle / segmentAngle);
  
  // Convert to prize index (reversed for clockwise rotation)
  segmentIndex = (totalPrizes - segmentIndex - 1) % totalPrizes;
  
  // Return the prize at this index
  return availablePrizes[segmentIndex] || availablePrizes[0];
}, [availablePrizes]);


  // Draw the wheel
  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { width, height } = canvas;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 10;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    
    // Draw wheel segments
    const segmentAngle = (2 * Math.PI) / availablePrizes.length;
    
    availablePrizes.forEach((prize, index) => {
      const startAngle = index * segmentAngle + (wheelAngleRef.current?.currentAngle || 0);
      const endAngle = (index + 1) * segmentAngle + (wheelAngleRef.current?.currentAngle || 0);
      
      // Draw segment
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      
      // Style segment
      ctx.fillStyle = prize.color || '#CCCCCC';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + segmentAngle / 2);
      
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = prize.textColor || '#000000';
      ctx.font = 'bold 14px Arial';
      
      const text = prize.displayText || prize.name;
      ctx.fillText(text, radius - 20, 0);
      
      ctx.restore();
    });
    
    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
    ctx.fillStyle = '#1E3A8A';
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [availablePrizes]);

  // Handle spin complete
  const handleSpinComplete = useCallback(async (winningPrize: Prize) => {
    try {
      // No longer calling onSpinComplete
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process prize';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  }, [onError]);

  // Start spinning when assignedPrize is set
  useEffect(() => {
    if (!assignedPrize || hasStartedSpinRef.current) return;

    console.log('Starting wheel spin to prize:', assignedPrize);
    hasStartedSpinRef.current = true;
    setSpinning(true);
    
    // Animation variables
    const fullRotations = 5;
    const startTime = performance.now();
    const finalAngle = (2 * Math.PI * fullRotations) + assignedPrize.wheelPosition;
    let currentAngle = 0;
    
    // Animation loop
    const animate = (timestamp: DOMHighResTimeStamp) => {
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / spinDurationRef.current, 1);
      
      // Update angle with easing
      currentAngle = finalAngle * progress;
      
      // Update the wheel angle
      if (wheelAngleRef.current) {
        wheelAngleRef.current.currentAngle = currentAngle;
        wheelAngleRef.current.finalAngle = finalAngle;
        wheelAngleRef.current.targetPrize = assignedPrize;
      }
      
      // Redraw the wheel
      drawWheel();
      
      // Continue animation if not complete
      if (progress < 1) {
        const frame = requestAnimationFrame(animate);
        animationRef.current = frame;
      } else {
        // Animation complete
        setSpinning(false);
        
        // Reset for next spin after a delay
        setTimeout(() => {
          if (wheelAngleRef.current) {
            wheelAngleRef.current.finalAngle = undefined;
            wheelAngleRef.current.targetPrize = undefined;
          }
          hasStartedSpinRef.current = false;
        }, 1000);
      }
    };
    
    // Start the animation
    const frame = requestAnimationFrame(animate);
    animationRef.current = frame;
    
    // Clean up on unmount or when assignedPrize changes
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      hasStartedSpinRef.current = false;
    };
  }, [assignedPrize, drawWheel]);

  // Handle spin button click
  const handleSpin = useCallback(async () => {
    if (spinning) return;
    
    try {
      setError(null);
      setLoading(true);
      onSpinStart?.();
      
      // Get attendeeId from localStorage
      const attendeeId = localStorage.getItem('attendeeId');
      if (!attendeeId) {
        throw new Error('Attendee ID not found. Please refresh the page and try again.');
      }
      
      // Call the assign-and-spin API
      const response = await fetch('/api/assign-and-spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendeeId: parseInt(attendeeId, 10),
          eventId: 1, // Default event ID, update if needed
        })
      });
      
      let data;
      try {
        data = await response.json();
        console.log('API Response:', { status: response.status, data });
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        throw new Error('Invalid response from server');
      }
      
      if (!response.ok) {
        if (response.status === 404 && data?.code === 'NO_PRIZES_AVAILABLE') {
          throw new Error(data.details || 'No prizes available. Please try again later.');
        } else if (response.status === 400 && data?.code === 'PRIZE_ALREADY_CLAIMED') {
          throw new Error('You have already claimed a prize.');
        } else {
          throw new Error(data?.error || `Failed to assign prize: ${response.status} ${response.statusText}`);
        }
      }
      
      console.log('Assigned prize with wheel position:', data);
      
      // Set the assigned prize with wheel position from the API
      setAssignedPrize({
        id: data.id,
        name: data.name,
        wheelPosition: data.wheelPosition,
        prizeIndex: data.prizeIndex,
        displayText: data.displayText || data.name,
        weight: 1, // Default weight
        color: data.color || '#000000',
        textColor: data.textColor || '#FFFFFF'
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to spin wheel';
      console.error('Error in spin:', error);
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [spinning, onSpinStart, onError]);

  // Load initial prizes
  useEffect(() => {
    const loadInitialPrizes = async () => {
      try {
        setLoading(true);
        
        // Get all valid prizes (with weight > 0)
        const validPrizes = PRIZES.filter(prize => prize.weight > 0);
        
        // Check inventory to get in-stock prizes
        const { data: prizes, error: prizeError } = await supabase
          .from('prizes')
          .select('id, stock')
          .gt('stock', 0);

        if (prizeError) throw prizeError;

        // Create a set of in-stock prize IDs
        const inStockPrizeIds = new Set(prizes.map(p => p.id));
        
        // Set available prizes to all valid prizes (for display)
        setAvailablePrizes(validPrizes);
        
        // Set in-stock prizes for the actual spinning logic
        const filteredPrizes = validPrizes.filter(prize => inStockPrizeIds.has(prize.id));
        setInStockPrizes(filteredPrizes);
        
        if (filteredPrizes.length === 0) {
          const errorMsg = 'No prizes currently available. Please check back later.';
          setError(errorMsg);
          onError?.(errorMsg);
        }
      } catch (err) {
        console.error('Error loading initial prizes:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load prizes';
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadInitialPrizes();
  }, [onError]);

  // Set up refs
  useEffect(() => {
    drawWheelRef.current = drawWheel;
    getSegmentAtPointerRef.current = getSegmentAtPointer;
    handleSpinCompleteRef.current = handleSpinComplete;
  }, [drawWheel, getSegmentAtPointer, handleSpinComplete]);

  // Redraw wheel when needed
  useEffect(() => {
    if (availablePrizes.length > 0) {
      drawWheel();
    }
  }, [availablePrizes, drawWheel]);

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      <div className="relative w-full max-w-xs mx-auto">
        {/* HTML Pointer that stays fixed at the top */}
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-10">
          <div className="w-0 h-0 border-l-[20px] border-r-[20px] border-b-[40px] border-l-transparent border-r-transparent border-b-yellow-400 drop-shadow-lg" />
          <div className="w-16 h-4 bg-yellow-400 mx-auto -mt-1 rounded-sm shadow-inner" />
        </div>
        
        <canvas 
          ref={canvasRef}
          width={300}
          height={300}
          className="w-full aspect-square rounded-full shadow-lg relative z-0"
        />
      </div>
      
      <Button
        onClick={handleSpin}
        disabled={spinning || loading}
        className={`mt-6 py-6 px-10 text-lg font-bold rounded-full bg-gradient-to-r from-blue-600 to-blue-800 
          hover:from-blue-700 hover:to-blue-900 text-white shadow-lg transform transition-all duration-200
          ${spinning || loading ? 'opacity-75 cursor-not-allowed' : 'hover:scale-105'}`}
      >
        {spinning || loading ? (
          <span className="flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Spinning...
          </span>
        ) : 'SPIN TO WIN'}
      </Button>
      
      {error && (
        <div style={{ 
          color: 'red', 
          textAlign: 'center', 
          marginTop: '10px',
          maxWidth: '400px',
          wordBreak: 'break-word'
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
