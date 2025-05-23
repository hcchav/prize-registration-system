'use client';

import { useState } from 'react';
import 'react-phone-input-2/lib/style.css';
import PhoneInput, { CountryData } from 'react-phone-input-2';




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
  const [countryCode, setCountryCode] = useState('+1');

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleChange = (field: string, value: string | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const sendOTP = async () => {
    setError('');
    const { email, consent, phone, method } = formData;

    if (method === 'email' && (!email || !isValidEmail(email))) {
      setError('Valid email is required.');
      return;
    }
    if (method === 'sms' && (!phone || phone.length < 10)) {
      setError('Valid phone number is required.');
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

    if (data.success) {
      setStep(2);
    } else {
      setError(data.error || 'Failed to send code. Please try again.');
    }

    setTimeout(() => setResendDisabled(false), 30000);
  };

  const verifyCode = async () => {
    setError('');

    if (!code || code.length < 5) {
      setError('Please enter the verification code.');
      return;
    }

    setVerifying(true);

    const res = await fetch('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: formData.email,
        phone: formData.phone,
        countryCode: countryCode,
        method: formData.method,
        code,
      }),
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
            <h1 className="text-3xl font-bold mb-2" style={{ color: 'rgb(0, 39, 58)' }}>Join the Biome Brigade!</h1>
            <p className="mb-4 text-gray-600 font-medium">Register to win exclusive superhero swag.</p>
            <div className="space-y-3 text-left text-sm" style={{ color: 'rgb(42, 42, 52)' }}>
              <label>First Name</label>
              <input className="w-full border border-gray-600 p-2 rounded" onChange={(e) => handleChange('firstName', e.target.value)} />
              <label>Last Name</label>
              <input className="w-full border border-gray-600 p-2 rounded" onChange={(e) => handleChange('lastName', e.target.value)} />
              <label>Company Name</label>
              <input className="w-full border border-gray-600 p-2 rounded" onChange={(e) => handleChange('company', e.target.value)} />
              <label>Company Address</label>
              <input className="w-full border border-gray-600 p-2 rounded" onChange={(e) => handleChange('address', e.target.value)} />

              <label>Company Function</label>
              <select className="w-full border border-gray-600 p-2 rounded" value={formData.function} onChange={(e) => handleChange('function', e.target.value)}>
                <option value="">Select One</option>
                <option value="Supplier">Supplier</option>
                <option value="Manufacturer">Manufacturer</option>
                <option value="Retailer">Retailer</option>
                <option value="Wholesaler">Wholesaler</option>
                <option value="Other">Other</option>
              </select>

              {formData.function === 'Supplier' && (
                <>
                  <label>Supplier Subcategory</label>
                  <select className="w-full border border-gray-600 p-2 rounded" onChange={(e) => handleChange('subcategory', e.target.value)}>
                    <option value="">Select</option>
                    <option value="Ingredients">Ingredients</option>
                    <option value="Toys">Toys</option>
                    <option value="Packaging">Packaging</option>
                  </select>
                </>
              )}

              {formData.function === 'Manufacturer' && (
                <>
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
                    <input className="w-full border border-gray-600 p-2 rounded mt-2" placeholder="Please specify" onChange={(e) => handleChange('manufacturerOther', e.target.value)} />
                  )}
                </>
              )}

              {['Retailer', 'Wholesaler'].includes(formData.function) && (
                <>
                  <label>{formData.function} Region</label>
                  <select className="w-full border border-gray-600 p-2 rounded" onChange={(e) => handleChange('subcategory', e.target.value)}>
                    <option value="">Select</option>
                    <option value="Local">Local</option>
                    <option value="Regional">Regional</option>
                    <option value="National">National</option>
                    <option value="International">International</option>
                  </select>
                </>
              )}

              {formData.function === 'Other' && (
                <>
                  <label>Other Description</label>
                  <input className="w-full border border-gray-600 p-2 rounded" onChange={(e) => handleChange('subcategory', e.target.value)} />
                </>
              )}

              <label>Email Address</label>
              <input className="w-full border border-gray-600 p-2 rounded" type="email" onChange={(e) => handleChange('email', e.target.value)} />

             


              <label>Phone Number</label>
            
              <PhoneInput 
              country={'us'}
              value={formData.phone}
              onChange={(phone: string, countryData: CountryData) => {
                handleChange('phone', phone);
                setCountryCode(`+${countryData.dialCode}`);
              }}

              inputClass="!w-full !pl-12 !border !border-gray-600 !rounded !h-10"
              buttonClass="!bg-white !border-gray-600"
              containerClass="!w-full"
            />          



           

              <label className="font-semibold">Verification Method:</label>
              <div className="flex gap-4 mt-1">
                <label><input type="radio" name="method" value="email" checked={formData.method === 'email'} onChange={(e) => handleChange('method', e.target.value)} className="mr-1" /> Email</label>
                <label><input type="radio" name="method" value="sms" checked={formData.method === 'sms'} onChange={(e) => handleChange('method', e.target.value)} className="mr-1" /> SMS</label>
              </div>

              <label className="inline-flex items-center mt-3">
                <input type="checkbox" className="mr-2" onChange={(e) => handleChange('consent', e.target.checked)} />
                I consent to receive a verification code and be entered into the prize giveaway.
              </label>

              <button onClick={sendOTP} disabled={loading} style={{ backgroundColor: loading ? 'rgb(2, 32, 41)' : 'rgb(102, 158, 224)' }} className="text-white font-bold py-2 px-4 rounded w-full mt-4">
                {loading ? 'Sending...' : 'Activate Entry'}
              </button>
              {error && <p className="text-red-600 mt-2 text-sm">{error}</p>}
            </div>
          </>
        )}

        {step === 2 && (
          <>
              <div className="frame" data-model-id="2:3">
      <div className="div">
        <div className="text-wrapper-3">🔐 Enter Access Code</div>

        <input
          type="text"
          className="element-digit-code"
          placeholder="6-digit code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={6}
        />

        <button
          className="overlap-group"
          onClick={verifyCode}
          disabled={verifying}
        >
          <span className="text-wrapper-2">
            {verifying ? 'Verifying...' : 'Confirm Identity'}
          </span>
        </button>

        <button
          className="text-wrapper"
          onClick={sendOTP}
          disabled={resendDisabled}
        >
          Resend Code
        </button>

        {error && <p className="error-message">{error}</p>}
      </div>
    </div>


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
