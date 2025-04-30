'use client';

import { useState } from 'react';

export default function Home() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [method, setMethod] = useState('email');
  const [code, setCode] = useState('');
  const [prize, setPrize] = useState('');
  const [error, setError] = useState('');
  const [resendDisabled, setResendDisabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const sendOTP = async () => {
    setError('');

    if (!email) {
      setError('Email is required.');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setResendDisabled(true);

    const res = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, method }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.success) {
      setStep(2);
    } else {
      setError('Failed to send code.');
    }

    setTimeout(() => setResendDisabled(false), 30000);
  };

  const verifyCode = async () => {
    setError('');

    if (!code || code.length < 4) {
      setError('Please enter the verification code.');
      return;
    }

    setVerifying(true);

    const res = await fetch('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });

    const data = await res.json();
    setVerifying(false);

    if (data.error) {
      setError(data.error);
    } else {
      setPrize(data.prize || data.message);
      setStep(3);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-[100dvh] overflow-auto px-4 bg-gradient-to-br from-blue-50 to-white">

      <div className="bg-white border-[3px] border-blue-700 p-8 rounded-2xl shadow-xl w-full max-w-md text-center comic-border">
          {step === 1 && (
          <>
            <img
              src="https://biomebrigade.com/cdn/shop/files/Untitled_design_2.png?v=1742993065&width=450"
              alt="Biome Brigade Mascot"
              className="w-40 h-auto mx-auto mb-4 rounded-lg shadow-md"
            />
            <h1 className="text-3xl font-bold text-blue-800 mb-4 font-comic">Join the Biome Brigade!</h1>
            <p className="mb-4 text-gray-600 font-medium">Register to win exclusive superhero swag.</p>
            <label className="block text-left font-semibold text-gray-700 mb-1">
              Your Secret Agent Email
            </label>
            <input
              type="email"
              className="w-full border border-gray-600 p-3 rounded mb-3"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={(e) => {
                setTimeout(() => {
                  e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
              }}
            />

            <div className="text-left mb-4">
              <label className="font-semibold block mb-1">Verification Method:</label>
              <label className="inline-flex items-center mr-4">
                <input
                  type="radio"
                  value="email"
                  checked={method === 'email'}
                  onChange={(e) => setMethod(e.target.value)}
                  className="mr-2"
                />
                Email
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="sms"
                  checked={method === 'sms'}
                  onChange={(e) => setMethod(e.target.value)}
                  className="mr-2"
                />
                SMS
              </label>
            </div>

            <div className="text-left mb-4">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  required
                  className="mr-2"
                  onChange={(e) => {
                    if (!e.target.checked) {
                      setError('You must consent to continue.');
                    } else {
                      setError('');
                    }
                  }}
                />
                I consent to receive a verification code and be entered into the prize giveaway.
              </label>
            </div>

            <button
              onClick={sendOTP}
              disabled={loading}
              className={`bg-blue-700 text-white font-bold py-2 px-4 rounded w-full hover:bg-blue-800 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Sending...' : 'Activate Entry'}
            </button>

            {error && <p className="text-red-600 mt-2">{error}</p>}
          </>
        )}


        {step === 2 && (
          <>
            <h2 className="text-2xl font-bold text-green-700 mb-2 font-comic">🔐 Enter Access Code</h2>
            <p className="text-gray-600 mb-4">Your code has been dispatched to your inbox.</p>
            <input
              type="text"
              placeholder="5-digit OTP"
              className="w-full border border-gray-300 p-2 rounded mb-2"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onFocus={(e) => {
                setTimeout(() => {
                  e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
              }}
            />
            <button
              onClick={verifyCode}
              disabled={verifying}
              className={`bg-green-600 text-white font-bold py-2 px-4 rounded w-full hover:bg-green-700 ${
                verifying ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {verifying ? 'Verifying...' : 'Confirm Identity'}
            </button>
            <button
              onClick={sendOTP}
              disabled={resendDisabled}
              className={`text-sm mt-3 underline w-full ${
                resendDisabled ? 'text-gray-400' : 'text-blue-600'
              }`}
            >
              Resend Code
            </button>
            {error && <p className="text-red-600 mt-2">{error}</p>}
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-3xl font-bold text-purple-800 mb-4 font-comic">🎉 Mission Complete!</h2>
            <p className="text-lg font-semibold text-green-700">You won: {prize}</p>
            <p className="text-sm text-gray-500 mt-2">Claim your prize at Booth #9158</p>
          </>
        )}
      </div>
    </main>
  );
}
