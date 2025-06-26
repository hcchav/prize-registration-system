// Debug utilities for wheel testing

/**
 * Monitors the wheel animation state and detects when it gets stuck
 */
export class WheelAnimationMonitor {
  private startTime: number | null = null;
  private spinningState = false;
  private timeoutId: NodeJS.Timeout | null = null;
  private stuckTimeoutId: NodeJS.Timeout | null = null;
  private animationFrameCount = 0;
  private lastAnimationFrameTime = 0;
  private stuckThreshold = 500; // ms without animation frames before considered stuck
  
  constructor(
    private onStuck: (details: { 
      duration: number, 
      frameCount: number,
      lastFrameTime: number 
    }) => void,
    private stuckDetectionDelay = 2000 // Wait 2s before starting stuck detection
  ) {}

  /**
   * Start monitoring the wheel animation
   */
  public startMonitoring(): void {
    this.startTime = Date.now();
    this.spinningState = true;
    this.animationFrameCount = 0;
    this.lastAnimationFrameTime = Date.now();
    
    // Clear any existing timeouts
    this.clearTimeouts();
    
    // Start the animation frame counter
    this.monitorAnimationFrames();
    
    // Set up stuck detection after delay
    this.stuckTimeoutId = setTimeout(() => {
      this.checkForStuckAnimation();
    }, this.stuckDetectionDelay);
    
    console.log('[WheelMonitor] Started monitoring wheel animation');
  }

  /**
   * Stop monitoring the wheel animation
   */
  public stopMonitoring(): void {
    this.spinningState = false;
    this.clearTimeouts();
    
    const duration = this.startTime ? Date.now() - this.startTime : 0;
    console.log(`[WheelMonitor] Stopped monitoring. Duration: ${duration}ms, Frames: ${this.animationFrameCount}`);
    
    this.startTime = null;
  }

  /**
   * Monitor animation frames to detect if the wheel is actually animating
   */
  private monitorAnimationFrames(): void {
    if (!this.spinningState) return;
    
    // Count this frame
    this.animationFrameCount++;
    this.lastAnimationFrameTime = Date.now();
    
    // Request next frame
    requestAnimationFrame(() => this.monitorAnimationFrames());
  }

  /**
   * Check if the animation appears to be stuck
   */
  private checkForStuckAnimation(): void {
    if (!this.spinningState) return;
    
    // Calculate time since last animation frame
    const timeSinceLastFrame = Date.now() - this.lastAnimationFrameTime;
    
    if (timeSinceLastFrame > this.stuckThreshold) {
      // Animation appears stuck
      const stuckDuration = this.startTime ? Date.now() - this.startTime : 0;
      
      console.warn(`[WheelMonitor] Animation appears STUCK!
        - Duration: ${stuckDuration}ms
        - Frames recorded: ${this.animationFrameCount}
        - Time since last frame: ${timeSinceLastFrame}ms`);
      
      this.onStuck({
        duration: stuckDuration,
        frameCount: this.animationFrameCount,
        lastFrameTime: this.lastAnimationFrameTime
      });
    } else {
      // Check again soon
      this.timeoutId = setTimeout(() => {
        this.checkForStuckAnimation();
      }, 100);
    }
  }

  /**
   * Clear all timeouts
   */
  private clearTimeouts(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    if (this.stuckTimeoutId) {
      clearTimeout(this.stuckTimeoutId);
      this.stuckTimeoutId = null;
    }
  }
}

/**
 * Collects performance metrics for the wheel animation
 */
export class WheelPerformanceTracker {
  private metrics: {
    spinAttempts: number;
    successfulSpins: number;
    failedSpins: number;
    stuckSpins: number;
    averageSpinDuration: number;
    totalDuration: number;
    errors: Record<string, number>;
  };
  
  constructor() {
    this.resetMetrics();
  }
  
  /**
   * Reset all metrics
   */
  public resetMetrics(): void {
    this.metrics = {
      spinAttempts: 0,
      successfulSpins: 0,
      failedSpins: 0,
      stuckSpins: 0,
      averageSpinDuration: 0,
      totalDuration: 0,
      errors: {}
    };
  }
  
  /**
   * Record a spin attempt
   */
  public recordSpinAttempt(): void {
    this.metrics.spinAttempts++;
  }
  
  /**
   * Record a successful spin
   * @param duration - Duration of the spin in ms
   */
  public recordSuccessfulSpin(duration: number): void {
    this.metrics.successfulSpins++;
    this.updateAverageDuration(duration);
  }
  
  /**
   * Record a failed spin
   * @param error - Error message
   */
  public recordFailedSpin(error: string): void {
    this.metrics.failedSpins++;
    
    // Track error frequency
    const normalizedError = this.normalizeErrorMessage(error);
    this.metrics.errors[normalizedError] = (this.metrics.errors[normalizedError] || 0) + 1;
  }
  
  /**
   * Record a stuck spin
   */
  public recordStuckSpin(): void {
    this.metrics.stuckSpins++;
  }
  
  /**
   * Get current metrics
   */
  public getMetrics() {
    return { ...this.metrics };
  }
  
  /**
   * Update the average duration calculation
   */
  private updateAverageDuration(duration: number): void {
    const totalDurationSoFar = this.metrics.averageSpinDuration * (this.metrics.successfulSpins - 1);
    const newTotalDuration = totalDurationSoFar + duration;
    this.metrics.averageSpinDuration = newTotalDuration / this.metrics.successfulSpins;
    this.metrics.totalDuration += duration;
  }
  
  /**
   * Normalize error messages to group similar errors
   */
  private normalizeErrorMessage(error: string): string {
    // Simplify common error patterns
    if (error.includes('timeout') || error.includes('timed out')) {
      return 'Request timeout';
    }
    
    if (error.includes('network') || error.includes('connection')) {
      return 'Network error';
    }
    
    // Return as is for other errors
    return error;
  }
}

/**
 * Monitors browser performance metrics during wheel animation
 */
export class BrowserPerformanceMonitor {
  private metrics: {
    fps: number[];
    memory: { usedJSHeapSize: number[] };
    timing: {
      navigationStart?: number;
      fetchStart?: number;
      domContentLoaded?: number;
      loadEvent?: number;
    };
  };
  
  private monitoring = false;
  private intervalId: NodeJS.Timeout | null = null;
  private lastFrameTime = 0;
  private frameCount = 0;
  
  constructor() {
    this.metrics = {
      fps: [],
      memory: { usedJSHeapSize: [] },
      timing: {}
    };
  }
  
  /**
   * Start monitoring browser performance
   */
  public startMonitoring(): void {
    if (this.monitoring) return;
    
    this.monitoring = true;
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    
    // Capture initial timing metrics
    const timing = performance.timing;
    this.metrics.timing = {
      navigationStart: timing.navigationStart,
      fetchStart: timing.fetchStart,
      domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
      loadEvent: timing.loadEventEnd - timing.navigationStart
    };
    
    // Monitor FPS
    const measureFPS = () => {
      if (!this.monitoring) return;
      
      const now = performance.now();
      const elapsed = now - this.lastFrameTime;
      
      if (elapsed >= 1000) { // Update every second
        const fps = Math.round((this.frameCount * 1000) / elapsed);
        this.metrics.fps.push(fps);
        
        // Reset counters
        this.lastFrameTime = now;
        this.frameCount = 0;
        
        // Capture memory usage if available
        if ((performance as any).memory) {
          this.metrics.memory.usedJSHeapSize.push(
            (performance as any).memory.usedJSHeapSize
          );
        }
      }
      
      // Request next frame
      requestAnimationFrame(measureFPS);
    };
    
    // Start FPS measurement
    requestAnimationFrame(measureFPS);
    
    // Count frames
    const countFrame = () => {
      if (!this.monitoring) return;
      this.frameCount++;
      requestAnimationFrame(countFrame);
    };
    
    requestAnimationFrame(countFrame);
  }
  
  /**
   * Stop monitoring browser performance
   */
  public stopMonitoring(): void {
    this.monitoring = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  
  /**
   * Get current performance metrics
   */
  public getMetrics() {
    // Calculate averages
    const avgFps = this.metrics.fps.length > 0
      ? this.metrics.fps.reduce((sum, fps) => sum + fps, 0) / this.metrics.fps.length
      : 0;
      
    const avgMemory = this.metrics.memory.usedJSHeapSize.length > 0
      ? this.metrics.memory.usedJSHeapSize.reduce((sum, mem) => sum + mem, 0) / 
        this.metrics.memory.usedJSHeapSize.length
      : 0;
    
    return {
      ...this.metrics,
      averages: {
        fps: Math.round(avgFps),
        memory: avgMemory > 0 ? Math.round(avgMemory / (1024 * 1024)) + ' MB' : 'N/A'
      }
    };
  }
}

/**
 * Utility to detect browser rendering issues
 */
export function detectRenderingIssues(): string[] {
  const issues: string[] = [];
  
  // Check for high CPU usage
  if ((performance as any).memory && 
      (performance as any).memory.usedJSHeapSize > 200 * 1024 * 1024) {
    issues.push('High memory usage detected (>200MB)');
  }
  
  // Check for animation frame drops
  const frameTime = window.requestAnimationFrame(() => {}) - 
                   window.requestAnimationFrame(() => {});
                   
  if (frameTime > 20) { // More than 20ms between frames (less than 50fps)
    issues.push(`Possible frame drops detected (${frameTime.toFixed(2)}ms between frames)`);
  }
  
  return issues;
}

/**
 * Utility to check browser capabilities that might affect wheel animation
 */
export function checkBrowserCapabilities(): Record<string, boolean | string> {
  return {
    requestAnimationFrame: typeof window.requestAnimationFrame === 'function',
    cancelAnimationFrame: typeof window.cancelAnimationFrame === 'function',
    canvas2D: (() => {
      try {
        const canvas = document.createElement('canvas');
        return !!canvas.getContext('2d');
      } catch (e) {
        return false;
      }
    })(),
    webGL: (() => {
      try {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
      } catch (e) {
        return false;
      }
    })(),
    devicePixelRatio: window.devicePixelRatio || 1,
    userAgent: navigator.userAgent
  };
}
