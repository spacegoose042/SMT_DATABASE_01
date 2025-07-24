import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TvIcon, ArrowRightIcon, RefreshCcwIcon, AlertCircle } from 'lucide-react';

interface ProductionLine {
  id: string;
  line_name: string;
  time_multiplier: number;
  active: boolean;
  shifts_per_day: number;
  hours_per_shift: number;
  days_per_week: number;
  created_at: string;
  updated_at: string;
}

const FloorDisplaySelect: React.FC = () => {
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  console.log('FloorDisplaySelect component loaded');

  useEffect(() => {
    console.log('useEffect triggered');
    fetchProductionLines();
  }, []);

  const fetchProductionLines = async () => {
    try {
      console.log('Fetching production lines...');
      setLoading(true);
      const baseUrl = process.env.NODE_ENV === 'production' ? '' : 'https://smtdatabase01-production.up.railway.app';
      const response = await fetch(`${baseUrl}/api/production-lines`);
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error('Failed to fetch production lines');
      }

      const data = await response.json();
      console.log('Received data:', data);
      setProductionLines(data.production_lines || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching production lines:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleLineSelect = (lineId: string) => {
    console.log('Line selected:', lineId);
    navigate(`/floor/${lineId}`);
  };

  console.log('Render state:', { loading, error, productionLinesCount: productionLines.length });

  if (loading) {
    return (
      <div className="min-h-screen bg-sy-black-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-sy-green-500 mx-auto mb-4"></div>
          <h3 className="text-2xl font-medium text-white">Loading Production Lines...</h3>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-sy-black-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-20 w-20 text-red-400 mx-auto mb-6" />
          <h3 className="text-3xl font-medium text-white mb-4">Error Loading Production Lines</h3>
          <p className="text-xl text-gray-300 mb-8">{error}</p>
          <button
            onClick={fetchProductionLines}
            className="bg-sy-green-600 hover:bg-sy-green-700 text-white px-8 py-4 rounded-lg text-xl flex items-center mx-auto"
          >
            <RefreshCcwIcon className="h-6 w-6 mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const activeLines = productionLines.filter(line => line.active);

  return (
    <div className="min-h-screen bg-sy-black-900 text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <TvIcon className="h-16 w-16 text-sy-green-400 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-white mb-4">Floor Display Selection</h1>
          <p className="text-xl text-gray-300">
            Choose a production line to view on the floor display
          </p>
          <p className="text-lg text-gray-400 mt-2">
            Found {activeLines.length} active production lines
          </p>
        </div>

        {/* Production Lines Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeLines.map((line) => (
            <div
              key={line.id}
              onClick={() => handleLineSelect(line.id)}
              className="bg-sy-black-800 rounded-xl p-6 border-2 border-gray-600 hover:border-sy-green-500 transition-all duration-200 cursor-pointer group hover:shadow-xl hover:shadow-sy-green-500/20"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-white group-hover:text-sy-green-400 transition-colors">
                  {line.line_name}
                </h3>
                <ArrowRightIcon className="h-6 w-6 text-gray-400 group-hover:text-sy-green-400 transition-colors" />
              </div>
              
              <div className="space-y-3">
                {line.time_multiplier !== 1 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Time Multiplier:</span>
                    <span className="bg-sy-gold-500 text-sy-black-900 px-3 py-1 rounded-full text-sm font-semibold">
                      {line.time_multiplier}x
                    </span>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Schedule:</span>
                  <span className="text-white">
                    {line.shifts_per_day}×{line.hours_per_shift}h, {line.days_per_week}d/wk
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Status:</span>
                  <span className="bg-sy-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    Active
                  </span>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-600">
                <div className="flex items-center justify-center text-sy-green-400 group-hover:text-white transition-colors">
                  <TvIcon className="h-5 w-5 mr-2" />
                  <span className="font-medium">Open Floor Display</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {activeLines.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-2xl font-medium text-gray-300 mb-2">No Active Production Lines</h3>
            <p className="text-gray-400">
              No production lines are currently active. Please contact your administrator.
            </p>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-12 bg-sy-black-800 rounded-xl p-6 border border-gray-600">
          <h3 className="text-xl font-bold text-sy-green-400 mb-4">Instructions</h3>
          <ul className="space-y-2 text-gray-300">
            <li>• Click on any production line to open its floor display</li>
            <li>• Floor displays are optimized for large screens and wall mounting</li>
            <li>• Displays automatically refresh with real-time work order updates</li>
            <li>• Use full-screen mode (F11) for the best experience</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FloorDisplaySelect; 