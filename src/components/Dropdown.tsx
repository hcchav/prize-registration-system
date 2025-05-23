import { useState } from 'react';

interface DropdownProps {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function Dropdown({ 
  label, 
  options, 
  value, 
  onChange, 
  className = '' 
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <div className={`w-72 h-36 relative ${className}`}>
      {/* Selected option display */}
      <div 
        className={`w-full h-12 px-4 py-3 border border-indigo-300 bg-white flex items-center justify-between cursor-pointer ${
          isOpen ? 'rounded-t-[5px]' : 'rounded-[5px]'
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-blue-500 text-sm font-normal font-['Poppins'] leading-snug">
          {selectedOption?.label || label}
        </span>
        <svg 
          className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          width="12" 
          height="8" 
          viewBox="0 0 12 8" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M1 1.5L6 6.5L11 1.5" stroke="#418FDE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Dropdown options */}
      {isOpen && (
        <div className="absolute w-full mt-0 rounded-b-[5px] border border-t-0 border-indigo-300 bg-white z-10">
          {options.map((option) => (
            <div
              key={option.value}
              className={`px-4 py-3 cursor-pointer hover:bg-gray-50 text-teal-950 text-sm font-normal font-['Poppins'] leading-snug ${
                value === option.value ? 'bg-blue-50' : ''
              }`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
