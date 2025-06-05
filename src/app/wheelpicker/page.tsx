"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { PRIZES, type Prize } from "@/constants/prizes"

interface WheelSegment extends Prize {}

export default function WheelPicker() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<Prize | null>(null)
  const wheelAngleRef = useRef<number>(0)
  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const spinDurationRef = useRef<number>(10000)
  const [canvasSize] = useState({ width: 400, height: 400 })
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)

  // Calculate total weight for angle calculations
  const totalWeight = PRIZES.reduce((sum, segment) => sum + segment.weight, 0)

  // Initialize canvas context
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      canvas.width = canvasSize.width
      canvas.height = canvasSize.height
      const context = canvas.getContext("2d")
      if (!context) {
        setError("Could not initialize canvas context")
        return
      }
      setCtx(context)
      wheelAngleRef.current = 0
    }
  }, [canvasSize])

  // Add a mounted ref to prevent memory leaks
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Function to determine which segment is at the pointer
  const getSegmentAtPointer = useCallback((wheelAngle: number) => {
    let segmentStart = 0

    for (let i = 0; i < PRIZES.length; i++) {
      const segmentAngle = (PRIZES[i].weight / totalWeight) * (2 * Math.PI)
      const segmentEnd = segmentStart + segmentAngle

      let normalizedWheelAngle = wheelAngle % (2 * Math.PI)
      if (normalizedWheelAngle < 0) normalizedWheelAngle += 2 * Math.PI

      let pointerPosition = ((3 * Math.PI) / 2 - normalizedWheelAngle) % (2 * Math.PI)
      if (pointerPosition < 0) pointerPosition += 2 * Math.PI

      if (pointerPosition >= segmentStart && pointerPosition < segmentEnd) {
        return PRIZES[i]
      }

      segmentStart = segmentEnd
    }

    return PRIZES[0]
  }, [totalWeight])

  // Draw the wheel with weighted segments
  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !ctx) {
      setError("Canvas or context not available")
      return
    }

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = Math.min(centerX, centerY) - 10

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw segments with variable sizes based on weights
    let startAngle = wheelAngleRef.current

    PRIZES.forEach((segment) => {
      const segmentAngle = (segment.weight / totalWeight) * (2 * Math.PI)
      const endAngle = startAngle + segmentAngle

      // Draw segment background
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, startAngle, endAngle)
      ctx.closePath()
      ctx.fillStyle = segment.color
      ctx.fill()
      ctx.strokeStyle = "#FFFFFF"
      ctx.lineWidth = 2
      ctx.stroke()

      startAngle = endAngle
    })

    // Draw center circle
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius * 0.15, 0, 2 * Math.PI)
    ctx.fillStyle = "#1E3A8A"
    ctx.fill()
    ctx.strokeStyle = "#FFFFFF"
    ctx.lineWidth = 2
    ctx.stroke()

    // Draw pointer
    ctx.beginPath()
    ctx.moveTo(centerX, centerY - radius + 15)
    ctx.lineTo(centerX - 10, centerY - radius - 5)
    ctx.lineTo(centerX + 10, centerY - radius - 5)
    ctx.closePath()
    ctx.fillStyle = "#1E3A8A"
    ctx.fill()
    ctx.strokeStyle = "#FFFFFF"
    ctx.lineWidth = 2
    ctx.stroke()
  }, [ctx, totalWeight])

  // Function to claim the prize
  const claimPrize = async (prizeId: number) => {
    try {
      setClaiming(true);
      setClaimError(null);
      
      // Get attendee ID from local storage
      const attendeeId = localStorage.getItem('attendeeId');
      
      if (!attendeeId) {
        const errorMsg = 'No attendee ID found. Please return to the registration page and try again.';
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
      
      console.log('Claiming prize for attendee ID:', { prizeId, attendeeId });
      
      const response = await fetch('/api/assign-prize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prizeId: prizeId.toString(),
          attendeeIdentifier: attendeeId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to claim prize');
      }

      return data;
    } catch (error) {
      console.error('Error claiming prize:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to claim prize';
      setClaimError(errorMessage);
      throw error;
    } finally {
      setClaiming(false);
    }
  };

  // Handle spin completion
  const handleSpinComplete = useCallback(async (winningPrize: Prize) => {
    if (!isMounted.current) return null;
    
    try {
      setResult(winningPrize);
      
      // Check if we have a valid prize
      if (!winningPrize?.id) {
        throw new Error('No valid prize selected');
      }
      
      // Just return the winning prize, don't try to claim it here
      return winningPrize;
      
    } catch (error) {
      console.error('Error in handleSpinComplete:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process prize';
      setClaimError(errorMessage);
      throw error;
    }
  }, []);

  // Animation function
  const animate = useCallback(async (timestamp: DOMHighResTimeStamp) => {
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
      await handleSpinComplete(winningPrize);

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
  }, [drawWheel, getSegmentAtPointer, handleSpinComplete]);

  // Draw wheel when context is ready
  useEffect(() => {
    if (ctx) {
      drawWheel()
    }
  }, [ctx, drawWheel])

  // Handle spinning state changes
  useEffect(() => {
    if (spinning) {
      // Start the animation
      startTimeRef.current = null
      const frame = requestAnimationFrame(animate)
      animationRef.current = frame
    }

    // Cleanup
    return () => {
      if (!spinning && animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
  }, [spinning, animate])

  // Spin the wheel
  const handleSpin = () => {
    if (!spinning) {
      setSpinning(true)
      setResult(null)
      // Add a random initial rotation to make each spin feel unique
      wheelAngleRef.current = Math.random() * 2 * Math.PI
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
        <h1 className="text-3xl font-bold text-center text-gray-900">Prize Wheel</h1>
        
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="max-w-full h-auto border-2 border-gray-200 rounded-full"
            style={{ maxWidth: '400px' }}
          />
          {error && (
            <div className="absolute top-0 left-0 right-0 bg-red-100 text-red-600 p-2 rounded">
              {error}
            </div>
          )}

        </div>

        {result && (
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">
              You won: <span className="text-blue-600">{result.name}!</span>
            </h2>
            {claiming && (
              <p className="text-gray-600 mt-2">Claiming your prize...</p>
            )}
            {claimError && (
              <p className="text-red-600 mt-2">
                {claimError} <button 
                  onClick={() => handleSpin()} 
                  className="text-blue-600 underline"
                >
                  Try again
                </button>
              </p>
            )}
          </div>
        )}

        <div className="flex justify-center">
          <Button
            onClick={handleSpin}
            disabled={spinning}
            size="lg"
            variant="primary"
            className="w-full max-w-xs bg-[#1E3A8A] text-white hover:bg-[#2B4BA8]"
          >
            {spinning ? 'Spinning...' : 'Spin the Wheel!'}
          </Button>
        </div>
      </div>
    </div>
  )
}
