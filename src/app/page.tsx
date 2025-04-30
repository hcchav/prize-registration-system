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
    <main className="flex items-center justify-center min-h-[100dvh] overflow-auto px-4" style={{ backgroundColor: 'white', fontFamily: 'Poppins, sans-serif' }}>
      <div className="p-8 rounded-2xl shadow-xl w-full max-w-md text-center border-[3px]" style={{ backgroundColor: 'white', borderColor: 'rgb(236, 242, 243)' }}>
        {step === 1 && (
          <>
            <img
              src="https://biomebrigade.com/cdn/shop/files/Untitled_design_2.png?v=1742993065&width=450"
              alt="Biome Brigade Mascot"
              className="w-40 h-auto mx-auto mb-4 rounded-lg shadow-md"
            />
            <h1 className="text-3xl font-bold mb-4" style={{ color: 'rgb(0, 39, 58)' }}>Join the Biome Brigade!</h1>
            <p className="mb-4 font-medium" style={{ color: 'rgb(0, 39, 58)' }}>Register to win exclusive superhero swag.</p>
            <label className="block text-left font-semibold mb-1" style={{ color: 'rgb(42, 42, 52)' }}>Your Secret Agent Email</label>
            <input
              type="email"
              placeholder="example@domain.com"
              className="w-full border border-gray-600 p-3 rounded mb-3 placeholder:text-gray-700"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={(e) => {
                setTimeout(() => {
                  e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
              }}
            />

            <div className="text-left mb-4">
              <label className="font-semibold block mb-1" style={{ color: 'rgb(42, 42, 52)' }}>Verification Method:</label>
              <label className="inline-flex items-center mr-4" style={{ color: 'rgb(42, 42, 52)' }}>
                <input
                  type="radio"
                  value="email"
                  checked={method === 'email'}
                  onChange={(e) => setMethod(e.target.value)}
                  className="mr-2"
                />
                Email
              </label>
              <label className="inline-flex items-center" style={{ color: 'rgb(42, 42, 52)' }}>
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
              <label className="inline-flex items-center" style={{ color: 'rgb(42, 42, 52)' }}>
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
              style={{ backgroundColor: loading ? 'rgb(2, 32, 41)' : 'rgb(102, 158, 224)' }}
              className={`text-white font-bold py-2 px-4 rounded w-full hover:opacity-90 ${
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
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'rgb(0, 39, 58)' }}>🔐 Enter Access Code</h2>
            <p className="mb-4" style={{ color: 'rgb(0, 39, 58)' }}>Your code has been dispatched to your inbox.</p>
            <input
              type="text"
              placeholder="5-digit OTP"
              className="w-full border border-gray-600 p-3 rounded mb-2 placeholder:text-gray-700"
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
              style={{ backgroundColor: verifying ? 'rgb(2, 32, 41)' : 'rgb(102, 158, 224)' }}
              className={`text-white font-bold py-2 px-4 rounded w-full hover:opacity-90 ${
                verifying ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {verifying ? 'Verifying...' : 'Confirm Identity'}
            </button>
            <button
              onClick={sendOTP}
              disabled={resendDisabled}
              className={`text-sm mt-3 underline w-full ${
                resendDisabled ? 'text-gray-400' : 'text-blue-800'
              }`}
            >
              Resend Code
            </button>
            {error && <p className="text-red-600 mt-2">{error}</p>}
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-3xl font-bold mb-4" style={{ color: 'rgb(0, 39, 58)' }}>🎉 Mission Complete!</h2>
            <p className="text-lg font-semibold text-green-700">You won: {prize}</p>
            <p className="text-sm mt-2" style={{ color: 'rgb(0, 39, 58)' }}>Claim your prize at Booth #9158</p>
          </>
        )}
      </div>
    </main>
  );
}
