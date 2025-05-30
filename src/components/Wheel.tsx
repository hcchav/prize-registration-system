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

  // Use prizes from the constants file
  useEffect(() => {
    try {
      setLoading(true);
      // Filter out any prizes with weight <= 0
      const validPrizes = PRIZES.filter(prize => prize.weight > 0);
      
      if (validPrizes.length > 0) {
        setAvailablePrizes(validPrizes);
      } else {
        setError('No valid prizes available');
        onError?.('No valid prizes available');
      }
    } catch (err) {
      console.error('Error initializing prizes:', err);
      setError('Failed to initialize prizes');
      onError?.('Failed to initialize prizes. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  // Draw the wheel with weighted segments
  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    const totalWeight = availablePrizes.reduce((sum, p) => sum + p.weight, 0);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw segments with variable sizes based on weights
    let startAngle = wheelAngleRef.current;

    availablePrizes.forEach((prize) => {
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
      ctx.textAlign = 'right';
      ctx.fillStyle = prize.textColor || '#fff';
      ctx.font = 'bold 12px Arial';
      ctx.fillText(prize.displayText, radius - 20, 0);
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
  }, [availablePrizes]);

  // Function to determine which segment is at the pointer
  const getSegmentAtPointer = useCallback((wheelAngle: number) => {
    const totalWeight = availablePrizes.reduce((sum, p) => sum + p.weight, 0);
    let segmentStart = 0;

    for (let i = 0; i < availablePrizes.length; i++) {
      const segmentAngle = (availablePrizes[i].weight / totalWeight) * (2 * Math.PI);
      const segmentEnd = segmentStart + segmentAngle;

      let normalizedWheelAngle = wheelAngle % (2 * Math.PI);
      if (normalizedWheelAngle < 0) normalizedWheelAngle += 2 * Math.PI;

      let pointerPosition = ((3 * Math.PI) / 2 - normalizedWheelAngle) % (2 * Math.PI);
      if (pointerPosition < 0) pointerPosition += 2 * Math.PI;

      if (pointerPosition >= segmentStart && pointerPosition < segmentEnd) {
        return availablePrizes[i];
      }

      segmentStart = segmentEnd;
    }

    return availablePrizes[0];
  }, [availablePrizes]);

  // Animation function
  const animate = useCallback((timestamp: DOMHighResTimeStamp) => {
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

    // Draw the wheel
    drawWheel();

    // If animation is complete
    if (progress >= 1) {
      // Stop the animation
      setSpinning(false);
      startTimeRef.current = null;

      // Determine the winning segment
      const winningPrize = getSegmentAtPointer(wheelAngleRef.current);
      setResult(winningPrize);
      
      // Call the onSpinComplete callback
      const spinCompleteResult = onSpinComplete(winningPrize);
      if (spinCompleteResult && typeof spinCompleteResult.catch === 'function') {
        spinCompleteResult.catch((error: Error) => {
          console.error('Error in onSpinComplete:', error);
          onError?.('Failed to process your prize. Please try again.');
        });
      }

      // Cancel the animation frame
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    } else {
      // Continue the animation
      const nextFrame = requestAnimationFrame(animate);
      animationRef.current = nextFrame;
    }
  }, [drawWheel, getSegmentAtPointer, onSpinComplete, onError]);

  // Handle spin
  const spinWheel = useCallback(() => {
    if (!spinning) {
      setSpinning(true);
      onSpinStart?.();
      setResult(null);
      // Add a random initial rotation to make each spin feel unique
      wheelAngleRef.current = Math.random() * 2 * Math.PI;
      
      // Start the animation
      startTimeRef.current = null;
      const frame = requestAnimationFrame(animate);
      animationRef.current = frame;
    }
  }, [spinning, onSpinStart, animate]);

  // Handle spinning state changes and cleanup
  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, []);

  // Initialize canvas context and handle window resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Set canvas size
      const container = canvas.parentElement;
      if (container) {
        const size = Math.min(container.clientWidth, container.clientHeight);
        canvas.width = size;
        canvas.height = size;
      }
      
      // Initialize context
      const context = canvas.getContext('2d');
      if (!context) {
        setError('Could not initialize canvas context');
        return;
      }
      
      // Initial draw
      drawWheel();
    }
    
    // Handle window resize
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const container = canvas.parentElement;
        if (container) {
          const size = Math.min(container.clientWidth, container.clientHeight);
          canvas.width = size;
          canvas.height = size;
          drawWheel();
        }
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawWheel]);



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
      
      {!spinning && !result && (
        <button
          onClick={spinWheel}
          disabled={loading || !!error}
          className="w-full h-12 bg-[#418FDE] hover:bg-[#2e7bc4] rounded-[5px] text-white font-medium text-base transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Loading...' : error ? 'Error Loading Prizes' : 'Spin the Wheel!'}
        </button>
      )}
      
      {spinning && <div className="text-lg font-semibold">Spinning...</div>}
 
      
      {error && !spinning && (
        <div className="text-red-500 text-center">{error}</div>
      )}
    </div>
  );
}
