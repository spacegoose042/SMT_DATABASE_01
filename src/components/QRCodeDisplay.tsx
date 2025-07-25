import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import { QrCodeIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';

interface QRCodeDisplayProps {
  qrCode: string;
  workOrderNumber: string;
  lineNumber?: number | null;
  size?: number;
  className?: string;
  showLabel?: boolean;
  clickable?: boolean;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  qrCode,
  workOrderNumber,
  lineNumber,
  size = 128,
  className = '',
  showLabel = true,
  clickable = true
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy QR code:', error);
    }
  };

  const handleQRClick = () => {
    if (clickable) {
      setIsModalOpen(true);
    }
  };

  if (!qrCode) {
    return (
      <div className={`flex items-center text-gray-400 ${className}`}>
        <QrCodeIcon className="h-5 w-5 mr-1" />
        <span className="text-sm">No QR Code</span>
      </div>
    );
  }

  return (
    <>
      {/* QR Code Display */}
      <div className={`inline-flex flex-col items-center ${className}`}>
        <div 
          className={`bg-white p-2 rounded-lg border-2 border-gray-200 ${clickable ? 'cursor-pointer hover:border-blue-300 transition-colors' : ''}`}
          onClick={handleQRClick}
          title={clickable ? 'Click to enlarge' : undefined}
        >
          <QRCode
            value={qrCode}
            size={size}
            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            viewBox={`0 0 256 256`}
          />
        </div>
        
        {showLabel && (
          <div className="mt-2 text-center">
            <div className="text-sm font-medium text-gray-900">{workOrderNumber}</div>
            {lineNumber !== null && lineNumber !== undefined && (
              <div className="text-xs text-gray-500">Line {lineNumber}</div>
            )}
            <div className="text-xs text-gray-400 font-mono mt-1">{qrCode}</div>
          </div>
        )}
      </div>

      {/* Modal for enlarged QR Code */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">QR Code</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Large QR Code */}
            <div className="flex justify-center mb-4">
              <div className="bg-white p-4 rounded-lg border">
                <QRCode
                  value={qrCode}
                  size={256}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  viewBox={`0 0 256 256`}
                />
              </div>
            </div>
            
            {/* QR Code Info */}
            <div className="text-center mb-4">
              <div className="text-lg font-medium text-gray-900">{workOrderNumber}</div>
              {lineNumber !== null && lineNumber !== undefined && (
                <div className="text-sm text-gray-500">Line Number: {lineNumber}</div>
              )}
              <div className="text-sm text-gray-400 font-mono mt-2 p-2 bg-gray-100 rounded">
                {qrCode}
              </div>
            </div>
            
            {/* Copy Button */}
            <div className="flex justify-center space-x-3">
              <button
                onClick={handleCopy}
                className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  copied 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : 'bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200'
                }`}
              >
                {copied ? (
                  <>
                    <CheckIcon className="h-4 w-4 mr-1" />
                    Copied!
                  </>
                ) : (
                  <>
                    <ClipboardDocumentIcon className="h-4 w-4 mr-1" />
                    Copy QR Code
                  </>
                )}
              </button>
              
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QRCodeDisplay; 