import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline';

interface StatusOption {
  value: string;
  label: string;
  color: string;
}

interface StatusDropdownProps {
  currentStatus: string;
  workOrderId: string;
  workOrderNumber: string;
  onStatusChange: (workOrderId: string, newStatus: string) => void;
  disabled?: boolean;
}

const STATUS_OPTIONS: StatusOption[] = [
  { value: '1st Side Ready', label: '1st Side Ready', color: 'bg-yellow-500' },
  { value: 'Ready', label: 'Ready', color: 'bg-green-500' },
  { value: 'Ready*', label: 'Ready*', color: 'bg-green-400' },
  { value: 'In Progress', label: 'In Progress', color: 'bg-blue-500' },
  { value: 'Setup', label: 'Setup', color: 'bg-purple-500' },
  { value: 'Running', label: 'Running', color: 'bg-indigo-500' },
  { value: 'Quality Check', label: 'Quality Check', color: 'bg-orange-500' },
  { value: 'On Hold', label: 'On Hold', color: 'bg-yellow-600' },
  { value: 'Issues', label: 'Issues', color: 'bg-red-500' },
  { value: 'Completed', label: 'Completed', color: 'bg-green-600' },
  { value: 'Missing TSM-125-01-L-DV', label: 'Missing Parts', color: 'bg-red-600' },
  { value: 'Cancelled', label: 'Cancelled', color: 'bg-gray-500' }
];

const StatusDropdown: React.FC<StatusDropdownProps> = ({
  currentStatus,
  workOrderId,
  workOrderNumber,
  onStatusChange,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentStatusOption = STATUS_OPTIONS.find(option => option.value === currentStatus) || {
    value: currentStatus,
    label: currentStatus,
    color: 'bg-gray-400'
  };

  const handleStatusSelect = async (newStatus: string) => {
    if (newStatus === currentStatus || isUpdating) return;

    setIsUpdating(true);
    setIsOpen(false);

    try {
      await onStatusChange(workOrderId, newStatus);
    } catch (error) {
      console.error('Failed to update status:', error);
      // The parent component will handle error display
    } finally {
      setIsUpdating(false);
    }
  };

  if (disabled) {
    return (
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${currentStatusOption.color}`}></div>
        <span className="text-sm text-gray-600">{currentStatusOption.label}</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className={`
          flex items-center space-x-2 px-3 py-1 rounded-md border text-sm
          transition-colors duration-200
          ${isUpdating
            ? 'bg-gray-100 cursor-not-allowed opacity-50'
            : 'bg-white hover:bg-gray-50 cursor-pointer border-gray-300'
          }
        `}
      >
        <div className={`w-3 h-3 rounded-full ${currentStatusOption.color}`}></div>
        <span className="text-gray-700">{currentStatusOption.label}</span>
        {isUpdating ? (
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
        ) : (
          <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-48 bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="py-1">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleStatusSelect(option.value)}
                className={`
                  w-full flex items-center space-x-3 px-3 py-2 text-sm text-left
                  transition-colors duration-150
                  ${option.value === currentStatus
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <div className={`w-3 h-3 rounded-full ${option.color}`}></div>
                <span className="flex-1">{option.label}</span>
                {option.value === currentStatus && (
                  <CheckIcon className="w-4 h-4 text-blue-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusDropdown; 