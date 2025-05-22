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
  const [rotation, setRotation] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const spinDuration = 5000; // 5 seconds

  // Fetch available prizes from the database
  useEffect(() => {
    const fetchPrizes = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('prizes')
          .select('*')
          .gt('stock', 0);

        console.log('prizes', data);

        if (error) throw error;
        
        if (data && data.length > 0) {
          setAvailablePrizes(data);
        } else {
          setError('No prizes available');
        }
      } catch (err) {
        console.error('Error fetching prizes:', err);
        setError('Failed to load prizes');
        onError?.('Failed to load prizes. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPrizes();
  }, [onError]);

  // Draw the wheel
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

    // Draw segments
    let startAngle = 0;
    availablePrizes.forEach((prize) => {
      const segmentAngle = (prize.weight / totalWeight) * Math.PI * 2;
      const endAngle = startAngle + segmentAngle;

      // Draw segment
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = prize.color;
      ctx.fill();

      // Draw border
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + segmentAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px Arial';
      ctx.fillText(prize.name, radius - 20, 5);
      ctx.restore();

      startAngle = endAngle;
    });

    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [availablePrizes]);

  // Animation frame
  const animate = useCallback((timestamp: number) => {
    if (!startTimeRef.current) {
      startTimeRef.current = timestamp;
    }

    const elapsed = timestamp - startTimeRef.current;
    const progress = Math.min(elapsed / spinDuration, 1);
    
    // Easing function (easeOutCubic)
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
    const easedProgress = easeOut(progress);
    
    // Calculate rotation (5 full rotations + random segment)
    const totalRotation = 5 * 360 + (Math.random() * 360);
    const currentRotation = easedProgress * totalRotation;
    
    // Update rotation
    setRotation(currentRotation);
    
    if (progress < 1) {
      // Continue animation
      animationRef.current = requestAnimationFrame(animate);
    } else {
      // Animation complete
      setSpinning(false);
      
      // Determine winner
      const totalWeight = availablePrizes.reduce((sum, p) => sum + p.weight, 0);
      const winningAngle = (currentRotation % 360) * (Math.PI / 180);
      let currentAngle = 0;
      
      for (const prize of availablePrizes) {
        const segmentAngle = (prize.weight / totalWeight) * Math.PI * 2;
        if (winningAngle >= currentAngle && winningAngle < currentAngle + segmentAngle) {
          setResult(prize);
          const spinCompleteResult = onSpinComplete(prize);
          if (spinCompleteResult && typeof spinCompleteResult.catch === 'function') {
            spinCompleteResult.catch((error: Error) => {
              console.error('Error in onSpinComplete:', error);
              onError?.('Failed to process your prize. Please try again.');
            });
          }
          break;
        }
        currentAngle += segmentAngle;
      }
    }
  }, [availablePrizes, onSpinComplete, onError]);

  // Handle spin
  const handleSpin = useCallback(async () => {
    if (spinning) return;
    
    try {
      // Reset state
      setResult(null);
      setSpinning(true);
      startTimeRef.current = 0;
      
      // Fetch available prizes
      const { data: prizes, error } = await supabase
        .from('prizes')
        .select('*')
        .gt('stock', 0);
      
      if (error) throw error;
      
      // Update available prizes
      if (prizes?.length) {
        const available = PRIZES.filter(p => prizes.some(prize => prize.id === p.id && prize.stock > 0));
        if (!available.length) {
          throw new Error('No prizes available');
        }
        setAvailablePrizes(available);
      }
      
      // Start animation
      animationRef.current = requestAnimationFrame(animate);
      
    } catch (error) {
      console.error('Error spinning wheel:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to spin the wheel');
      setSpinning(false);
    }
  }, [spinning, animate, onError]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Handle window resize and initial draw
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        // Set canvas size to match parent container
        const container = canvas.parentElement;
        if (container) {
          const size = Math.min(container.clientWidth, container.clientHeight);
          canvas.width = size;
          canvas.height = size;
        }
        drawWheel();
      }
    };

    // Initial setup
    handleResize();
    
    // Add event listener for window resize
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawWheel]);

  // Initial draw when prizes are loaded
  useEffect(() => {
    if (availablePrizes.length > 0) {
      drawWheel();
    }
  }, [availablePrizes, drawWheel]);

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
    <div className="relative w-full max-w-md mx-auto">
      <div className="relative" style={{ width: '100%', paddingBottom: '100%' }}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? 'transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
          }}
        />
      </div>
      <div className="mt-8 text-center">
        {result ? (
          <div className="mb-4">
            <p className="text-xl font-bold">Congratulations! You won:</p>
            <p className="text-2xl text-primary">{result.name}</p>
          </div>
        ) : (
          <Button
            onClick={handleSpin}
            disabled={spinning || availablePrizes.length === 0}
            className="px-8 py-6 text-lg"
          >
            {spinning ? 'Spinning...' : 'Spin the Wheel'}
          </Button>
        )}
      </div>
    </div>
  );
}
