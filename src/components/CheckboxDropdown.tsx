import { useState, useEffect } from 'react';

interface CheckboxDropdownProps {
  label: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
  placeholder?: string;
}

export default function CheckboxDropdown({ 
  label, 
  options, 
  value = [], 
  onChange, 
  className = '',
  placeholder = 'Select options...'
}: CheckboxDropdownProps) {
  const [isOpen, setIsOpen] = useState(true); // Set to true to keep it permanently open
  const [selectedValues, setSelectedValues] = useState<string[]>(value);

  // Update internal state when external value changes
  useEffect(() => {
    setSelectedValues(value);
  }, [value]);

  const toggleOption = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent dropdown from closing
    const newSelectedValues = selectedValues.includes(optionValue)
      ? selectedValues.filter(val => val !== optionValue)
      : [...selectedValues, optionValue];
    
    setSelectedValues(newSelectedValues);
    onChange(newSelectedValues);
  };

  const getSelectedCount = () => {
    if (selectedValues.length === 0) return '';
    return ` (${selectedValues.length} selected)`;
  };

  return (
    <div className={`w-full relative ${className}`}>
      {/* Selected options display */}
      <div 
        className="w-full min-h-12 px-4 py-3 border border-solid border-[#abcae9] flex items-center justify-between cursor-default rounded-t-[5px]"
      >
        <span className="text-[#418FDE] text-sm text-[14px] font-regular truncate">
          {label}
        </span>
        <div className="flex items-center">
          {selectedValues.length > 0 && (
            <span className="bg-[#418FDE] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center mr-2">
              {selectedValues.length}
            </span>
          )}
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
      </div>

      {/* Dropdown options - Removed absolute positioning and added margin-top */}
      {isOpen && (
        <div className="w-full mt-[-1px] rounded-b-[5px] border border-t-0 border-[#abcae9] bg-white max-h-60 overflow-y-auto z-10 shadow-lg">
          {options.map((option) => (
            <div
              key={option.value}
              className="px-4 py-2 cursor-pointer hover:bg-gray-100 flex items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                id={`checkbox-${option.value}`}
                checked={selectedValues.includes(option.value)}
                onChange={() => {}} // Keep this to satisfy React
                onClick={(e) => toggleOption(option.value, e)}
                className="mr-2"
              />
              <label 
                htmlFor={`checkbox-${option.value}`}
                className="text-[#00263A] text-sm font-regular cursor-pointer select-none"
              >
                {option.label}
              </label>
            </div>
          ))}
        </div>
      )}
      
      {/* Remove click outside to close functionality */}
    </div>
  );
}
