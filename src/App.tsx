import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import WorkOrders from './pages/WorkOrders';
import ProductionLines from './pages/ProductionLines';
import Schedule from './pages/Schedule';
import TimelineView from './pages/TimelineView';
import FloorDisplay from './pages/FloorDisplay';
import Customers from './pages/Customers';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden bg-sy-black-50">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {/* Header */}
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        {/* Main content area */}
        <main className="flex-1 overflow-y-auto">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/work-orders" element={<WorkOrders />} />
                <Route path="/production-lines" element={<ProductionLines />} />
                <Route path="/schedule" element={<Schedule />} />
                <Route path="/timeline" element={<TimelineView />} />
                <Route path="/floor/:lineId" element={<FloorDisplay />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App; 