"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"


interface WheelSegment {
  text: string
  color: string
  textColor: string
  weight: number // Represents the relative size of the segment
}

export default function WheelPicker() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const wheelAngleRef = useRef<number>(0)
  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const spinDurationRef = useRef<number>(10000) // 10 seconds in milliseconds
  const [canvasSize] = useState({ width: 400, height: 400 })
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null)

  // Define the wheel segments with brand-matching colors
  const segments = useMemo<WheelSegment[]>(() => [
    // Alternating pattern of prizes
    { text: "T-Shirt", color: "#4A90E2", textColor: "#FFFFFF", weight: 50 },
    { text: "ItchGuard", color: "#F7D046", textColor: "#000000", weight: 16.66 },
    { text: "Dog Bowl", color: "#6B7A8F", textColor: "#FFFFFF", weight: 50 },
    { text: "GutShield", color: "#009245", textColor: "#FFFFFF", weight: 16.67 },
    { text: "T-Shirt", color: "#4A90E2", textColor: "#FFFFFF", weight: 50 },
    { text: "ItchGuard", color: "#F7D046", textColor: "#000000", weight: 16.67 },
    { text: "Dog Bowl", color: "#6B7A8F", textColor: "#FFFFFF", weight: 50 },
    { text: "Gut Test", color: "#E6EEF4", textColor: "#009245", weight: 10 },
    { text: "T-Shirt", color: "#4A90E2", textColor: "#FFFFFF", weight: 50 },
    { text: "GutShield", color: "#009245", textColor: "#FFFFFF", weight: 16.67 },
    { text: "Dog Bowl", color: "#6B7A8F", textColor: "#FFFFFF", weight: 50 },
    { text: "ItchGuard", color: "#F7D046", textColor: "#000000", weight: 16.67 },
    { text: "T-Shirt", color: "#4A90E2", textColor: "#FFFFFF", weight: 50 },
    { text: "GutShield", color: "#009245", textColor: "#FFFFFF", weight: 16.66 },
    { text: "Dog Bowl", color: "#6B7A8F", textColor: "#FFFFFF", weight: 50 },
    { text: "Gut Test", color: "#E6EEF4", textColor: "#009245", weight: 10 }
  ], [])

  // Calculate total weight for angle calculations
  const totalWeight = segments.reduce((sum, segment) => sum + segment.weight, 0)

  // Function to determine which segment is at the pointer
  const getSegmentAtPointer = useCallback((wheelAngle: number) => {
    // Calculate segment angles and boundaries
    let segmentStart = 0

    for (let i = 0; i < segments.length; i++) {
      const segmentAngle = (segments[i].weight / totalWeight) * (2 * Math.PI)
      const segmentEnd = segmentStart + segmentAngle

      // Normalize the wheel angle to 0-2π
      let normalizedWheelAngle = wheelAngle % (2 * Math.PI)
      if (normalizedWheelAngle < 0) normalizedWheelAngle += 2 * Math.PI

      // The pointer is at 3π/2 (270 degrees), so we need to check which segment contains that position
      // relative to the current wheel rotation
      let pointerPosition = ((3 * Math.PI) / 2 - normalizedWheelAngle) % (2 * Math.PI)
      if (pointerPosition < 0) pointerPosition += 2 * Math.PI

      // Check if the pointer position is within this segment
      if (pointerPosition >= segmentStart && pointerPosition < segmentEnd) {
        return segments[i].text
      }

      segmentStart = segmentEnd
    }

    // Default to the first segment if something goes wrong
    return segments[0].text
  }, [segments, totalWeight])

  // Initialize canvas context
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      const context = canvas.getContext("2d", { willReadFrequently: true })
      setCtx(context)
      wheelAngleRef.current = 0 // Initialize wheel angle
    }
  }, [])

  // Draw the wheel with weighted segments
  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !ctx) return

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = Math.min(centerX, centerY) - 10

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw segments with variable sizes based on weights
    let startAngle = wheelAngleRef.current

    segments.forEach((segment) => {
      // Calculate segment angle based on weight
      const segmentAngle = (segment.weight / totalWeight) * (2 * Math.PI)
      const endAngle = startAngle + segmentAngle

      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, startAngle, endAngle)
      ctx.closePath()

      ctx.fillStyle = segment.color
      ctx.fill()

      // Draw text
      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate(startAngle + segmentAngle / 2)
      ctx.textAlign = "right"
      ctx.textBaseline = "middle"

      // Adjust font size based on segment size
      const fontSize = Math.min(18, Math.max(12, (15 * segmentAngle) / (Math.PI / 4)))
      ctx.font = `bold ${fontSize}px Arial`

      ctx.fillStyle = segment.textColor
      // Position text at 75% of radius from center
      const textRadius = radius * 0.75

      // For smaller segments, we might need to adjust text or use abbreviations
      let displayText = segment.text
      if (segmentAngle < 0.2 && segment.text.length > 10) {
        displayText = segment.text.substring(0, 10) + "..."
      }

      ctx.fillText(displayText, textRadius, 0)
      ctx.restore()

      // Update start angle for next segment
      startAngle = endAngle
    })

    // Draw center circle
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius * 0.15, 0, 2 * Math.PI)
    ctx.fillStyle = "#1E3A8A" // Dark blue for center
    ctx.fill()

    // Draw "SPIN" text in center
    ctx.font = "bold 16px Arial"
    ctx.fillStyle = "#FFFFFF"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("", centerX, centerY)

    // Draw pointer
    ctx.beginPath()
    ctx.moveTo(centerX, centerY - radius + 15) // Point toward wheel (inward)
    ctx.lineTo(centerX - 10, centerY - radius - 5) // Left corner (outward)
    ctx.lineTo(centerX + 10, centerY - radius - 5) // Right corner (outward)
    ctx.closePath()
    ctx.fillStyle = "#1E3A8A" // Dark blue for pointer
    ctx.fill()
    ctx.strokeStyle = "#FFFFFF"
    ctx.lineWidth = 1
    ctx.stroke()

    // Add a small circle at the base of the pointer for better appearance
    // ctx.beginPath()
    // ctx.arc(centerX, centerY - radius, 5, 0, 2 * Math.PI)
    // ctx.fillStyle = "#1E3A8A"
    // ctx.fill()
    // ctx.strokeStyle = "#FFFFFF"
    // ctx.lineWidth = 1
    // ctx.stroke()
  }, [segments, totalWeight, ctx])

  // Animation function
  const animate = useCallback((timestamp: DOMHighResTimeStamp) => {
    if (!startTimeRef.current) {
      startTimeRef.current = timestamp
    }

    const elapsed = timestamp - startTimeRef.current
    const progress = Math.min(elapsed / spinDurationRef.current, 1)

    // Easing function for natural deceleration
    const easeOutCubic = 1 - Math.pow(1 - progress, 3)

    // Calculate current speed based on progress
    const initialSpeed = 0.3
    const currentSpeed = initialSpeed * (1 - easeOutCubic)

    // Update wheel angle
    const currentAngle = wheelAngleRef.current
    wheelAngleRef.current = (currentAngle + currentSpeed) % (2 * Math.PI)

    // Draw the wheel
    drawWheel()

    // If animation is complete
    if (progress >= 1) {
      // Stop the animation
      setSpinning(false)
      startTimeRef.current = null

      // Determine the winning segment
      const winningPrize = getSegmentAtPointer(wheelAngleRef.current)
      setResult(winningPrize)

      // Cancel the animation frame
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    } else {
      // Continue the animation
      const nextFrame = requestAnimationFrame(animate)
      animationRef.current = nextFrame
    }
  }, [drawWheel, getSegmentAtPointer])

  // Initialize the wheel
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas && ctx) {
      // Set canvas size
      canvas.width = canvasSize.width
      canvas.height = canvasSize.height

      // Initial draw
      drawWheel()
    }

    // Cleanup
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
  }, [canvasSize, drawWheel, ctx])

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
            className="max-w-full h-auto"
            style={{ maxWidth: '400px' }}
          />
        </div>

        {result && (
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">
              You won: <span className="text-blue-600">{result}</span>!
            </h2>
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
