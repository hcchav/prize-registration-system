'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import ReactConfetti to ensure it only loads on the client side
const ReactConfetti = dynamic(() => import('react-confetti'), {
  ssr: false
});
import 'react-phone-input-2/lib/style.css';
import PhoneInput, { CountryData } from 'react-phone-input-2';
import Image from 'next/image';
import Wheel from '@/components/Wheel';
import { type Prize } from '@/constants/prizes';
import Dropdown from '@/components/Dropdown';
import CheckboxDropdown from '@/components/CheckboxDropdown';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC', 'AS', 'GU', 'MP', 'PR', 'UM', 'VI'
];

const formatRegNumber = (id: string) => {
  if (!id) return 'N/A';
  // Extract numbers from the ID and take the last 4 digits
  const numbers = id.replace(/\D/g, '');
  const lastFour = numbers.slice(-4).padStart(4, '0');
  return lastFour;
};

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
    supplierOther: '',
    manufacturerOptions: [] as string[],
    manufacturerOther: '',
    email: '',
    phone: '',
    method: 'email',
    consent: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [code, setCode] = useState('');
  const [prize, setPrize] = useState<Prize | null>(null);
  const [noPrizeAvailable, setNoPrizeAvailable] = useState(false);
  const [showWheel, setShowWheel] = useState(true);
  const [showCongratsModal, setShowCongratsModal] = useState(false);
  const [error, setError] = useState('');
  const [resendDisabled, setResendDisabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [countryCode, setCountryCode] = useState('+1');
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiRef = useRef<HTMLDivElement>(null);

  // Set up window size tracking for confetti
  useEffect(() => {
    const updateWindowSize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Set initial size
    updateWindowSize();

    // Add event listener for window resize
    window.addEventListener('resize', updateWindowSize);

    // Clean up
    return () => window.removeEventListener('resize', updateWindowSize);
  }, []);

  // Show confetti when congrats modal is shown
  useEffect(() => {
    if (showCongratsModal) {
      setShowConfetti(true);
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 5000); // Stop confetti after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [showCongratsModal]);

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleChange = (field: string, value: string | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.firstName.trim()) newErrors.firstName = 'Please enter a first name';
    if (!formData.lastName.trim()) newErrors.lastName = 'Please enter a last name';
    if (!formData.company.trim()) newErrors.company = 'Please enter a company name';
    if (!formData.address.trim()) newErrors.address = 'Please enter an address';
    if (!formData.city.trim()) newErrors.city = 'Please enter a city';
    if (!formData.state.trim()) newErrors.state = 'Please enter a state';
    if (!formData.zip.trim()) newErrors.zip = 'Please enter a zip code';
    if (!formData.function) newErrors.function = 'Please select a company function';
    
    // Special validation for function-specific fields
    if (formData.function === 'Supplier' && !formData.subcategory) {
      newErrors.subcategory = 'Please select a supplier subcategory';
    } else if (formData.function === 'Manufacturer' && formData.manufacturerOptions.length === 0) {
      newErrors.manufacturerOptions = 'Please select at least one manufacturer category';
    } else if (['Retailer', 'Wholesaler'].includes(formData.function) && !formData.subcategory) {
      newErrors.subcategory = `Please select a ${formData.function.toLowerCase()} region`;
    } else if (formData.function === 'Other' && !formData.subcategory) {
      newErrors.subcategory = 'Please specify';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Please enter an email address';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone validation
    if (!formData.phone) {
      newErrors.phone = 'Please enter a phone number';
    } else if (formData.phone.replace(/\D/g, '').length < 10) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    // Consent validation
    if (!formData.consent) {
      newErrors.consent = 'Please consent to receive a verification code';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const sendOTP = async () => {
    if (!validateForm()) {
      return;
    }
    
    setError('');
    setLoading(true);
    setResendDisabled(true);

    const res = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        addressLine2: formData.aptSuiteBuilding, // Map aptSuiteBuilding to addressLine2 for the API
        zipCode: formData.zip, // Map zip to zipCode for the API
        subcategory:
          formData.function === 'Manufacturer'
            ? [...formData.manufacturerOptions, formData.manufacturerOther].filter(Boolean).join(', ')
            : formData.subcategory,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok && data.success) {
      setStep(2);
      if (data.attendeeId) {
        localStorage.setItem('attendeeId', data.attendeeId);
        localStorage.setItem('attendeeEmail', formData.email);
      }
    } else {
      setError(data.error || 'Failed to send code. Please try again.');
    }

    setResendDisabled(false);
    if (!res.ok) return; // Don't set the timeout if the request failed
    
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
        return;
      }

      // Store the attendee ID from the verification response
      if (data.attendeeId) {
        localStorage.setItem('attendeeId', data.attendeeId);
        localStorage.setItem('attendeeEmail', formData.email);
        
        // Store the claim ID if available
        if (data.claimId) {
          localStorage.setItem('claimId', data.claimId.toString());
          console.log('Claim ID generated and stored:', data.claimId);
        }
      }

      setVerified(true);
      setStep(3);
    } catch (err) {
      setVerifying(false);
      setError('An error occurred. Please try again.');
      console.error('Verification error:', err);
    }
  };

  const handlePrizeSelection = async (winningPrize: Prize) => {
    try {
      setVerifying(true);
      setError('');
      
      // Get attendee ID from local storage
      const attendeeId = localStorage.getItem('attendeeId');
      if (!attendeeId) {
        throw new Error('No attendee ID found. Please try registering again.');
      }
      
      console.log('Claiming prize for attendee ID:', { attendeeId, prizeId: winningPrize.id });

      // Claim the prize using the assign-prize endpoint
      const claimResponse = await fetch('/api/assign-prize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prizeId: winningPrize.id,
          attendeeIdentifier: attendeeId
        }),
      });

      const claimData = await claimResponse.json();
      
      if (!claimResponse.ok) {
        console.error('Prize claim failed:', claimData);
        
        // Handle out of stock with retry
        if (claimData.code === 'PRIZE_OUT_OF_STOCK_RETRY') {
          setError(claimData.details);
          // Don't set loading to false here, let the wheel handle the retry
          return;
        }
        
        // Handle no prizes available
        if (claimData.code === 'NO_PRIZES_AVAILABLE') {
          setError(claimData.details);
          setShowWheel(false);
          return;
        }
        
        // Handle other errors
        throw new Error(claimData.error || 'Failed to claim prize.');
      }
      
      // Update the prize state with the assigned prize
      setPrize(winningPrize);
      setShowWheel(false);
      
      console.log('Prize assigned successfully:', claimData);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process prize. Please try again.';
      setError(errorMessage);
      console.error('Prize processing error:', err);
    } finally {
      setVerifying(false);
      setLoading(false);
    }
  };

  const handleSpinComplete = (prize: Prize | null) => {
    if (!prize) {
      setNoPrizeAvailable(true);
      setPrize(null);
    } else {
      setNoPrizeAvailable(false);
      setPrize(prize);
    }
    setLoading(false);
    setShowCongratsModal(true);
  };



  useEffect(() => {
    // When the component mounts, show the wheel if we don't have a prize yet
    if (!prize) {
      setShowWheel(true);
    }
  }, [prize]);

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
              <div className="relative self-stretch  font-bold text-[#00263a] text-xl text-center tracking-[0] leading-[normal]">
                Join the Biome Brigade®
              </div>

              <p className="relative self-stretch  font-regular  text-[#00263a] text-base text-center tracking-[0] leading-[25.6px]">
              Complete the form to receive the Biome Brigade Comic Collectible, and a FREE GIVEAWAY!
              </p>

              <div className="w-full space-y-3   ">
                <div className="relative w-full group">
                  <div className={`relative h-12 rounded-[5px] border border-solid ${
                    errors.firstName ? 'border-[#D03C3C]' : 'border-[#abcae9]'
                  } ${errors.firstName ? 'bg-[#FFF0F0]' : 'bg-white'}`}>
                    <input
                      id="firstName"
                      type="text"
                      className={`w-full h-full px-3.5 pt-1 pb-0 bg-transparent outline-none   ${
                        errors.firstName ? 'text-[#D03C3C]' : 'text-[#418FDE]'
                      } text-sm text-[12px] font-regular peer ${
                        formData.firstName ? 'text-[14px] translate-y-1 ' : 'top-3'
                      }`}
                      onChange={(e) => handleChange('firstName', e.target.value)}
                      value={formData.firstName}
                      placeholder=" "
                    />
                    <label 
                      htmlFor="firstName"
                      className={`absolute left-3.5  ${
                        errors.firstName ? 'text-[#D03C3C]' : 'text-[#418FDE]'
                      } transition-all duration-200 pointer-events-none ${
                        formData.firstName ? 'text-[10px] translate-y-1' : 'text-[14px] top-3'
                      }`}
                    >
                      First Name
                    </label>
                  </div>
                  {errors.firstName && <p className="text-red-600 mt-2 text-xs pl-4 ">{errors.firstName}</p>}
                </div>

                <div className="relative w-full group">
                  <div className={`relative h-12 rounded-[5px] border border-solid ${
                    errors.lastName ? 'border-[#D03C3C]' : 'border-[#abcae9]'
                  } ${errors.lastName ? 'bg-[#FFF0F0]' : 'bg-white'}`}>
                    <input
                      id="lastName"
                      type="text"
                      className={`w-full h-full px-3.5 pt-1 pb-0 bg-transparent outline-none ${
                        errors.lastName ? 'text-[#D03C3C]' : 'text-[#418FDE]'
                      } text-sm text-[12px] font-regular peer ${
                        formData.lastName ? 'text-[14px] translate-y-1' : 'top-3'
                      }`}
                      onChange={(e) => handleChange('lastName', e.target.value)}
                      value={formData.lastName}
                      placeholder=" "
                    />
                    <label 
                      htmlFor="lastName"
                      className={`absolute left-3.5 ${
                        errors.lastName ? 'text-[#D03C3C]' : 'text-[#418FDE]'
                      } transition-all duration-200 pointer-events-none ${
                        formData.lastName ? 'text-[10px] translate-y-1' : 'text-[14px] top-3'
                      }`}
                    >
                      Last Name
                    </label>
                  </div>
                  {errors.lastName && <p className="text-red-600 mt-2 text-xs pl-4 ">{errors.lastName}</p>}
                </div>

                <div className="relative w-full group">
                  <div className={`relative h-12 rounded-[5px] border border-solid ${
                    errors.company ? 'border-[#D03C3C]' : 'border-[#abcae9]'
                  } ${errors.company ? 'bg-[#FFF0F0]' : 'bg-white'}`}>
                    <input
                      id="company"
                      type="text"
                      className={`w-full h-full px-3.5 pt-1 pb-0 bg-transparent outline-none ${
                        errors.company ? 'text-[#D03C3C]' : 'text-[#418FDE]'
                      } text-sm text-[12px] font-regular peer ${
                        formData.company ? 'text-[14px] translate-y-1' : 'top-3'
                      }`}
                      onChange={(e) => handleChange('company', e.target.value)}
                      value={formData.company}
                      placeholder=" "
                    />
                    <label 
                      htmlFor="company"
                      className={`absolute left-3.5 ${
                        errors.company ? 'text-[#D03C3C]' : 'text-[#418FDE]'
                      } transition-all duration-200 pointer-events-none ${
                        formData.company ? 'text-[10px] translate-y-1' : 'text-[14px] top-3'
                      }`}
                    >
                      Company Name
                    </label>
                  </div>
                  {errors.company && <p className="text-red-600 mt-2 text-xs pl-4 ">{errors.company}</p>}
                </div>

                <div className="relative w-full group">
                  <div className={`relative h-12 rounded-[5px] border border-solid ${
                    errors.address ? 'border-[#D03C3C]' : 'border-[#abcae9]'
                  } ${errors.address ? 'bg-[#FFF0F0]' : 'bg-white'}`}>
                    <input
                      id="address"
                      type="text"
                      className={`w-full h-full px-3.5 pt-1 pb-0 bg-transparent outline-none ${
                        errors.address ? 'text-[#D03C3C]' : 'text-[#418FDE]'
                      } text-sm text-[12px] font-regular peer ${
                        formData.address ? 'text-[14px] translate-y-1' : 'top-3'
                      }`}
                      onChange={(e) => handleChange('address', e.target.value)}
                      value={formData.address}
                      placeholder=" "
                    />
                    <label 
                      htmlFor="address"
                      className={`absolute left-3.5 ${
                        errors.address ? 'text-[#D03C3C]' : 'text-[#418FDE]'
                      } transition-all duration-200 pointer-events-none ${
                        formData.address ? 'text-[10px] translate-y-1' : 'text-[14px] top-3'
                      }`}
                    >
                      Company Street Address
                    </label>
                  </div>
                  {errors.address && <p className="text-red-600 mt-2 text-xs pl-4 ">{errors.address}</p>}
                </div>

                <div className="relative w-full group">
                  <div className="relative h-12 rounded-[5px] border border-solid border-[#abcae9] bg-white">
                    <input
                      id="aptSuiteBuilding"
                      type="text"
                      className={`w-full h-full px-3.5 pt-1 pb-0 bg-transparent outline-none text-[#418FDE] text-sm text-[12px] font-regular peer
                      ${formData.aptSuiteBuilding ? 'text-[14px] translate-y-1' : 'top-3'}`}
                      onChange={(e) => handleChange('aptSuiteBuilding', e.target.value)}
                      value={formData.aptSuiteBuilding}
                      placeholder=" "
                    />
                    <label 
                      htmlFor="aptSuiteBuilding"
                      className={`absolute left-3.5 text-[#418FDE] transition-all duration-200 pointer-events-none
                        ${formData.aptSuiteBuilding ? 'text-[10px] translate-y-1' : 'text-[14px] top-3'}`}
                    >
                      Apt, Suite, Building (Optional)
                    </label>
                  </div>
                </div>
                {/* City */}
                <div className="relative w-full group">
                  <div className={`relative h-12 rounded-[5px] border border-solid ${
                    errors.city ? 'border-[#D03C3C]' : 'border-[#abcae9]'
                  } ${errors.city ? 'bg-[#FFF0F0]' : 'bg-white'}`}>
                    <input
                      id="city"
                      type="text"
                      className={`w-full h-full px-3.5 pt-1 pb-0 bg-transparent outline-none ${
                        errors.city ? 'text-[#D03C3C]' : 'text-[#418FDE]'
                      } text-sm text-[12px] font-regular peer ${
                        formData.city ? 'text-[14px] translate-y-1' : 'top-3'
                      }`}
                      onChange={(e) => handleChange('city', e.target.value)}
                      value={formData.city}
                      placeholder=" "
                    />
                    <label 
                      htmlFor="city"
                      className={`absolute left-3.5 ${
                        errors.city ? 'text-[#D03C3C]' : 'text-[#418FDE]'
                      } transition-all duration-200 pointer-events-none ${
                        formData.city ? 'text-[10px] translate-y-1' : 'text-[14px] top-3'
                      }`}
                    >
                      City
                    </label>
                  </div>
                  {errors.city && <p className="text-red-600 mt-2 text-xs pl-4 ">{errors.city}</p>}
                </div>

                <div className="flex gap-2">
                  {/* state */}
                  <div className="w-1/2">
                    <div className="relative h-12 rounded-[5px] border border-solid border-[#abcae9] bg-white">
                      <select
                        id="state"
                        value={formData.state}
                        onChange={(e) => handleChange('state', e.target.value)}
                        className={`w-full h-full px-3.5 pt-1 pb-0 bg-transparent outline-none text-[#418FDE] text-sm appearance-none`}
                      >
                        <option value="">State</option>
                        {US_STATES.map((state) => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <svg 
                          width="12" 
                          height="8" 
                          viewBox="0 0 12 8" 
                          fill="none" 
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M1 1.5L6 6.5L11 1.5" stroke="#418FDE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                    {errors.state && <p className="text-red-600 mt-2 text-xs pl-4 ">{errors.state}</p>}
                  </div>
                  {/* zip code */}
                  <div className="w-1/2">
                    <div className={`relative h-12 rounded-[5px] border border-solid ${
                      errors.zip ? 'border-[#D03C3C]' : 'border-[#abcae9]'
                    } ${errors.zip ? 'bg-[#FFF0F0]' : 'bg-white'}`}>
                      <input
                        id="zip"
                        type="text"
                        className={`w-full h-full px-3.5 pt-1 pb-0 bg-transparent outline-none ${
                          errors.zip ? 'text-[#D03C3C]' : 'text-[#418FDE]'
                        } text-sm text-[12px] font-regular peer ${
                          formData.zip ? 'text-[14px] translate-y-1' : 'top-3'
                        }`}
                        onChange={(e) => handleChange('zip', e.target.value)}
                        value={formData.zip}
                        placeholder=" "
                      />
                      <label 
                        htmlFor="zip"
                        className={`absolute left-3.5 ${
                          errors.zip ? 'text-[#D03C3C]' : 'text-[#418FDE]'
                        } transition-all duration-200 pointer-events-none ${
                          formData.zip ? 'text-[10px] translate-y-1' : 'text-[14px] top-3'
                        }`}
                      >
                        Zip Code
                      </label>
                    </div>
                    {errors.zip && <p className="text-red-600 mt-2 text-xs pl-4 ">{errors.zip}</p>}
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
                  {errors.function && <p className="text-red-600 mt-2 text-xs pl-4 ">{errors.function}</p>}
                </div>

            
              </div>

              {step === 1 && formData.function === 'Supplier' && (
                <div className="w-full">
                  <Dropdown
                    label="Supplier Subcategory"
                    value={formData.subcategory}
                    onChange={(value) => {
                      if (value !== 'Other') {
                        handleChange('subcategory', value);
                      } else {
                        handleChange('subcategory', formData.supplierOther || 'Other');
                      }
                    }}
                    options={[
                      { value: '', label: 'Supplier Subcategory (Select)' },
                      { value: 'Ingredients', label: 'Ingredients' },
                      { value: 'Toys', label: 'Toys' },
                      { value: 'Packaging', label: 'Packaging' },
                      { value: formData.supplierOther || 'Other', label: 'Other' },
                    ]}
                  />
                  {(formData.subcategory === 'Other' || formData.supplierOther) && (
                    <div className="mt-2">
                      <input 
                        className="w-full border border-[#abcae9] p-3 rounded-[5px] text-[#418FDE] text-sm" 
                        placeholder="Please specify" 
                        value={formData.supplierOther}
                        onChange={(e) => {
                          const value = e.target.value;
                          handleChange('supplierOther', value);
                          handleChange('subcategory', value || 'Other');
                        }}
                        style={{ height: '48px' }}
                      />
                    </div>
                  )}
                  {errors.subcategory && <p className="text-red-600 mt-2 text-xs pl-4">{errors.subcategory}</p>}
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
                  {errors.manufacturerOptions && <p className="text-red-600 mt-2 text-xs pl-4 ">{errors.manufacturerOptions}</p>}
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
                  {errors.subcategory && <p className="text-red-600 mt-2 text-xs pl-4 ">{errors.subcategory}</p>}
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
                  {errors.subcategory && <p className="text-red-600 mt-2 text-xs pl-4 ">{errors.subcategory}</p>}
                </div>
              )}

              <div className={`relative h-12 rounded-[5px] border border-solid w-full ${
                errors.email ? 'border-[#D03C3C]' : 'border-[#abcae9]'
              } ${errors.email ? 'bg-[#FFF0F0]' : 'bg-white'}`}>
                <input
                  id="email"
                  type="email"
                  className={`w-full h-full px-3.5 pt-1 pb-0 bg-transparent outline-none ${
                    errors.email ? 'text-[#D03C3C]' : 'text-[#418FDE]'
                  } text-sm text-[12px] font-regular peer ${
                    formData.email ? 'text-[14px] translate-y-1' : 'top-3'
                  }`}
                  onChange={(e) => handleChange('email', e.target.value)}
                  value={formData.email}
                  placeholder=" "
                />
                <label 
                  htmlFor="email"
                  className={`absolute left-3.5 ${
                    errors.email ? 'text-[#D03C3C]' : 'text-[#418FDE]'
                  } transition-all duration-200 pointer-events-none ${
                    formData.email ? 'text-[10px] translate-y-1' : 'text-[14px] top-3'
                  }`}
                >
                  Email Address
                </label>
              </div>
              {errors.email && <p className="text-red-600 mt-2 text-xs pl-4 ">{errors.email}</p>}

              <div className={`w-full h-12 rounded-[5px] border border-solid ${
                errors.phone ? 'border-[#D03C3C]' : 'border-[#abcae9]'
              } relative ${errors.phone ? 'bg-[#FFF0F0]' : 'bg-white'}`}>
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
                  inputClass={`w-full h-full px-3.5 bg-transparent outline-none ${
                    errors.phone ? 'text-[#D03C3C]' : 'text-[#418FDE]'
                  } text-sm font-regular pl-20 caret-[#418FDE]`}
                  buttonClass="!bg-transparent !border-none !text-[#418FDE] !px-3 !absolute !left-0 !top-0 !h-full !flex !items-center"
                  dropdownClass="!bg-white !border !border-[#abcae9] !rounded-[5px] !z-50"
                  containerClass="!w-full h-full relative !z-50"
                  inputStyle={{
                    width: '100%',
                    height: '100%',
                    color: errors.phone ? '#D03C3C' : '#418FDE',
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
                    color: errors.phone ? '#D03C3C' : '#00263a',
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
                  className={`absolute left-15 ${
                    errors.phone ? 'text-[#D03C3C]' : 'text-[#418FDE]'
                  } text-[12px] text-sm duration-200 top-1`}
                >
                  Phone Number
                </label>
              </div>
              {errors.phone && <p className="text-red-600 mt-2 text-xs pl-4 ">{errors.phone}</p>}
              <div className="text-left w-full font-semibold text-[#00263A] text-sm peer  ">Confirm verification method:</div>
              

              
              <div className="flex gap-6 w-full">
                <label className="flex items-center gap-3 cursor-pointer  ">
                  <input 
                    type="radio" 
                    name="method" 
                    value="email" 
                    checked={formData.method === 'email'} 
                    onChange={(e) => handleChange('method', e.target.value)} 
                    className="h-4 w-4 text-[#418FDE] "
                  />
                  <span className="text-[14px] ">Email</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer  ">
                  <input 
                    type="radio" 
                    name="method" 
                    value="sms" 
                    checked={formData.method === 'sms'} 
                    onChange={(e) => handleChange('method', e.target.value)} 
                    className="h-4 w-4 text-[#418FDE]"
                  />
                  <span className="text-[14px] ">SMS</span>
                </label>
              </div>

              <label className="inline-flex items-center mt-1 text-[14px] ">
                <input 
                  type="checkbox" 
                  className={`mr-2 p-1.5 ${errors.consent ? 'border-[#D03C3C]' : ''}`} 
                  onChange={(e) => handleChange('consent', e.target.checked)} 
                  checked={formData.consent} 
                />
                I consent to receive a verification code and be entered into the prize giveaway.
              </label>
            
              {errors.consent && <p className="text-red-600 mt-2 text-xs pl-4 ">{errors.consent}</p>}

              <button 
                onClick={sendOTP} 
                disabled={loading} 
                className={`w-full py-3 rounded-md text-white font-regular  mt-4 ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#418fde] hover:bg-[#3177c2]'}`}
              >
                {loading ? 'Sending...' : 'Submit'}
              </button>
              {error && <p className="text-red-600 mt-2 text-xs pl-4 ">{error}</p>}
              <p className="text-[#666] text-[10px] mt-1 pl-6 ">
                Your information will not be shared with any third party, for any reason, ever.
              </p>
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
                <div className="relative self-stretch  font-bold text-[#00263a] text-xl text-center tracking-[0] leading-[normal]">
                  Code Deployed!
                </div>

                <p className="relative self-stretch  font-regular text-[#00263a] text-base text-center tracking-[0] leading-[25.6px]">
                  Enter the 6-digit code below to continue your mission.
                </p>
                
                <div className="w-full space-y-4 mt-2">
                  <div className="relative w-full group">
                    <div className={`relative h-12 rounded-[5px] border border-solid ${
                      error && code.length > 0 ? 'border-[#D03C3C]' : 'border-[#abcae9]'
                    } ${error && code.length > 0 ? 'bg-[#FFF0F0]' : 'bg-white'}`}>
                      <input
                        id="verificationCode"
                        type="text"
                        className={`w-full h-full mt-1.5 px-4 py-2 bg-transparent outline-none ${
                          error && code.length > 0 ? 'text-[#D03C3C]' : 'text-[#00263a]'
                        } text-base font-regular`}
                        value={code}
                        onChange={(e) => {
                          setCode(e.target.value);
                          // Clear error when user starts typing
                          if (error) setError('');
                        }}
                        maxLength={6}
                        placeholder=" "
                      />
                      <label 
                        htmlFor="verificationCode"
                        className={`absolute left-4 ${
                          error && code.length > 0 ? 'text-[#D03C3C]' : 'text-[#418FDE]'
                        } transition-all duration-200 pointer-events-none ${
                          code ? 'text-xs top-1' : 'text-base top-3'
                        }`}
                      >
                        6-digit code
                      </label>
                    </div>
                    {error && code.length > 0 && (
                      <p className="text-[#D03C3C] mt-2 text-xs pl-4">
                        Code invalid. Please try again.
                      </p>
                    )}
                    <p className="text-[#666] text-xs mt-2 pl-4">
                      Tip: Can't find the code? Check your Spam or Promotions folder.
                    </p>
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
                  
                  {/* {error && (
                    <p className="text-red-500 text-sm text-center mt-2">
                      {error}
                    </p>
                  )} */}
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
              <div className="flex flex-col w-80 items-center justify-center gap-3 px-2 py-6">
                <div className="w-full flex flex-col items-center" style={{ opacity: showCongratsModal ? 0.3 : 1, transition: 'opacity 0.3s ease' }}>
                  <div className="relative self-stretch font-bold text-[#00263a] text-xl text-center tracking-[0] leading-[normal] mb-4">
                    CLAIM YOUR PRIZE!
                  </div>
                  <div className="flex justify-center items-center w-full py-4 relative">
                    <div className="flex justify-center items-center w-full">
                      <Wheel 
                        onSpinStart={() => setLoading(true)}
                        onSpinComplete={handleSpinComplete}
                        onError={(error) => {
                          setError(error);
                          setLoading(false);
                        }}
                      />
                    </div>
                  </div>
                  {error && (
                    <p className="text-red-500 text-sm text-center mt-2">
                      {error}
                    </p>
                  )}
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
                  <div className="fixed inset-0 flex items-center justify-center z-50">
                    <div className="fixed inset-0 bg-black opacity-50"></div>
                    <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 z-10">
                      <div className="text-center">
                        {noPrizeAvailable ? (
                          <>
                            <div className="font-bold text-2xl text-[#00263a] mb-4">
                            All Prizes Claimed. Thank you for participating!
                            </div>
                            {/* <div className="mb-4">
                              <p className="text-base text-[#00263a]">
                                Go to the Biome Brigade Booth (#8737) to Claim Your
                              </p>
                              <p className="text-[var(--brand-lightblue-1000)] text-xl font-bold mt-2">
                                Biome Brigade Comic Collectible
                              </p>
                            </div> */}
                          </>
                        ) : (
                          <>
                            <div className="font-bold text-2xl text-[#00263a] mb-4">
                              CONGRATULATIONS!
                            </div>
                            <div className="mb-4">
                              <p className="text-base text-[#00263a]">
                                Go to the Biome Brigade Booth (#8737) to Claim Your
                              </p>
                              <p className="text-[var(--brand-lightblue-1000)] text-xl font-bold mt-2">
                                {prize?.name || 'Your Prize'}
                              </p>
                              <p className="text-[#00263a] text-sm mt-3">
                                Your Claim # is {formatRegNumber(localStorage.getItem('claimId') || localStorage.getItem('attendeeId') || 'N/A')}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
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
