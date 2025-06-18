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
  const loggedSkipMessageRef = useRef<number | null>(null);

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

  // Store animation data in a ref to make it resilient to Fast Refresh
  const animationDataRef = useRef({
    isAnimating: false,
    startTime: 0,
    startAngle: 0,
    endAngle: 0,
    targetPrize: null as Prize | null,
    prizeId: "", // Changed from number to string to match our other refs
    duration: 4000
  });

  // Use a ref to track which prizes have been animated
  // This persists across renders and React's StrictMode double-invocations
  const processedPrizesRef = useRef<Set<string>>(new Set());
  
  // Start spinning when assignedPrize is set
  useEffect(() => {
    // Skip the effect entirely if there's no prize assigned
    if (!assignedPrize) return;
    
    // Store the prize ID to detect duplicate triggers
    const currentPrizeId = String(assignedPrize.id);
    
    // Create a unique identifier for this specific animation instance
    // This helps distinguish between different animations for the same prize
    // (e.g., if the same prize is assigned again after an error)
    const animationInstanceId = `${currentPrizeId}-${Date.now()}`;
    
    // Check if we've already processed this exact prize assignment
    // This is the key check that prevents duplicate animations
    if (processedPrizesRef.current.has(animationInstanceId)) {
      console.log('This exact animation instance has already been processed, skipping');
      return;
    }
    
    // Check if any animation is currently in progress for this prize
    if (animationDataRef.current.isAnimating && animationDataRef.current.prizeId === currentPrizeId) {
      console.log('Animation already in progress for this prize, skipping');
      return;
    }
    
    // Add this animation instance to our processed set
    // We'll remove it once the animation completes or if there's an error
    processedPrizesRef.current.add(animationInstanceId);
    
    console.log('Starting new animation for prize:', assignedPrize.name, '(ID:', currentPrizeId, ')');

    console.log('Starting wheel spin to prize:', assignedPrize);
    
    // Reset animation state
    hasStartedSpinRef.current = true;
    setSpinning(true);
    
    // Calculate segment and prize position
    const segmentAngle = (2 * Math.PI) / availablePrizes.length;
    const prizeIndex = availablePrizes.findIndex(p => p.id === assignedPrize.id);
    
    if (prizeIndex === -1) {
      console.error('Prize not found in available prizes');
      hasStartedSpinRef.current = false;
      setSpinning(false);
      return;
    }
    
    // Calculate the center angle of the target prize segment
    const targetPrizeAngle = (prizeIndex * segmentAngle) + (segmentAngle / 2);
    
    // Calculate the angle needed to rotate the prize to the top (12 o'clock)
    // We want to rotate the wheel such that the target prize ends up at -90° (12 o'clock)
    const rotationToTop = (2 * Math.PI) - targetPrizeAngle - (Math.PI / 2);
    
    // Add full rotations for a nice spin effect - fewer rotations for better performance
    const fullRotations = 4;
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
    
    // Ensure we're not in the middle of another animation
    if (animationRef.current) {
      window.cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // Store animation data in ref to make it resilient to Fast Refresh
    animationDataRef.current = {
      isAnimating: true,
      startTime: 0,
      startAngle,
      endAngle,
      targetPrize: assignedPrize,
      prizeId: currentPrizeId, // currentPrizeId is already a string now
      duration: 4000 // 4 seconds
    };
    
    console.log('Starting animation with endAngle:', endAngle, `(${(endAngle * 180/Math.PI).toFixed(2)}°)`);
    
    // Animation loop with simplified timing that's resilient to Fast Refresh
    function animate(timestamp: number) {
      try {
        // If component was hot-reloaded, animation data will persist in the ref
        const animData = animationDataRef.current;
        
        // Safety check - if animation is not active, exit early
        if (!animData || !animData.isAnimating) {
          console.log('Animation not active, exiting animation loop');
          return;
        }
        
        // Initialize start time on first frame
        if (animData.startTime === 0) {
          animData.startTime = timestamp;
          console.log('Animation started at timestamp:', timestamp);
        }
        
        // Safety check for extremely long animations (over 10 seconds)
        const elapsed = timestamp - animData.startTime;
        if (elapsed > 10000) {
          console.warn('Animation taking too long (>10s), forcing completion');
          completeAnimation(animData);
          return;
        }
        
        const progress = Math.min(elapsed / animData.duration, 1);
        
        // Easing function for smooth deceleration
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        
        // Calculate current angle with easing
        const currentAngle = animData.startAngle + 
                           ((animData.endAngle - animData.startAngle) * easeOutCubic);
        
        // Update the wheel angle
        if (wheelAngleRef.current) {
          wheelAngleRef.current.currentAngle = currentAngle % (2 * Math.PI);
        }
        
        // Redraw the wheel
        drawWheel();
        
        // Continue animation if not complete
        if (progress < 1) {
          // Safety check - ensure we're not creating multiple animation frames
          if (animationRef.current) {
            window.cancelAnimationFrame(animationRef.current);
          }
          animationRef.current = window.requestAnimationFrame(animate);
        } else {
          // Animation complete
          console.log('Animation complete normally');
          completeAnimation(animData);
        }
      } catch (err) {
        // Error recovery
        console.error('Error in animation loop:', err);
        const animData = animationDataRef.current;
        if (animData) {
          completeAnimation(animData);
        }
      }
    }
    
    // Helper function to complete animation and clean up
    function completeAnimation(animData: typeof animationDataRef.current) {
      try {
        // Ensure we're at the exact final position
        if (wheelAngleRef.current) {
          wheelAngleRef.current.currentAngle = animData.endAngle % (2 * Math.PI);
        }
        drawWheel();
        
        // Complete the spin process
        animData.isAnimating = false;
        setSpinning(false);
        
        // Call the onSpinComplete callback with the assigned prize
        if (animData.targetPrize) {
          console.log('Calling onSpinComplete with prize:', animData.targetPrize);
          onSpinComplete?.(animData.targetPrize);
        }
        
        // Reset animation frame reference
        if (animationRef.current) {
          window.cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
        
        // Reset for next spin with a short delay
        setTimeout(() => {
          hasStartedSpinRef.current = false;
          
          // Clear all processed animations for this prize to allow future animations
          if (animData.targetPrize) {
            const prizeId = String(animData.targetPrize.id);
            
            // Remove all processed animations for this prize
            // This allows the prize to be animated again if needed
            const keysToRemove: string[] = [];
            processedPrizesRef.current.forEach(key => {
              if (key.startsWith(`${prizeId}-`)) {
                keysToRemove.push(key);
              }
            });
            
            keysToRemove.forEach(key => {
              processedPrizesRef.current.delete(key);
            });
          }
          
          setAssignedPrize(null);
        }, 100);
      } catch (err) {
        console.error('Error completing animation:', err);
        // Last resort cleanup
        hasStartedSpinRef.current = false;
        animData.isAnimating = false;
        setSpinning(false);
      }
    }
    
    // Start the animation with explicit window reference
    animationRef.current = window.requestAnimationFrame(animate);
    
    // Add a fallback timer to ensure animation completes even if requestAnimationFrame silently fails
    const fallbackTimer = setTimeout(() => {
      if (animationDataRef.current.isAnimating) {
        console.warn('[WHEEL-DEBUG] Fallback timeout hit, forcing completion');
        completeAnimation(animationDataRef.current);
      }
    }, 10000); // 10 seconds fallback
    
    // Clean up on unmount or when assignedPrize changes
    return () => {
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      // Clear the fallback timer
      clearTimeout(fallbackTimer);
      
      // Don't reset animation data on cleanup to make it resilient to Fast Refresh
      // Only reset if we're not in the middle of an animation
      if (!animationDataRef.current.isAnimating) {
        startTimeRef.current = null;
      }
    };
  // Using a stable reference to assignedPrize.id instead of the entire object
  // to prevent unnecessary effect reruns
  }, [assignedPrize?.id, availablePrizes, drawWheel, onSpinComplete]);



  // Handle spin button click
  const handleSpin = useCallback(async () => {
    // Prevent multiple spins or spinning when no prizes available
    if (spinning || loading || !availablePrizes.length) return;

    try {
      console.log('Starting spin process');
      onSpinStart?.();
      setLoading(true);
      setError(null);
      
      // Cancel any existing animation
      if (animationRef.current) {
        console.log('Cancelling existing animation');
        window.cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      
      // Reset animation state completely
      hasStartedSpinRef.current = false;
      startTimeRef.current = null;
      
      // Reset animation data
      animationDataRef.current = {
        isAnimating: false,
        startTime: 0,
        startAngle: 0,
        endAngle: 0,
        targetPrize: null,
        prizeId: "", // Using empty string instead of -1 to match our string type
        duration: 4000
      };
      
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
      
      // Find the matching prize from availablePrizes to ensure we have all properties
      const prize = availablePrizes.find(p => p.id === data?.id);

      if (!prize) {
        console.error('Prize not found in available prizes. API returned:', data);
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
      
      // Reset animation state on error
      hasStartedSpinRef.current = false;
      if (animationDataRef.current) {
        animationDataRef.current.isAnimating = false;
      }
      
      // Cancel any animation frames that might be running
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    } finally {
      setLoading(false);
    }
  }, [spinning, loading, availablePrizes, onSpinStart, onSpinComplete, onError]);




  // Test spin function
  const handleTestSpin = () => {
    if (spinning || loading || !availablePrizes.length) return;
    
    try {
      // Cancel any existing animation
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      
      // Reset animation state
      hasStartedSpinRef.current = false;
      startTimeRef.current = null;
      animationDataRef.current.isAnimating = false;
      
      const randomIndex = Math.floor(Math.random() * availablePrizes.length);
      console.log('Random index:', randomIndex);
      console.log('Available prizes:', availablePrizes);
      console.log('Selected prize:', availablePrizes[randomIndex]);
      
      // Reset the wheel angle to ensure clean spin
      if (wheelAngleRef.current) {
        wheelAngleRef.current.currentAngle = 0;
      }
      
      // Set the assigned prize to trigger the animation
      setAssignedPrize(availablePrizes[randomIndex]);
    } catch (err) {
      console.error('Error in test spin:', err);
      hasStartedSpinRef.current = false;
      animationDataRef.current.isAnimating = false;
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
