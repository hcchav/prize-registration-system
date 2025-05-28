'use client';

import { useState, useCallback, useEffect } from 'react';
import 'react-phone-input-2/lib/style.css';
import PhoneInput, { CountryData } from 'react-phone-input-2';
import Image from 'next/image';
import Wheel from '@/components/Wheel';
import { type Prize } from '@/constants/prizes';
import Dropdown from '@/components/Dropdown';
import CheckboxDropdown from '@/components/CheckboxDropdown';







export default function Home() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    company: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    aptSuiteBuilding: '',
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

  function setSelectedValue(value: string): void {
    throw new Error('Function not implemented.');
  }

  return (
    <div className="min-h-auto mb-20 bg-white">
      <div id="registration-header" className="fixed top-0 left-0 right-0 z-50 w-full flex justify-center items-center h-15 bg-white shadow-sm">
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
      
      <div className="pt-16">
      {step === 1 && (
        <div id="registration-form" className="bg-white flex flex-row justify-center w-full">
          <div className="bg-white w-[375px] h-auto relative">
            <div className="bg-white w-80 h-auto mt-5 mx-auto rounded-[5px] border-2 border-solid border-[#abcae9] overflow-hidden">
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

              <p className="relative self-stretch [font-family:'Poppins-Regular',Helvetica] font-regular  text-[#00263a] text-base text-center tracking-[0] leading-[25.6px]">
                Register to win exclusive swag!
              </p>

              <div className="w-full space-y-3">
                <div className="relative w-full group">
                  <div className="relative h-12 rounded-[5px] border border-solid border-[#abcae9] bg-white">
                    <input
                      id="firstName"
                      type="text"
                      className={`w-full h-full px-3.5 pt-1 pb-0 bg-transparent outline-none text-[#418FDE] text-sm text-[12px]  font-regular peer
                      ${formData.firstName ? 'text-[14px]  translate-y-1' : 'top-3'}`}
                      onChange={(e) => handleChange('firstName', e.target.value)}
                      value={formData.firstName}
                      placeholder=" "
                    />
                    <label 
                      htmlFor="firstName"
                      className={`absolute left-3.5 text-[#418FDE] transition-all duration-200 pointer-events-none
                        ${formData.firstName ? 'text-[10px]  translate-y-1' : 'text-[14px] top-3'}`}
                    >
                      First Name
                    </label>
                  </div>
                </div>

                <div className="relative w-full group">
                  <div className="relative h-12 rounded-[5px] border border-solid border-[#abcae9] bg-white">
                    <input
                      id="lastName"
                      type="text"
                      className={`w-full h-full px-3.5 pt-1 pb-0 bg-transparent outline-none text-[#418FDE] text-[14px] text-sm font-regular peer
                      ${formData.lastName ? 'text-[14px] translate-y-1' : 'top-3'}`}
                      onChange={(e) => handleChange('lastName', e.target.value)}
                      value={formData.lastName}
                      placeholder=" "
                    />
                    <label 
                      htmlFor="lastName"
                      className={`absolute left-3.5 text-[#418FDE]  transition-all duration-200 pointer-events-none
                        ${formData.lastName ? 'text-[10px]  translate-y-1' : 'text-[14px] top-3'}`}
                    >
                      Last Name
                    </label>
                  </div>
                </div>

                <div className="relative w-full group">
                  <div className="relative h-12 rounded-[5px] border border-solid border-[#abcae9] bg-white">
                    <input
                      id="company"
                      type="text"
                      className={`w-full h-full px-3.5 pt-1 pb-0 bg-transparent outline-none text-[#418FDE] text-[14px] text-sm font-regular peer
                      ${formData.company ? 'text-[14px] translate-y-1' : 'top-3'}`}
                      onChange={(e) => handleChange('company', e.target.value)}
                      value={formData.company}
                      placeholder=" "
                    />
                    <label 
                      htmlFor="company"
                      className={`absolute left-3.5 text-[#418FDE]  transition-all duration-200 pointer-events-none
                        ${formData.company ? 'text-[10px]  translate-y-1' : 'text-[14px] top-3'}`}
                    >
                      Company Name
                    </label>
                  </div>
                </div>

                <div className="relative w-full group">
                  <div className="relative h-12 rounded-[5px] border border-solid border-[#abcae9] bg-white">
                    <input
                      id="address"
                      type="text"
                      className={`w-full h-full px-3.5 pt-1 pb-0 bg-transparent outline-none text-[#418FDE] text-[14px] text-sm font-regular peer
                      ${formData.address ? 'text-[14px] translate-y-1' : 'top-3'}`}
                      onChange={(e) => handleChange('address', e.target.value)}
                      value={formData.address}
                      placeholder=" "
                    />
                    <label 
                      htmlFor="address"
                      className={`absolute left-3.5 text-[#418FDE]  transition-all duration-200 pointer-events-none
                        ${formData.address ? 'text-[10px]  translate-y-1' : 'text-[14px] top-3'}`}
                    >
                      Company Street Address
                    </label>
                  </div>
                </div>

                <div className="relative w-full group">
                  <div className="relative h-12 rounded-[5px] border border-solid border-[#abcae9] bg-white">
                    <input
                      id="aptSuiteBuilding"
                      type="text"
                      className={`w-full h-full px-3.5 pt-1 pb-0 bg-transparent outline-none text-[#418FDE] text-[14px] text-sm font-regular peer
                      ${formData.aptSuiteBuilding ? 'text-[14px] translate-y-1' : 'top-3'}`}
                      onChange={(e) => handleChange('aptSuiteBuilding', e.target.value)}
                      value={formData.aptSuiteBuilding}
                      placeholder=""
                    />
                    <label 
                      htmlFor="aptSuiteBuilding"
                      className={`absolute left-3.5 text-[#418FDE]  transition-all duration-200 pointer-events-none
                        ${formData.aptSuiteBuilding ? 'text-[10px]  translate-y-1' : 'text-[14px] top-3'}`}
                    >
                      Apt, Suite, Building (Optional)
                    </label>
                  </div>
                </div>
                {/* City */}
                <div className="relative w-full group">
                  <div className="relative h-12 rounded-[5px] border border-solid border-[#abcae9] bg-white">
                    <input
                      id="city"
                      type="text"
                      className={`w-full h-full px-3.5 pt-1 pb-0 bg-transparent outline-none text-[#418FDE] text-[14px] text-sm font-regular peer
                      ${formData.city ? 'text-[14px] translate-y-1' : 'top-3'}`}
                      onChange={(e) => handleChange('city', e.target.value)}
                      value={formData.city}
                      placeholder=""
                    />
                    <label 
                      htmlFor= "city"
                      className={`absolute left-3.5 text-[#418FDE]  transition-all duration-200 pointer-events-none
                        ${formData.city ? 'text-[10px]  translate-y-1' : 'text-[14px] top-3'}`}
                    >
                      City
                    </label>
                  </div>
                </div>

             
                <div className="flex gap-2">
                     {/* state */}
                  <div className="w-1/2">
                    <div className="relative h-12 rounded-[5px] border border-solid border-[#abcae9] bg-white">
                      <input
                        id="state"
                        type="text"
                        className={`w-full h-full px-3.5 pt-1 pb-0 bg-transparent outline-none text-[#418FDE] text-[14px] text-sm font-regular peer
                        ${formData.state ? 'text-[14px] translate-y-1' : 'top-3'}`}
                        onChange={(e) => handleChange('state', e.target.value)}
                        value={formData.state}
                        placeholder=" "
                      />
                      <label 
                        htmlFor="state"
                        className={`absolute left-3.5 text-[#418FDE]  transition-all duration-200 pointer-events-none
                          ${formData.state ? 'text-[10px]  translate-y-1' : 'text-[14px] top-3'}`}
                      >
                        State
                      </label>
                    </div>
                  </div>
                  {/* zip code */}
                  <div className="w-1/2">
                    <div className="relative h-12 rounded-[5px] border border-solid border-[#abcae9] bg-white">
                      <input
                        id="zip"
                        type="text"
                        className={`w-full h-full px-3.5 pt-1 pb-0 bg-transparent outline-none text-[#418FDE] text-[14px] text-sm font-regular peer
                        ${formData.zip ? 'text-[14px] translate-y-1' : 'top-3'}`}
                        onChange={(e) => handleChange('zip', e.target.value)}
                        value={formData.zip}
                        placeholder=" "
                      />
                      <label 
                        htmlFor="zip"
                        className={`absolute left-3.5 text-[#418FDE]  transition-all duration-200 pointer-events-none
                          ${formData.zip ? 'text-[10px]  translate-y-1' : 'text-[14px] top-3'}`}
                      >
                        Zip Code
                      </label>
                    </div>
                  </div>
   
                </div>

                <div className="w-full">
                  <Dropdown
                    label="Company Function (Select One)"
                    value={formData.function}
                    onChange={(value) => handleChange('function', value)}
                    options={[
                      { value: '', label: 'Company Function (Select One)' },
                      { value: 'Supplier', label: 'Supplier' },
                      { value: 'Manufacturer', label: 'Manufacturer' },
                      { value: 'Retailer', label: 'Retailer' },
                      { value: 'Wholesaler', label: 'Wholesaler' },
                      { value: 'Other', label: 'Other' },
                    ]}
                  />
                </div>

            
              </div>

              {step === 1 && formData.function === 'Supplier' && (
                <div className="w-full">
                  <Dropdown
                    label="Supplier Subcategory"
                    value={formData.subcategory}
                    onChange={(value) => handleChange('subcategory', value)}
                    options={[
                      { value: '', label: 'Supplier Subcategory (Select)' },
                      { value: 'Ingredients', label: 'Ingredients' },
                      { value: 'Toys', label: 'Toys' },
                      { value: 'Packaging', label: 'Packaging' },
                    ]}
                  />
                </div>
              )}

              {step === 1 && formData.function === 'Manufacturer' && (
                <div className="w-full">
                  <CheckboxDropdown
                    label="Manufacturer Category"
                    value={formData.manufacturerOptions}
                    onChange={(value) => handleChange('manufacturerOptions', value)}
                    options={[
                      { value: 'Foods', label: 'Foods' },
                      { value: 'Supplements', label: 'Supplements' },
                      { value: 'Treats', label: 'Treats' },
                      { value: 'All of the Above', label: 'All of the Above' },
                      { value: 'Other', label: 'Other' },
                    ]}
                    placeholder="Select categories..."
                  />
                  {formData.manufacturerOptions.includes('Other') && (
                    <input 
                      className="w-full border border-[#abcae9] p-3 rounded-[5px] mt-2 text-[#418FDE] text-sm" 
                      placeholder="Please specify" 
                      onChange={(e) => handleChange('manufacturerOther', e.target.value)}
                      style={{ height: '48px' }}
                    />
                  )}
                </div>
              )}

              {step === 1 && ['Retailer', 'Wholesaler'].includes(formData.function) && (
                <div className="w-full">
                  <Dropdown
                    label={`${formData.function} Region`}
                    value={formData.subcategory}
                    onChange={(value) => handleChange('subcategory', value)}
                    options={[
                      { value: '', label: `${formData.function} Region (Select)` },
                      { value: 'Local', label: 'Local' },
                      { value: 'Regional', label: 'Regional' },
                      { value: 'National', label: 'National' },
                      { value: 'International', label: 'International' },
                    ]}
                  />
                </div>
              )}

              {step === 1 && formData.function === 'Other' && (
                <div className="relative w-full">
                  <div className="relative h-12 rounded-[5px] border border-solid border-[#abcae9] bg-white">
                    <input
                      id="otherDescription"
                      type="text"
                      className={`w-full h-full px-3.5 pt-1 pb-0 bg-transparent outline-none text-[#418FDE] text-sm text-[12px] font-regular peer
                      ${formData.subcategory ? 'text-[14px] translate-y-1' : 'top-3'}`}
                      onChange={(e) => handleChange('subcategory', e.target.value)}
                      value={formData.subcategory}
                      placeholder=" "
                    />
                    <label 
                      htmlFor="otherDescription"
                      className={`absolute left-3.5 text-[#418FDE] transition-all duration-200 pointer-events-none
                        ${formData.subcategory ? 'text-[10px] translate-y-1' : 'text-[14px] top-3'}`}
                    >
                      Please specify
                    </label>
                  </div>
                </div>
              )}

              <div className="relative w-full group">
                <div className="relative h-12 rounded-[5px] border border-solid border-[#abcae9] bg-white">
                  <input
                    id="email"
                    type="email"
                    className={`w-full h-full px-3.5 pt-1 pb-0 bg-transparent outline-none text-[#418FDE] text-[14px] text-sm font-regular peer
                    ${formData.email ? 'text-[14px] translate-y-1' : 'top-3'}`}
                    onChange={(e) => handleChange('email', e.target.value)}
                    value={formData.email}
                    placeholder=" "
                  />
                  <label 
                    htmlFor="email"
                    className={`absolute left-3.5 text-[#418FDE]  transition-all duration-200 pointer-events-none
                      ${formData.email ? 'text-[10px]  translate-y-1' : 'text-[14px] top-3'}`}
                  >
                    Email Address
                  </label>
                </div>
              </div>

              <div className="relative w-full">
                <div className="w-full h-12 rounded-[5px] border border-solid border-[#abcae9] relative">
                  <PhoneInput 
                    country={'us'}
                    value={formData.phone}
                    placeholder="(123) 456-7890"
                    enableSearch
                    countryCodeEditable={false}
                    autoFormat={true}
                    disableSearchIcon
                    onChange={(phone: string, countryData: CountryData) => {
                      handleChange('phone', phone);
                      setCountryCode(`+${countryData.dialCode}`);
                    }}
                    inputClass="w-full h-full px-3.5 bg-transparent outline-none text-[#418FDE] text-sm font-regular pl-20 caret-[#418FDE]"
                    buttonClass="!bg-transparent !border-none !text-[#418FDE] !px-3 !absolute !left-0 !top-0 !h-full !flex !items-center"
                    dropdownClass="!bg-white !border !border-[#abcae9] !rounded-[5px] !z-50"
                    containerClass="!w-full h-full relative !z-50"

                    inputStyle={{
                      width: '100%',
                      height: '100%',
                      color: formData.phone ? '#418FDE' : '#418FDE',
                      backgroundColor: 'transparent',
                      border: 'none',
                      outline: 'none',
                      fontSize: '14px',
                      fontFamily: 'Poppins-regular',
                      paddingLeft: '60px',
                      paddingTop: '24px',
                      caretColor: '#418FDE',
                      top: '-5px'
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
                  />
                  <label 
                    className={`absolute left-15 text-[#418FDE] text-[12px] text-sm   duration-200 top-1`}
                  >
                    Phone Number
                  </label>
                </div>
              </div>    
              

              <div className="text-left w-full font-semibold text-[#00263A] text-sm peer  [font-family:'Poppins-Bold',Helvetica]">Confirm verification method:</div>
              

              
              <div className="flex gap-6 w-full">
                <label className="flex items-center gap-3 cursor-pointer  [font-family:'Poppins-Bold',Helvetica]">
                  <input 
                    type="radio" 
                    name="method" 
                    value="email" 
                    checked={formData.method === 'email'} 
                    onChange={(e) => handleChange('method', e.target.value)} 
                    className="h-4 w-4 text-[#418FDE] "
                  />
                  <span className="text-[14px] [font-family:'Poppins-Regular',Helvetica]">Email</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer  [font-family:'Poppins-Bold',Helvetica]">
                  <input 
                    type="radio" 
                    name="method" 
                    value="sms" 
                    checked={formData.method === 'sms'} 
                    onChange={(e) => handleChange('method', e.target.value)} 
                    className="h-4 w-4 text-[#418FDE]"
                  />
                  <span className="text-[14px] [font-family:'Poppins-Regular',Helvetica]">SMS</span>
                </label>
              </div>

              <label className="inline-flex items-center mt-3 text-[14px] [font-family:'Poppins-Regular',Helvetica]">
                <input type="checkbox" className="mr-2 p-1.5" onChange={(e) => handleChange('consent', e.target.checked)} checked={formData.consent} />
                I consent to receive a verification code and be entered into the prize giveaway.
              </label>

              <button 
                onClick={sendOTP} 
                disabled={loading} 
                className={`w-full py-3 rounded-md text-white font-regular  mt-4 ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#418fde] hover:bg-[#3177c2]'}`}
              >
                {loading ? 'Sending...' : 'Join the Brigade'}
              </button>
              {error && <p className="text-red-600 mt-2 text-sm">{error}</p>}
            </div>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div id="verification-form" className="bg-white flex flex-row justify-center w-full">
          <div className="bg-white w-[375px] h-auto relative">
            <div className="w-80 h-auto mt-5 mx-auto rounded-[5px] border-2 border-solid border-[#abcae9] overflow-hidden">
              <div className="relative w-full h-[162px] overflow-hidden">
                <Image
                  src="/images/prizes/access-code-banner-mobile-828x420.png"
                  alt="Biome Brigade Mascot"
                  className="w-full h-full object-cover"
                  width={320}
                  height={162}
                  priority
                />
              </div>
              <div className="flex flex-col w-80 items-center justify-center gap-3 px-6 py-6">
                <div className="relative self-stretch [font-family:'Poppins-Bold',Helvetica] font-bold text-[#00263a] text-xl text-center tracking-[0] leading-[normal]">
                  Code Deployed!
                </div>

                <p className="relative self-stretch [font-family:'Poppins-Regular',Helvetica] font-regular text-[#00263a] text-base text-center tracking-[0] leading-[25.6px]">
                  Enter the 6-digit code below to continue your mission.
                </p>
                
                <div className="w-full space-y-4 mt-2">
                  <div className="relative w-full group">
                    <div className="relative h-12 rounded-[5px] border border-solid border-[#abcae9] bg-white">
                      <input
                        id="verificationCode"
                        type="text"
                        className="w-full h-full px-4 py-2 bg-transparent outline-none text-[#00263a] text-base font-regular"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        maxLength={6}
                        placeholder=" "
                      />
                      <label 
                        htmlFor="verificationCode"
                        className={`absolute left-4 text-[#418FDE] transition-all duration-200 pointer-events-none
                          ${code ? 'text-xs -top-2 bg-white px-1' : 'text-base top-3'}`}
                      >
                        6-digit code
                      </label>
                    </div>
                  </div>

                  <button
                    className="w-full h-12 bg-[#418FDE] hover:bg-[#2e7bc4] rounded-[5px] text-white font-medium text-base transition-colors duration-200 flex items-center justify-center"
                    onClick={verifyCode}
                    disabled={verifying || !code}
                  >
                    {verifying ? 'Verifying...' : 'Confirm Identity'}
                  </button>

                  <div className="text-center">
                    <button
                      className="text-[#418FDE] text-sm font-medium hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={sendOTP}
                      disabled={resendDisabled}
                    >
                      Resend Code
                    </button>
                  </div>
                  
                  {error && (
                    <p className="text-red-500 text-sm text-center mt-2">
                      {error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div id="prize-wheel" className="bg-white flex flex-row justify-center w-full">
          <div className="bg-white w-[375px] h-auto relative">
            <div className="w-80 h-auto mt-5 mx-auto rounded-[5px] border-2 border-solid border-[#abcae9] overflow-hidden">
              {/* <div className="relative w-full h-[162px] overflow-hidden">
                <Image
                  src="/images/prizes/wheel-banner-mobile-828x420.png"
                  alt="Spin to Win"
                  className="w-full h-full object-cover"
                  width={320}
                  height={162}
                  priority
                />
              </div> */}
              <div className="flex flex-col w-80 items-center justify-center gap-3 px-6 py-6">
                {showWheel ? (
                  <>
                    <div className="relative self-stretch [font-family:'Poppins-Bold',Helvetica] font-bold text-[#00263a] text-xl text-center tracking-[0] leading-[normal]">
                      Your Mission Awaits!
                    </div>
                    <p className="relative self-stretch [font-family:'Poppins-Regular',Helvetica] font-regular text-[#00263a] text-base text-center tracking-[0] leading-[25.6px] mb-4">
                      Spin the wheel to discover your prize. Every spin is a chance to win something amazing!
                    </p>
                    <div className="w-full flex justify-center">
                      <Wheel 
                        onSpinStart={() => setLoading(true)}
                        onSpinComplete={handleSpinComplete}
                        onError={(error) => {
                          setError(error);
                          setLoading(false);
                        }}
                      />
                    </div>
                    {error && (
                      <p className="text-red-500 text-sm text-center mt-2">
                        {error}
                      </p>
                    )}
                  </>
                ) : prize ? (
                  <div className="text-center">
                    <div className="relative self-stretch [font-family:'Poppins-Bold',Helvetica] font-bold text-[#00263a] text-2xl text-center tracking-[0] leading-[normal] mb-2">
                      Mission Complete! 🎉
                    </div>
                    <div className="mb-6 p-4 bg-[#f0f8ff] rounded-lg border border-[#d0e4ff]">
                      <p className="[font-family:'Poppins-SemiBold',Helvetica] text-[#1a5a96] text-lg">
                        You've won:
                      </p>
                      <p className="[font-family:'Poppins-Bold',Helvetica] text-[#00263a] text-xl mt-2">
                        {prize.name}
                      </p>
                    </div>
                    <p className="[font-family:'Poppins-Regular',Helvetica] text-[#00263a] text-base">
                      Thank you for participating in our mission!
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#418FDE] mb-6"></div>
                    <p className="[font-family:'Poppins-Medium',Helvetica] text-[#00263a] text-lg">
                      Preparing your mission reward...
                    </p>
                    <p className="[font-family:'Poppins-Regular',Helvetica] text-[#666] text-sm mt-2">
                      This will just take a moment
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
