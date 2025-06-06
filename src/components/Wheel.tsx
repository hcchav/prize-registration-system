"use client"

import { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { type Prize } from "@/constants/prizes";
import { PRIZES } from "@/constants/prizes";
import { supabase } from '@/lib/supabase';

interface WheelProps {
  onSpinStart?: () => void;
  onSpinComplete: (prize: Prize) => void | Promise<void>;
  onError?: (message: string) => void;
}

export default function Wheel({ onSpinStart, onSpinComplete, onError }: WheelProps) {
  const [availablePrizes, setAvailablePrizes] = useState<Prize[]>([]);
  const [inStockPrizes, setInStockPrizes] = useState<Prize[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Prize | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  // Define the type for wheel angle reference
  interface WheelAngleRef {
    currentAngle: number;
    finalAngle?: number;
    targetPrize?: Prize;
  }

  const wheelAngleRef = useRef<WheelAngleRef>({ currentAngle: 0 });
  const spinDurationRef = useRef<number>(5000); // 5 seconds
  const [canvasSize] = useState({ width: 400, height: 400 });
  const animateRef = useRef<(timestamp: DOMHighResTimeStamp) => void>();
  const drawWheelRef = useRef<() => void>();
  const getSegmentAtPointerRef = useRef<(angle: number) => Prize>();
  const handleSpinCompleteRef = useRef<(prize: Prize) => Promise<void>>();

  // Initialize refs and set up the animation loop
  useEffect(() => {
    // Create the animation function that uses refs
    const animate = (timestamp: DOMHighResTimeStamp) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / spinDurationRef.current, 1);

      // Easing function for natural deceleration
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);

      // Calculate current speed based on progress
      const initialSpeed = 0.3;
      const currentSpeed = initialSpeed * (1 - easeOutCubic);

      // If animation is about to complete, pick a random in-stock prize and set the angle
      if (progress > 0.9 && !wheelAngleRef.current.finalAngle && inStockPrizes.length > 0) {
        const targetPrize = getRandomInStockPrize();
        const finalAngle = getAngleForPrize(targetPrize);
        
        // Add full rotations to make the spin look natural
        const fullRotations = 5 * 2 * Math.PI;
        const adjustedFinalAngle = finalAngle + fullRotations;
        
        // Store the target prize and final angle
        wheelAngleRef.current = {
          currentAngle: wheelAngleRef.current.currentAngle,
          finalAngle: adjustedFinalAngle,
          targetPrize
        };
      }

      // Update wheel angle
      let newAngle: number;
      
      if (wheelAngleRef.current.finalAngle !== undefined) {
        // Ease into the final angle for the last 10% of the animation
        const finalProgress = (progress - 0.9) / 0.1; // 0 to 1 in the last 10%
        const easedProgress = 1 - Math.pow(1 - finalProgress, 3); // Ease out
        newAngle = wheelAngleRef.current.currentAngle + 
                  (wheelAngleRef.current.finalAngle - wheelAngleRef.current.currentAngle) * 
                  Math.min(easedProgress, 1);
      } else {
        // Normal spinning
        newAngle = (wheelAngleRef.current.currentAngle + currentSpeed) % (2 * Math.PI);
      }

      // Update the current angle
      wheelAngleRef.current.currentAngle = newAngle;

      // Draw the wheel using the ref
      drawWheelRef.current?.();

      // If animation is complete
      if (progress >= 1) {
        setSpinning(false);
        startTimeRef.current = null;

        // Use the pre-selected target prize
        if (wheelAngleRef.current.targetPrize) {
          handleSpinCompleteRef.current?.(wheelAngleRef.current.targetPrize);
        } else if (inStockPrizes.length > 0) {
          // Fallback: if for some reason we didn't land on a prize, use a random in-stock one
          handleSpinCompleteRef.current?.(getRandomInStockPrize());
        }

        // Clean up
        if (animationRef.current !== null) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
      } else {
        // Continue the animation
        const nextFrame = requestAnimationFrame(animate);
        animationRef.current = nextFrame;
      }
    };

    animateRef.current = animate;
  }, []);

  // Helper function to find the next in-stock prize index
  const findNextInStockPrizeIndex = (currentIndex: number): number => {
    const totalPrizes = availablePrizes.length;
    for (let i = 1; i <= totalPrizes; i++) {
      const nextIndex = (currentIndex + i) % totalPrizes;
      const nextPrize = availablePrizes[nextIndex];
      if (inStockPrizes.some(p => p.id === nextPrize.id)) {
        return nextIndex;
      }
    }
    return 0; // fallback to first prize if none found (shouldn't happen)
  };

  // Get the angle adjustment to land on an in-stock prize
  const getAdjustedAngle = (currentAngle: number): number => {
    // Normalize the angle to 0-2π
    const normalizedAngle = ((currentAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    
    // Calculate which segment we're in
    const totalPrizes = availablePrizes.length;
    const anglePerSegment = (2 * Math.PI) / totalPrizes;
    
    // Find the current segment index (0 to totalPrizes-1)
    let segmentIndex = Math.floor(normalizedAngle / anglePerSegment);
    segmentIndex = (totalPrizes - segmentIndex - 1) % totalPrizes;
    
    // Get the current prize
    const currentPrize = availablePrizes[segmentIndex];
    
    // If current prize is in stock, return the angle as is
    if (inStockPrizes.some(p => p.id === currentPrize.id)) {
      return currentAngle;
    }
    
    // Find the next in-stock prize
    const nextInStockIndex = findNextInStockPrizeIndex(segmentIndex);
    
    // Calculate the target angle for the next in-stock prize
    // Position the pointer at the middle of the segment
    const targetSegmentIndex = (totalPrizes - nextInStockIndex - 1) % totalPrizes;
    const targetAngle = (targetSegmentIndex + 0.5) * anglePerSegment;
    
    // Add some extra rotation to make it look natural
    return (targetAngle + 2 * Math.PI) % (2 * Math.PI);
  };

  // Handle spin complete
  const handleSpinComplete = useCallback(async (winningPrize: Prize) => {
    try {
      setResult(winningPrize);

      // Call the onSpinComplete callback
      const spinCompleteResult = onSpinComplete(winningPrize);
      if (spinCompleteResult && typeof spinCompleteResult.catch === 'function') {
        await spinCompleteResult.catch((error: Error) => {
          console.error('Error in onSpinComplete:', error);
          setError(error.message);
          onError?.(error.message);
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process prize';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  }, [onSpinComplete, onError]);

  // Function to get a random in-stock prize
  const getRandomInStockPrize = useCallback((): Prize => {
    if (inStockPrizes.length === 0) return availablePrizes[0];
    const randomIndex = Math.floor(Math.random() * inStockPrizes.length);
    return inStockPrizes[randomIndex];
  }, [inStockPrizes, availablePrizes]);

  // Function to get the angle for a specific prize
  const getAngleForPrize = useCallback((prize: Prize): number => {
    const totalPrizes = availablePrizes.length;
    const prizeIndex = availablePrizes.findIndex(p => p.id === prize.id);
    if (prizeIndex === -1) return 0;
    
    // Calculate the angle for the middle of the prize segment
    const anglePerSegment = (2 * Math.PI) / totalPrizes;
    const targetSegmentIndex = (totalPrizes - prizeIndex - 1) % totalPrizes;
    return (targetSegmentIndex + 0.5) * anglePerSegment;
  }, [availablePrizes]);

  // Function to determine which segment is at the pointer
  const getSegmentAtPointer = useCallback((wheelAngle: number) => {
    if (availablePrizes.length === 0) return null;
    if (inStockPrizes.length === 0) return availablePrizes[0];
    
    // Normalize the angle to 0-2π
    const normalizedAngle = ((wheelAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    
    // Calculate which segment we're in
    const totalPrizes = availablePrizes.length;
    const anglePerSegment = (2 * Math.PI) / totalPrizes;
    
    // Find the current segment index (0 to totalPrizes-1)
    let segmentIndex = Math.floor(normalizedAngle / anglePerSegment);
    segmentIndex = (totalPrizes - segmentIndex - 1) % totalPrizes;
    
    // Get the current prize
    const currentPrize = availablePrizes[segmentIndex];
    
    // If current prize is in stock, return it
    if (inStockPrizes.some(p => p.id === currentPrize.id)) {
      return currentPrize;
    }
    
    // Otherwise return a random in-stock prize
    return getRandomInStockPrize();
  }, [availablePrizes, inStockPrizes, getRandomInStockPrize]);

  // Draw the wheel
  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    
    // Use all available prizes for display
    const displayPrizes = availablePrizes;
    const totalWeight = displayPrizes.reduce((sum, p) => sum + p.weight, 0);
    
    // Create a set of in-stock prize IDs for reference
    const inStockPrizeIds = new Set(inStockPrizes.map(p => p.id));

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw segments with variable sizes based on weights
    let startAngle = wheelAngleRef.current.currentAngle;

    displayPrizes.forEach((prize) => {
      const segmentAngle = (prize.weight / totalWeight) * (2 * Math.PI);
      const endAngle = startAngle + segmentAngle;
      const isInStock = inStockPrizeIds.has(prize.id);

      // Draw segment background
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      
      // Use a dimmed color for out-of-stock prizes
      const baseColor = prize.color;
      const dimmedColor = isInStock 
        ? baseColor 
        : baseColor.replace(')', ', 0.3)').replace('rgb', 'rgba');
      
      ctx.fillStyle = dimmedColor;
      ctx.fill();
      
      ctx.strokeStyle = isInStock ? "#FFFFFF" : "#AAAAAA";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + segmentAngle / 2);
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillStyle = isInStock ? (prize.textColor || '#fff') : '#AAAAAA';
      ctx.font = 'bold 12px Arial';
      ctx.fillText(prize.displayText, radius - 75, 0);
      ctx.restore();

      startAngle = endAngle;
    });

    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.15, 0, 2 * Math.PI);
    ctx.fillStyle = "#1E3A8A";
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw pointer
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius + 15);
    ctx.lineTo(centerX - 10, centerY - radius - 5);
    ctx.lineTo(centerX + 10, centerY - radius - 5);
    ctx.closePath();
    ctx.fillStyle = "#1E3A8A";
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [inStockPrizes]);

  // Update function refs when they change
  useEffect(() => {
    drawWheelRef.current = drawWheel;
    getSegmentAtPointerRef.current = getSegmentAtPointer;
    handleSpinCompleteRef.current = handleSpinComplete;
  }, [drawWheel, getSegmentAtPointer, handleSpinComplete]);

  // Redraw wheel when inStockPrizes changes
  useEffect(() => {
    if (inStockPrizes.length > 0) {
      drawWheel();
    }
  }, [inStockPrizes, drawWheel]);

  // Load prizes when component mounts
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

        // Create a set of in-stock prize IDs for quick lookup
        const inStockPrizeIds = new Set(prizes.map(p => p.id));
        
        // Set available prizes to all valid prizes (for display)
        setAvailablePrizes(validPrizes);
        
        // Set in-stock prizes for the actual spinning logic
        const filteredPrizes = validPrizes.filter(prize => inStockPrizeIds.has(prize.id));
        setInStockPrizes(filteredPrizes);
        
        if (filteredPrizes.length === 0) {
          setError('No prizes currently available. Please check back later.');
          onError?.('No prizes currently available. Please check back later.');
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

  // Check prize inventory before spinning
  const checkPrizeInventory = useCallback(async () => {
    try {
      setLoading(true);
      const { data: prizes, error: prizeError } = await supabase
        .from('prizes')
        .select('id, stock')
        .gt('stock', 0);

      if (prizeError) throw prizeError;

      // Create a set of in-stock prize IDs for quick lookup
      const inStockPrizeIds = new Set(prizes.map(p => p.id));
      
      // Filter availablePrizes to only include those with stock > 0
      const filteredPrizes = availablePrizes.filter(prize => inStockPrizeIds.has(prize.id));
      
      setInStockPrizes(filteredPrizes);
      
      if (filteredPrizes.length === 0) {
        throw new Error('No prizes currently available. Please check back later.');
      }
      
      return filteredPrizes;
    } catch (err) {
      console.error('Error checking prize inventory:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to check prize availability';
      setError(errorMessage);
      onError?.(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [availablePrizes, onError]);

  // Reset wheel angle when starting a new spin
  const handleSpin = useCallback(async () => {
    if (spinning) return;
    
    try {
      setError(null);
      setLoading(true);
      
      // Check inventory before spinning
      const prizes = await checkPrizeInventory();
      if (prizes.length === 0) return;
      
      // Reset the wheel angle reference with a small random starting angle
      wheelAngleRef.current = { 
        currentAngle: Math.random() * 0.5 // Small random starting angle
      };
      
      // Start spinning
      setSpinning(true);
      onSpinStart?.();
      setResult(null);
      
      // Start the animation
      startTimeRef.current = null;
      const frame = requestAnimationFrame(animateRef.current!);
      animationRef.current = frame;
      
    } catch (err) {
      console.error('Error during spin:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to start spin';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [spinning, checkPrizeInventory, onSpinStart, onError]);

  // Update the spinWheel function to use handleSpin
  const spinWheel = useCallback(() => {
    handleSpin();
  }, [handleSpin]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || availablePrizes.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500">{error || 'No prizes available at the moment'}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative w-full max-w-md aspect-square">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="w-full h-auto border-2 border-gray-200 rounded-full"
        />
      </div>
      
      {!spinning && (!result || error) && (
        <button
          onClick={spinWheel}
          disabled={loading || (!!error && !error.includes('out of stock'))}
          className="w-full h-12 bg-[#418FDE] hover:bg-[#2e7bc4] rounded-[5px] text-white font-medium text-base transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading 
            ? 'Checking Prizes...' 
            : error 
              ? error.includes('out of stock') ? 'Spin Again' : error
              : 'Spin the Wheel!'}
        </button>
      )}
      
      {spinning && <div className="text-lg font-semibold">Spinning...</div>}

      {error && !spinning && (
        <div className="text-red-500 text-center">{error}</div>
      )}
    </div>
  );
}
