"use client"

import { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { type Prize } from "@/constants/prizes";
import { supabase } from '@/lib/supabase';

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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const spinDurationRef = useRef<number>(5000); // 5 seconds
  const hasStartedSpinRef = useRef(false);
  
  interface WheelAngleRef {
    currentAngle: number;
    finalAngle?: number;
    targetPrize?: Prize | null;
  }
  
  const wheelAngleRef = useRef<WheelAngleRef>({ currentAngle: 0 });

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
        
        // Then load available prizes (with stock > 0) for the actual spinning
        const { data: availablePrizes, error: availableError } = await supabase
          .from('prizes')
          .select('*')
          .gt('stock', 0)
          .order('id', { ascending: true });

        if (availableError) throw availableError;
        
        // Use all prizes for the wheel display
        const prizesWithPosition = allPrizes.map((prize, index) => ({
          id: prize.id,
          name: prize.name,
          displayText: prize.display_text || prize.name, // Use display_text from DB or fallback to name
          color: prize.color || '#9cf7f7', // Default color if not specified
          textColor: '#000000', // Default text color
          weight: 100, // Default weight
          stock: prize.stock,
          wheelPosition: (index * (2 * Math.PI)) / allPrizes.length,
          // Mark if the prize is out of stock
          isOutOfStock: !availablePrizes.some(p => p.id === prize.id)
        }));
        
        setAvailablePrizes(prizesWithPosition);
      } catch (err) {
        console.error('Error loading prizes:', err);
        onError?.('Failed to load prizes. Please try again later.');
      }
    };

    loadPrizes();
  }, [onError]);

  // Draw the wheel
  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !availablePrizes.length) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw segments
    const segmentAngle = (2 * Math.PI) / availablePrizes.length;
    availablePrizes.forEach((prize, index) => {
      const startAngle = (index * segmentAngle) + (wheelAngleRef.current?.currentAngle || 0);
      const endAngle = startAngle + segmentAngle;
      
      // Draw segment
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      
      // Style segment - use gray for out-of-stock prizes
      const isOutOfStock = prize.isOutOfStock || (prize.stock !== undefined && prize.stock <= 0);
      
      // Use the color from the prize or a default
      let segmentColor = prize.color || (index % 2 === 0 ? '#FF6B6B' : '#4ECDC4');
      
      // if (isOutOfStock) {
      //   // Desaturate and lighten the color for out-of-stock items
      //   segmentColor = '#CCCCCC';
      // }
      
      ctx.fillStyle = segmentColor;
      ctx.fill();
      
      // Add stroke between segments
      // ctx.strokeStyle = '#FFFFFF';
      // ctx.lineWidth = 2;
      // ctx.stroke();
      
      // Add text
      const textRadius = radius * 0.6;
      const textAngle = startAngle + (segmentAngle / 2);
      const textX = centerX + Math.cos(textAngle) * textRadius;
      const textY = centerY + Math.sin(textAngle) * textRadius;
      
      ctx.save();
      ctx.translate(textX, textY);
      ctx.rotate(textAngle + Math.PI);
      
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Use textColor from prize or default to white/black based on background
      const textColor = '#FFFFFF'
      // (prize.textColor || (index % 2 === 0 ? '#FFFFFF' : '#FFFFFF'));
      
      ctx.fillStyle = textColor;
      ctx.font = 'bold 15px Arial';
      
      // Use displayText instead of name for the wheel
      const displayText = prize.displayText || prize.name;
      ctx.fillText(displayText, 0, 0);
      
      ctx.restore();
    });

    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 15, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    
    ctx.lineWidth = 1.1;  
    ctx.strokeStyle = '#EFEFEF';
    ctx.shadowColor = '#EFEFEF';
    


    

    ctx.fill();
    ctx.stroke();
  }, [availablePrizes]);

  // Start spinning when assignedPrize is set
  useEffect(() => {
    console.log('Start Wheel useEffect');
    console.log('Assigned prize:', assignedPrize);
    if (!assignedPrize || hasStartedSpinRef.current) return;

    console.log('Starting wheel spin to prize:', assignedPrize);
    
    // Reset animation state
    hasStartedSpinRef.current = true;
    setSpinning(true);
    
    // Calculate segment and prize position
    const segmentAngle = (2 * Math.PI) / availablePrizes.length;
    const prizeIndex = availablePrizes.findIndex(p => p.id === assignedPrize.id);
    
    if (prizeIndex === -1) {
      console.error('Prize not found in available prizes');
      return;
    }
    
    // Calculate the center angle of the target prize segment
    const targetPrizeAngle = (prizeIndex * segmentAngle) + (segmentAngle / 2);
    
    // Calculate the angle needed to rotate the prize to the top (12 o'clock)
    // We want to rotate the wheel such that the target prize ends up at -90° (12 o'clock)
    const rotationToTop = (2 * Math.PI) - targetPrizeAngle - (Math.PI / 2);
    
    // Add full rotations for a nice spin effect
    const fullRotations = 5;
    const startAngle = wheelAngleRef.current?.currentAngle || 0;
    const endAngle = startAngle + (2 * Math.PI * fullRotations) + rotationToTop;
    
    // Debug information
    const debugMsg = `Spinning to prize: ${assignedPrize.name}\n` +
                   `Prize Index: ${prizeIndex}\n` +
                   `Segment Angle: ${(segmentAngle * 180/Math.PI).toFixed(2)}°\n` +
                   `Target Prize Angle: ${(targetPrizeAngle * 180/Math.PI).toFixed(2)}°\n` +
                   `Rotation to Top: ${(rotationToTop * 180/Math.PI).toFixed(2)}°\n` +
                   `End Angle: ${(endAngle * 180/Math.PI).toFixed(2)}°`;
    
    setDebugInfo(debugMsg);
    console.log(debugMsg);
    
    hasStartedSpinRef.current = true;
    setSpinning(true);
    
    const startTime = performance.now();
    console.log('Starting animation with endAngle:', endAngle, `(${(endAngle * 180/Math.PI).toFixed(2)}°)`);
    
    // Animation loop
    const animate = (timestamp: DOMHighResTimeStamp) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
        const frame = requestAnimationFrame(animate);
        animationRef.current = frame;
        return;
      }
      
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / spinDurationRef.current, 1);
      
      // Easing function for smooth deceleration
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      
      // Calculate current angle with easing
      const currentAngle = startAngle + ((endAngle - startAngle) * easeOutCubic);
      
      // Update the wheel angle
      if (wheelAngleRef.current) {
        wheelAngleRef.current.currentAngle = currentAngle % (2 * Math.PI);
        wheelAngleRef.current.finalAngle = endAngle;
        wheelAngleRef.current.targetPrize = assignedPrize;
      }
      
      // Redraw the wheel
      console.log('Redrawing wheel...');
      drawWheel();
      console.log('Wheel redrawn');
      
      // Continue animation if not complete
      if (progress < 1) {
        console.log('Animation not complete, progress:', progress);
        const frame = requestAnimationFrame(animate);
        animationRef.current = frame;
      } else {
        // Animation complete
        console.log('Animation complete');
        setSpinning(false);
        
        // Call the onSpinComplete callback with the assigned prize
        if (assignedPrize) {
          console.log('Calling onSpinComplete with prize:', assignedPrize);
          onSpinComplete?.(assignedPrize);
        }
        
        // Reset for next spin after a delay
        // setTimeout(() => {
        //   if (wheelAngleRef.current) {
        //     wheelAngleRef.current.finalAngle = undefined;
        //     wheelAngleRef.current.targetPrize = undefined;
        //   }
        //   hasStartedSpinRef.current = false;
          
        //   // Force a redraw to ensure final position is correct
        //   drawWheel();
        // }, 1000);
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
      startTimeRef.current = null;
    };
  }, [assignedPrize, availablePrizes, drawWheel, onSpinComplete]);

  // Handle spin button click
  const handleSpin = useCallback(async () => {
    if (spinning || loading || !availablePrizes.length) return;

    try {
      onSpinStart?.();
      setLoading(true);
      setError(null);
      
      // Reset animation state
      hasStartedSpinRef.current = false;
      
      // Get attendee ID from localStorage
      const attendeeData = localStorage.getItem('attendeeId');
      if (!attendeeData) {
        throw new Error('No attendee data found');
      }
      
      const attendeeId = JSON.parse(attendeeData);
      if (!attendeeId) {
        throw new Error('Invalid attendee data');
      }
      
      // Call API to assign a prize
      const response = await fetch('/api/assign-and-spin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendeeId,
          eventId: 1
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // Special handling for no prizes available
        if (response.status === 404 && errorData.code === 'NO_PRIZES_AVAILABLE') {
          // Trigger fallback modal
          onSpinComplete?.(null);
          setLoading(false);
          return;
        }
        throw new Error(errorData.error || 'Failed to assign prize');
      }
      
      const data = await response.json();
    
      console.log('API Response:', data);
      
      // Find the matching prize from availablePrizes to ensure we have all properties
      const prize = availablePrizes.find(p => p.id === data?.id);

      if (!prize) {
        throw new Error('Prize not found in available prizes');
      }
      
      console.log('Setting prize:', prize);
      
      // Reset the wheel angle to ensure clean spin
      if (wheelAngleRef.current) {
        wheelAngleRef.current.currentAngle = 0;
      }
      
      // Set the assigned prize to trigger the animation
      setAssignedPrize(prize);
    } catch (err) {
      console.error('Error spinning wheel:', err);
      onError?.(err instanceof Error ? err.message : 'Failed to spin wheel. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [spinning, loading, availablePrizes, onSpinStart, onError]);

  // Test spin function
  const handleTestSpin = () => {
    if (availablePrizes.length > 0) {
      const randomIndex = Math.floor(Math.random() * availablePrizes.length);
      console.log('Random index:', randomIndex);
      console.log('Available prizes:', availablePrizes);
      console.log('Selected prize:', availablePrizes[randomIndex]);
      setAssignedPrize(availablePrizes[randomIndex]);
    }
  };

  // Redraw wheel when needed
  useEffect(() => {
    if (availablePrizes.length > 0) {
      drawWheel();
    }
  }, [availablePrizes, drawWheel]);

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      <div className="relative w-full max-w-xs mx-auto">
        <canvas 
          ref={canvasRef}
          width={300}
          height={300}
          className="w-full aspect-square rounded-full shadow-[0_0_2px_0_rgba(0,0,0,1)] relative z-0"
        />
        {/* Center pointer */}
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 w-16 h-16 flex justify-center items-start">
          <div className="relative drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]">
            {/* Outer (border) triangle */}
            <div className="absolute -top-[2px] -left-[2px] w-0 h-0 border-l-[19px] border-r-[19px] border-t-[32px] border-l-transparent border-r-transparent border-t-[#042841]" />
            {/* Inner (main) triangle */}
            <div className="absolute -top-[2px] -left-[2px] w-0 h-0 border-l-[19px] border-r-[19px] border-t-[32px] border-l-transparent border-r-transparent border-t-[#042841]" />
            <div className="w-0 h-0 border-l-[16px] border-r-[16px] border-t-[26px] border-l-transparent border-r-transparent border-t-[#002137]" />
          </div>
        </div>
      </div>
      
      <Button
        onClick={handleSpin}
        disabled={spinning || loading}
        className={`w-full py-3 rounded-md text-white font-regular mt-4 ${spinning || loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#418fde] hover:bg-[#3177c2]'}`}
      >
        {spinning || loading ? 'Spinning...' : 'Spin the Wheel!'}
      </Button>
      
      {/* Debug Info */}
      {/* <div className="mt-6 p-4 bg-gray-100 rounded-lg w-full max-w-xs">
        <h3 className="font-bold mb-2 text-gray-800">Debug Info:</h3>
        <pre className="text-xs whitespace-pre-wrap bg-white p-2 rounded">
          {debugInfo || 'No debug information available'}
        </pre>
        
        {wheelAngleRef.current?.currentAngle !== undefined && (
          <div className="mt-2 text-sm text-gray-700">
            Current Angle: {(wheelAngleRef.current.currentAngle * 180 / Math.PI).toFixed(2)}°
          </div>
        )}
        
        {testMode && (
          <button
            onClick={handleTestSpin}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-medium"
            disabled={spinning}
          >
            Test Spin (Random Prize)
          </button>
        )}
      </div> */}
      
      {error && (
        <div className="mt-4 p-2 bg-red-100 text-red-700 rounded text-center">
          {error}
        </div>
      )}
    </div>
  );
}
