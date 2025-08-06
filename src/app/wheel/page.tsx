'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { type Prize } from '@/constants/prizes';
import WheelDesktop from '@/components/wheel-desktop';

// Dynamically import ReactConfetti to avoid SSR issues
const ReactConfetti = dynamic(() => import('react-confetti'), {
  ssr: false,
});

// Format claim number with dashes for better readability
function formatClaimNumber(id: string) {
  if (!id) return 'N/A';
  // Remove any non-alphanumeric characters
  const cleaned = id.replace(/[^a-zA-Z0-9]/g, '');
  // Format as XXX-XXX if 6 characters
  if (cleaned.length === 6) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  }
  return cleaned;
}

export default function WheelPage() {
  const [claimNumber, setClaimNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [attendeeId, setAttendeeId] = useState<string | null>(null);
  const [prize, setPrize] = useState<Prize | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCongratsModal, setShowCongratsModal] = useState(false);
  const [noPrizeAvailable, setNoPrizeAvailable] = useState(false);
  
  // Get window size for confetti
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  // Update window size when window resizes
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Handle claim number verification
  const verifyClaimNumber = async () => {
    if (!claimNumber.trim()) {
      setError('Please enter a claim number');
      return false;
    }

    try {
      setVerifying(true);
      setError(null);

      const response = await fetch('/api/verify-claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          claimId: claimNumber.trim().replace(/-/g, ''), // Remove any dashes
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to verify claim number');
        setVerifying(false);
        return false;
      }

      // Store attendee ID in state and localStorage
      setAttendeeId(data.attendeeId);
      localStorage.setItem('attendeeId', data.attendeeId);
      
      // Set verified to true to show the wheel
      setVerified(true);
      setError(null);
      setVerifying(false);
      return true;
    } catch (err) {
      console.error('Error verifying claim number:', err);
      setError('An unexpected error occurred. Please try again.');
      setVerifying(false);
      return false;
    }
  };

  // Handle spin completion
  const handleSpinComplete = useCallback((selectedPrize: Prize | null) => {
    setLoading(false);
    
    if (!selectedPrize) {
      setNoPrizeAvailable(true);
      setShowCongratsModal(true);
      return;
    }
    
    setPrize(selectedPrize);
    setShowConfetti(true);
    setShowCongratsModal(true);
    
    // Hide confetti after 5 seconds
    setTimeout(() => {
      setShowConfetti(false);
    }, 5000);
  }, []);

  return (
    
    <div className="flex min-h-screen flex-col items-center bg-[#f5f9fd] pt-0">
        {/* <div id="registration-header" className="portrait-header fixed top-0 left-0 right-0 z-50 w-full flex justify-center items-center h-[20vh] bg-white shadow-xl">
          <div className="absolute inset-x-0 bottom-0 h-[4px] bg-gradient-to-r from-transparent via-[#abcae9] to-transparent"></div>
          <div className="portrait-logo-container w-[100%] h-[100%] max-w-[1000px] relative">
            <Image
              src="/Mockup.svg"
              alt="Registration Header"
              fill
              className="portrait-logo object-contain"
              priority
            />
          </div>
        </div> */}
        <div id="prize-wheel" className="w-full max-w-[90vw] md:max-w-[80vw] lg:max-w-[70vw] xl:max-w-[60vw] 2xl:max-w-[50vw] mt-[10px] px-8 pb-16 flex justify-center items-center">
          <div style={{ opacity: showCongratsModal ? 0.3 : 1, transition: 'opacity 0.3s ease' }}>
                    <div>
                      <WheelDesktop
                        onSpinComplete={handleSpinComplete}
                        onError={(error) => {
                          setError(error);
                          setLoading(false);
                        }}
                        // Override the wheel's spin button click to verify claim number first
                        onSpinStart={async () => {
                          if (!claimNumber.trim()) {
                            setError('Please enter a claim number');
                            return false; // Prevent spinning
                          }
                          // Verify claim number and only proceed if successful
                          const isVerified = await verifyClaimNumber();
                          return isVerified; // Only allow spin if verified
                        }}
                        // Pass the claim number input as content to display above the spin button
                        aboveButtonContent={
                          <div className="flex flex-col w-full mt-20 mb-6">
                            <div className="w-full">
                              <div className={`claim-input-container relative w-full border-2 rounded-lg overflow-hidden ${
                                error ? 'border-[#D03C3C]' : 'border-[#abcae9]'
                              } ${error ? 'bg-[#FFF0F0]' : 'bg-white'}`}>
                                <input
                                  id="claimNumber"
                                  type="number"                                  
                                  className={`w-full h-full px-6 py-3 pt-8 bg-transparent outline-none ${
                                    error ? 'text-[#D03C3C]' : 'text-[#00263a]'
                                  } font-bold text-2xl`}
                                  value={claimNumber}
                                  onChange={(e) => {
                                    setClaimNumber(e.target.value);
                                    // Clear error when user starts typing
                                    if (error) setError(null);
                                  }}
                                  placeholder=" "
                                />
                                <label 
                                  htmlFor="claimNumber"
                                  className={`absolute left-6 ${
                                    error ? 'text-[#D03C3C]' : 'text-[#418FDE]'
                                  } transition-all duration-200 pointer-events-none ${
                                    claimNumber ? 'text-xl top-2' : 'top-1'
                                  }`}
                                >
                                  Enter claim number
                                </label>
                              </div>
                              {error && (
                                <p className="text-[#D03C3C] mt-2 text-base pl-6 font-medium">
                                  {error}
                                </p>
                              )}
                            </div>
                          </div>
                        }
                      />
                    </div>
                </div>
                
                {/* Confetti Effect */}
                {showConfetti && !noPrizeAvailable && (
                  <div className="fixed inset-0 z-[100] pointer-events-none">
                    <ReactConfetti
                      width={windowSize.width}
                      height={windowSize.height}
                      recycle={true}
                      numberOfPieces={200}
                      gravity={0.2}
                      colors={['#418FDE', '#2e7bc4', '#1a67aa', '#0c4b8c', '#00263a']}
                    />
                  </div>
                )}

                {/* Congrats Modal */}
                {showCongratsModal && (
                  <div className="congrats-modal-overlay">
                    <div className="congrats-modal-backdrop"></div>
                    <div className="congrats-modal-content">
                      {noPrizeAvailable ? (
                        <>
                          <div className="congrats-modal-no-prize-title">
                            All Prizes Claimed. Thank you for participating!
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="congrats-modal-title">
                            CONGRATULATIONS!
                          </div>
                          <div className="mb-4">
                            <p className="congrats-modal-text">
                            You have won a:
                            </p>
                            <p className="congrats-modal-prize-name">
                              {prize?.name || 'Your Prize'}
                            </p>                           
                          </div>
                        </>
                      )}
                      <button
                        className="congrats-modal-button"
                        onClick={() => window.location.reload()}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}
        </div>
    </div>
  );
}
