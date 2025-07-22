import React from 'react';

function Dashboard() {
  // Mock data - will be replaced with real API calls
  const stats = [
    { name: 'Active Work Orders', value: '12', change: '+2', changeType: 'positive' },
    { name: 'Production Lines', value: '4/5', change: '1 down', changeType: 'negative' },
    { name: 'Trolleys in Use', value: '15/20', change: '75%', changeType: 'neutral' },
    { name: 'Today\'s Schedule', value: '8 jobs', change: 'On track', changeType: 'positive' },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-sy-black-900">Dashboard</h1>
        <p className="mt-1 text-sm text-sy-black-600">
          Overview of S&Y Industries production schedule and status
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div key={item.name} className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-sy-black-600">{item.name}</p>
                  <p className="text-2xl font-semibold text-sy-black-900">{item.value}</p>
                </div>
                <div className={`inline-flex items-baseline px-2.5 py-0.5 rounded-full text-sm font-medium ${
                  item.changeType === 'positive' 
                    ? 'bg-sy-green-100 text-sy-green-800' 
                    : item.changeType === 'negative'
                    ? 'bg-sy-gold-100 text-sy-gold-800'
                    : 'bg-sy-black-100 text-sy-black-800'
                }`}>
                  {item.change}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Today's Schedule */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-sy-black-900">Today's Schedule</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-sy-green-50 rounded-lg">
                <div>
                  <p className="font-medium text-sy-black-900">WO-2024-001</p>
                  <p className="text-sm text-sy-black-600">Acme Electronics - PCB-001</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-sy-black-900">8:00 - 12:30</p>
                  <p className="text-xs text-sy-black-600">Line 2</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-sy-gold-50 rounded-lg">
                <div>
                  <p className="font-medium text-sy-black-900">WO-2024-002</p>
                  <p className="text-sm text-sy-black-600">TechCorp - PCB-002</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-sy-black-900">13:00 - 17:00</p>
                  <p className="text-xs text-sy-black-600">Line 1</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Production Line Status */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-sy-black-900">Production Line Status</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-sy-green-500 rounded-full mr-3"></div>
                  <span className="font-medium text-sy-black-900">Line 1</span>
                </div>
                <span className="text-sm text-sy-black-600">85% utilization</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-sy-green-500 rounded-full mr-3"></div>
                  <span className="font-medium text-sy-black-900">Line 2</span>
                </div>
                <span className="text-sm text-sy-black-600">92% utilization</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-sy-gold-500 rounded-full mr-3"></div>
                  <span className="font-medium text-sy-black-900">Line 3</span>
                </div>
                <span className="text-sm text-sy-black-600">Maintenance</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-sy-green-500 rounded-full mr-3"></div>
                  <span className="font-medium text-sy-black-900">Line 4</span>
                </div>
                <span className="text-sm text-sy-black-600">78% utilization</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-sy-black-900">Quick Actions</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <button className="btn-primary">
              Create Work Order
            </button>
            <button className="btn-secondary">
              Import CSV
            </button>
            <button className="btn-outline">
              View Schedule
            </button>
            <button className="btn-outline">
              Generate Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard; 