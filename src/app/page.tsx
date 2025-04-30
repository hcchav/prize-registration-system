'use client';

import { useState } from 'react';

export default function Home() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    company: '',
    address: '',
    function: '',
    subcategory: '',
    manufacturerOptions: [] as string[],
    manufacturerOther: '',
    email: '',
    phone: '',
    method: 'email',
    consent: false,
  });
  const [code, setCode] = useState('');
  const [prize, setPrize] = useState('');
  const [error, setError] = useState('');
  const [resendDisabled, setResendDisabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const sendOTP = async () => {
    setError('');
    const { email, consent } = formData;

    if (!email || !isValidEmail(email)) {
      setError('Valid email is required.');
      return;
    }
    if (!consent) {
      setError('You must consent to continue.');
      return;
    }

    setLoading(true);
    setResendDisabled(true);

    const res = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        subcategory:
          formData.function === 'Manufacturer'
            ? [...formData.manufacturerOptions, formData.manufacturerOther].filter(Boolean).join(', ')
            : formData.subcategory,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.success) setStep(2);
    else setError('Failed to send code.');

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
      body: JSON.stringify({ email: formData.email, code }),
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

  const handleChange = (field: string, value: string | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
            <h1 className="text-3xl font-bold mb-2" style={{ color: 'rgb(0, 39, 58)' }}>Join the Biome Brigade!</h1>
            <p className="mb-4 text-gray-600 font-medium">Register to win exclusive superhero swag.</p>
            <div className="space-y-3 text-left text-sm" style={{ color: 'rgb(42, 42, 52)' }}>
              <label>Manufacturer Categories</label>
              <div className="flex flex-col gap-1">
                {['Foods', 'Supplements', 'Treats', 'All of the Above', 'Other'].map(option => (
                  <label key={option}>
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={formData.manufacturerOptions.includes(option)}
                      onChange={(e) => {
                        const updated = e.target.checked
                          ? [...formData.manufacturerOptions, option]
                          : formData.manufacturerOptions.filter(item => item !== option);
                        handleChange('manufacturerOptions', updated);
                      }}
                    />
                    {option}
                  </label>
                ))}
              </div>
              {formData.manufacturerOptions.includes('Other') && (
                <input
                  className="w-full border border-gray-600 p-2 rounded mt-2"
                  placeholder="Please specify"
                  onChange={(e) => handleChange('manufacturerOther', e.target.value)}
                />
              )}
            </div>
          </>
        )}

        {/* step 2 and 3 remain unchanged */}
      </div>
    </main>
  );
}
