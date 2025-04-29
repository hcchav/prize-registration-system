'use client';

import { useState } from 'react';

export default function Home() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [method, setMethod] = useState('email');
  const [code, setCode] = useState('');
  const [prize, setPrize] = useState('');
  const [error, setError] = useState('');

  const sendOTP = async () => {
    setError('');
    const res = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, method }),
    });

    const data = await res.json();
    if (data.success) {
      setStep(2);
    } else {
      setError('Failed to send code.');
    }
  };

  const verifyCode = async () => {
    setError('');
    const res = await fetch('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });

    const data = await res.json();
    if (data.error) {
      setError(data.error);
    } else {
      setPrize(data.prize || data.message);
      setStep(3);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        {step === 1 && (
          <>
            <h1 className="text-xl font-bold mb-4">Register for a Prize</h1>
            <input
              type="email"
              placeholder="Email Address"
              className="w-full border p-2 rounded mb-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full border p-2 rounded mb-4"
            >
              <option value="email">Verify via Email</option>
              <option value="sms">Verify via SMS</option>
            </select>
            <button
              onClick={sendOTP}
              className="bg-blue-600 text-white px-4 py-2 rounded w-full"
            >
              Send Verification Code
            </button>
            {error && <p className="text-red-500 mt-2">{error}</p>}
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-lg font-semibold mb-2">Enter the Code</h2>
            <input
              type="text"
              placeholder="Enter the 5-digit code"
              className="w-full border p-2 rounded mb-2"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button
              onClick={verifyCode}
              className="bg-green-600 text-white px-4 py-2 rounded w-full"
            >
              Verify
            </button>
            {error && <p className="text-red-500 mt-2">{error}</p>}
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-xl font-bold mb-4">🎉 Prize Assigned!</h2>
            <p className="text-lg text-green-700 font-semibold">{prize}</p>
          </>
        )}
      </div>
    </main>
  );
}
