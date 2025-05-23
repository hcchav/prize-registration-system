'use client';

import { useState, useCallback } from 'react';
import 'react-phone-input-2/lib/style.css';
import PhoneInput, { CountryData } from 'react-phone-input-2';
import Image from 'next/image';
import Wheel from '@/components/Wheel';
import { type Prize } from '@/constants/prizes';




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
  const [prize, setPrize] = useState<Prize | null>(null);
  const [showWheel, setShowWheel] = useState(false);
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

    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          phone: formData.phone,
          method: formData.method,
          code,
        }),
      });

      const data = await res.json();
      setVerifying(false);

      if (data.error) {
        setError(data.error);
      } else {
        setShowWheel(true);
        setStep(3);
      }
    } catch (err) {
      setVerifying(false);
      setError('Verification failed. Please try again.');
    }
  };

  const handleSpinComplete = async (prize: Prize) => {
    try {
      setVerifying(true);
      setError('');
      
      const attendeeId = formData.email || formData.phone;
      if (!attendeeId) {
        throw new Error('No attendee identifier found');
      }
      
      console.log('Claiming prize for attendee:', { attendeeId, prizeId: prize.id });

      // First, try to claim the prize (increment claimed count and check stock)
      const claimResponse = await fetch('/api/claim-prize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prizeId: prize.id,
        }),
      });

      const claimData = await claimResponse.json();
      
      if (!claimResponse.ok) {
        console.error('Prize claim failed:', claimData);
        throw new Error(claimData.error || 'Failed to claim prize. It may be out of stock.');
      }

      console.log('Prize claimed successfully, now assigning to attendee');

      // If prize was successfully claimed, assign it to the attendee
      const res = await fetch('/api/assign-prize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendeeId,
          prizeId: prize.id,
          prizeName: prize.name,
          method: formData.method
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        console.error('Prize assignment failed:', data);
        // If assignment fails after claiming, we might want to revert the claim
        // For now, just show the error
        throw new Error(data.error || 'Failed to assign prize');
      }
      
      // Update the prize state with the assigned prize
      setPrize(prize);
      setShowWheel(false);
      
      console.log('Prize assigned successfully:', data);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process prize. Please try again.';
      console.error('Prize processing error:', errorMessage);
      throw new Error(errorMessage); // Re-throw to be caught by Wheel component
    } finally {
      setVerifying(false);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div id="registration-header" className="w-full flex justify-center items-center h-15 bg-white relative">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#abcae9] to-transparent"></div>
        <div className="w-60 h-12 relative">
          <Image
            src="/Mockup.svg"
            alt="Registration Header"
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>
      
      {step === 1 && (
        <div id="registration-form" className="bg-white flex flex-row justify-center w-full">
          <div className="bg-white w-[375px] h-auto relative">
            <div className="w-80 h-auto mt-5 mx-auto rounded-[10px] border-2 border-solid border-[#abcae9] overflow-hidden">
            <div className="relative w-full h-[162px] overflow-hidden">
              <Image
                src="/images/prizes/registration-banner-mobile-1.png"
                alt="Biome Brigade Mascot"
                className="w-full h-full object-cover"
                width={320}
                height={162}
                priority
              />
            </div>

            <div className="flex flex-col w-80 items-center justify-center gap-3 px-3 py-6">
              <div className="relative self-stretch [font-family:'Poppins-Bold',Helvetica] font-bold text-[#00263a] text-xl text-center tracking-[0] leading-[normal]">
                Join the Biome Brigade®
              </div>

              <p className="relative self-stretch [font-family:'Poppins-Regular',Helvetica] font-regular font-[Poppins-extrabold] text-[#00263a] text-base text-center tracking-[0] leading-[25.6px]">
                Register to win exclusive swag!
              </p>

              <div className="w-full space-y-3">
                <div className="relative w-full">
                  <div className="w-full h-12 rounded-[10px] border border-solid border-[#abcae9] relative">
                    <input
                      className="w-full h-full px-3.5 pt-3.5 pb-0 absolute top-0 left-0 bg-transparent outline-none text-[#418FDE] text-sm font-regular font-[Poppins-extrabold] placeholder:text-[#418FDE] placeholder:opacity-100"
                      placeholder="First Name"
                      onChange={(e) => handleChange('firstName', e.target.value)}
                    />
                  </div>
                </div>

                <div className="relative w-full">
                  <div className="w-full h-12 rounded-[10px] border border-solid border-[#abcae9] relative">
                    <input
                      className="w-full h-full px-3.5 pt-3.5 pb-0 absolute top-0 left-0 bg-transparent outline-none text-[#418FDE] text-sm font-regular font-[Poppins-extrabold] placeholder:text-[#418FDE] placeholder:opacity-100"
                      placeholder="Last Name"
                      onChange={(e) => handleChange('lastName', e.target.value)}
                    />
                  </div>
                </div>

                <div className="relative w-full">
                  <div className="w-full h-12 rounded-[10px] border border-solid border-[#abcae9] relative">
                    <input
                      className="w-full h-full px-3.5 pt-3.5 pb-0 absolute top-0 left-0 bg-transparent outline-none text-[#418FDE] text-sm font-regular font-[Poppins-extrabold] placeholder:text-[#418FDE] placeholder:opacity-100"
                      placeholder="Company Name"
                      onChange={(e) => handleChange('company', e.target.value)}
                    />
                  </div>
                </div>

                <div className="relative w-full">
                  <div className="w-full h-12 rounded-[10px] border border-solid border-[#abcae9] relative">
                    <input
                      className="w-full h-full px-3.5 pt-3.5 pb-0 absolute top-0 left-0 bg-transparent outline-none text-[#418FDE] text-sm font-regular font-[Poppins-extrabold] placeholder:text-[#418FDE] placeholder:opacity-100"
                      placeholder="Company Address"
                      onChange={(e) => handleChange('address', e.target.value)}
                    />
                  </div>
                </div>

                <div className="relative w-full">
                  <div className="w-full h-12 rounded-[10px] border border-solid border-[#abcae9] relative">
                    <select
                      className="w-full h-full px-3.5 pt-3.5 pb-0 absolute top-0 left-0 bg-transparent outline-none text-[#418FDE] text-sm font-regular font-[Poppins-extrabold] appearance-none"
                      value={formData.function}
                      onChange={(e) => handleChange('function', e.target.value)}
                    >
                      <option value="" className="text-gray-400">Company Function</option>
                      <option value="Supplier">Supplier</option>
                      <option value="Manufacturer">Manufacturer</option>
                      <option value="Retailer">Retailer</option>
                      <option value="Wholesaler">Wholesaler</option>
                      <option value="Other">Other</option>
                    </select>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1.5L6 6.5L11 1.5" stroke="#418FDE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {step === 1 && formData.function === 'Supplier' && (
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

              {step === 1 && formData.function === 'Manufacturer' && (
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

              {step === 1 && ['Retailer', 'Wholesaler'].includes(formData.function) && (
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

              {step === 1 && formData.function === 'Other' && (
                <>
                  <label>Other Description</label>
                  <input className="w-full border border-gray-600 p-2 rounded" onChange={(e) => handleChange('subcategory', e.target.value)} />
                </>
              )}

              <div className="relative w-full">
                <div className="w-full h-12 rounded-[10px] border border-solid border-[#abcae9] relative">
                  <input
                    type="email"
                    className="w-full h-full px-3.5 pt-3.5 pb-0 absolute top-0 left-0 bg-transparent outline-none text-[#418FDE] text-sm font-regular font-[Poppins-extrabold] placeholder:text-[#418FDE] placeholder:opacity-100"
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                  />
                </div>
              </div>

              <div className="relative w-full">
                <div className="w-full h-12 rounded-[10px] border border-solid border-[#abcae9] relative">
                  <PhoneInput 
                    country={'us'}
                    value={formData.phone}
                    onChange={(phone: string, countryData: CountryData) => {
                      handleChange('phone', phone);
                      setCountryCode(`+${countryData.dialCode}`);
                    }}
                    inputClass="w-full h-full px-3.5 bg-transparent outline-none text-[#418FDE] text-sm font-regular font-[Poppins-extrabold] pl-20"
                    buttonClass="!bg-transparent !border-none !text-[#418FDE] !px-3 !absolute !left-0 !top-0 !h-full !flex !items-center"
                    dropdownClass="!bg-white !border !border-[#abcae9] !rounded-[10px] !z-50"
                    containerClass="!w-full h-full relative !z-50"
                    inputStyle={{
                      width: '100%',
                      height: '100%',
                      color: formData.phone ? '#418FDE' : 'transparent',
                      backgroundColor: 'transparent',
                      border: 'none',
                      outline: 'none',
                      fontSize: '14px',
                      fontFamily: 'Poppins-regular',
                      paddingLeft: '60px',
                      paddingTop: formData.phone ? '12px' : '24px',
                    }}
                    buttonStyle={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      padding: '0 10px',
                      color: '#00263a',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    dropdownStyle={{
                      backgroundColor: 'white',
                      color: '#00263a',
                      border: '1px solid #abcae9',
                      borderRadius: '10px',
                      zIndex: 9999,
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: '5px',
                    }}
                    searchStyle={{
                      padding: '10px',
                      borderBottom: '1px solid #e2e8f0',
                    }}
                    searchPlaceholder="Search..."
                    placeholder="(123) 456-7890"
                  />
                  <label 
                    className={`absolute left-15 text-[#418FDE] text-sm font-[Poppins-extrabold] transition-all duration-200 ${formData.phone ? 'top-1 text-xs' : 'top-3'}`}
                  >
                    Phone Number
                  </label>
                </div>
              </div>          
              <label className="font-semibold">Verification Method:</label>
              <div className="flex gap-4 mt-1">
                <label><input type="radio" name="method" value="email" checked={formData.method === 'email'} onChange={(e) => handleChange('method', e.target.value)} className="mr-1" /> Email</label>
                <label><input type="radio" name="method" value="sms" checked={formData.method === 'sms'} onChange={(e) => handleChange('method', e.target.value)} className="mr-1" /> SMS</label>
              </div>

              <label className="inline-flex items-center mt-3">
                <input type="checkbox" className="mr-2" onChange={(e) => handleChange('consent', e.target.checked)} checked={formData.consent} />
                I consent to receive a verification code and be entered into the prize giveaway.
              </label>

              <button 
                onClick={sendOTP} 
                disabled={loading} 
                className={`w-full py-3 rounded-md text-white font-regular font-[Poppins-extrabold] mt-4 ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#418fde] hover:bg-[#3177c2]'}`}
              >
                {loading ? 'Sending...' : 'Activate Entry'}
              </button>
              {error && <p className="text-red-600 mt-2 text-sm">{error}</p>}
            </div>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex justify-center w-full">
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
        </div>
      )}

      {step === 3 && (
        <div className="flex justify-center w-full">
          <div className="text-center">
            {showWheel ? (
              <div>
                <h2 className="text-2xl font-bold mb-4">Spin the Wheel!</h2>
                <Wheel 
                  onSpinStart={() => setLoading(true)}
                  onSpinComplete={handleSpinComplete}
                  onError={(error) => {
                    setError(error);
                    setLoading(false);
                  }}
                />
              </div>
            ) : prize ? (
              <div>
                <h2 className="text-2xl font-bold mb-4">Congratulations!</h2>
                <p className="text-lg mb-6">You've won: <span className="font-bold">{prize.name}</span></p>
                <p className="text-gray-600">Thank you for participating!</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
                <p>Preparing your prize...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
