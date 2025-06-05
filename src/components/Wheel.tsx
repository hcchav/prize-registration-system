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
  const wheelAngleRef = useRef<number>(0);
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

      // Update wheel angle
      const currentAngle = wheelAngleRef.current;
      wheelAngleRef.current = (currentAngle + currentSpeed) % (2 * Math.PI);

      // Draw the wheel using the ref
      drawWheelRef.current?.();

      // If animation is complete
      if (progress >= 1) {
        setSpinning(false);
        startTimeRef.current = null;

        // Determine the winning segment
        const winningPrize = getSegmentAtPointerRef.current?.(wheelAngleRef.current);
        if (winningPrize) {
          handleSpinCompleteRef.current?.(winningPrize);
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

  // Get segment at pointer
  const getSegmentAtPointer = useCallback((wheelAngle: number) => {
    const totalWeight = inStockPrizes.reduce((sum, p) => sum + p.weight, 0);
    let segmentStart = 0;

    for (let i = 0; i < inStockPrizes.length; i++) {
      const segmentAngle = (inStockPrizes[i].weight / totalWeight) * (2 * Math.PI);
      const segmentEnd = segmentStart + segmentAngle;

      let normalizedWheelAngle = wheelAngle % (2 * Math.PI);
      if (normalizedWheelAngle < 0) normalizedWheelAngle += 2 * Math.PI;

      let pointerPosition = ((3 * Math.PI) / 2 - normalizedWheelAngle) % (2 * Math.PI);
      if (pointerPosition < 0) pointerPosition += 2 * Math.PI;

      if (pointerPosition >= segmentStart && pointerPosition < segmentEnd) {
        return inStockPrizes[i];
      }

      segmentStart = segmentEnd;
    }

    return inStockPrizes[0] || availablePrizes[0];
  }, [inStockPrizes, availablePrizes]);

  // Draw the wheel
  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    const totalWeight = inStockPrizes.reduce((sum, p) => sum + p.weight, 0);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw segments with variable sizes based on weights
    let startAngle = wheelAngleRef.current;

    inStockPrizes.forEach((prize) => {
      const segmentAngle = (prize.weight / totalWeight) * (2 * Math.PI);
      const endAngle = startAngle + segmentAngle;

      // Draw segment background
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = prize.color;
      ctx.fill();
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + segmentAngle / 2);
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillStyle = prize.textColor || '#fff';
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
        // First set available prizes from constants
        const validPrizes = PRIZES.filter(prize => prize.weight > 0);
        
        // Check inventory to get in-stock prizes
        const { data: prizes, error: prizeError } = await supabase
          .from('prizes')
          .select('id, stock')
          .gt('stock', 0);

        if (prizeError) throw prizeError;

        // Create a set of in-stock prize IDs for quick lookup
        const inStockPrizeIds = new Set(prizes.map(p => p.id));
        
        // Filter availablePrizes to only include those with stock > 0
        const filteredPrizes = validPrizes.filter(prize => inStockPrizeIds.has(prize.id));
        
        // Update both states in sequence
        setAvailablePrizes(validPrizes);
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

  // Handle spin with inventory check
  const handleSpin = useCallback(async () => {
    if (spinning) return;
    
    try {
      setError(null);
      setLoading(true);
      
      // Check inventory before spinning
      const prizes = await checkPrizeInventory();
      if (prizes.length === 0) return;
      
      // If we have in-stock prizes, proceed with the spin
      setSpinning(true);
      onSpinStart?.();
      setResult(null);
      
      // Add a random initial rotation to make each spin feel unique
      wheelAngleRef.current = Math.random() * 2 * Math.PI;
      
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
