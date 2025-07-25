import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { SocketProvider } from './contexts/SocketContext.tsx';
import ProtectedRoute from './components/ProtectedRoute.tsx';
import Login from './components/Login.tsx';
import Sidebar from './components/Sidebar.tsx';
import Header from './components/Header.tsx';
import Dashboard from './pages/Dashboard.tsx';
import WorkOrders from './pages/WorkOrders.tsx';
import ProductionLines from './pages/ProductionLines.tsx';
import Schedule from './pages/Schedule.tsx';
import TimelineView from './pages/TimelineView.tsx';
import FloorDisplay from './pages/FloorDisplay.tsx';
import FloorDisplaySelect from './pages/FloorDisplaySelect.tsx';
import ScanPage from './pages/ScanPage.tsx';
import Customers from './pages/Customers.tsx';
import Reports from './pages/Reports.tsx';
import Settings from './pages/Settings.tsx';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthProvider>
      <SocketProvider>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<Login />} />
          
          {/* Mobile QR Scanner - Protected but outside main layout */}
          <Route path="/scan" element={
            <ProtectedRoute>
              <ScanPage />
            </ProtectedRoute>
          } />
          
          {/* Protected routes */}
          <Route path="/*" element={
            <ProtectedRoute>
              <div className="h-screen flex overflow-hidden bg-sy-black-50">
                {/* Sidebar */}
                <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
                
                {/* Main content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Header */}
                  <Header onMenuClick={() => setSidebarOpen(true)} />
                  
                  {/* Main content area */}
                  <main className="flex-1 overflow-y-auto">
                    <div className="py-6">
                      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                        <Routes>
                          <Route path="/" element={<Dashboard />} />
                          
                          {/* Work Orders - Scheduler+ access */}
                          <Route path="/work-orders" element={
                            <ProtectedRoute requiredRoles={['admin', 'scheduler', 'supervisor']}>
                              <WorkOrders />
                            </ProtectedRoute>
                          } />
                          
                          {/* Production Lines - All authenticated users */}
                          <Route path="/production-lines" element={<ProductionLines />} />
                          
                          {/* Schedule - Scheduler+ access */}
                          <Route path="/schedule" element={
                            <ProtectedRoute requiredRoles={['admin', 'scheduler', 'supervisor']}>
                              <Schedule />
                            </ProtectedRoute>
                          } />
                          
                          {/* Timeline - All authenticated users */}
                          <Route path="/timeline" element={<TimelineView />} />
                          
                          {/* Floor Display Selection - All authenticated users */}
                          <Route path="/floor-display-select" element={<FloorDisplaySelect />} />
                          
                          {/* Floor Display - Public access for floor monitors */}
                          <Route path="/floor/:lineId" element={<FloorDisplay />} />
                          
                          {/* Customers - Admin/Scheduler access */}
                          <Route path="/customers" element={
                            <ProtectedRoute requiredRoles={['admin', 'scheduler']}>
                              <Customers />
                            </ProtectedRoute>
                          } />
                          
                          {/* Reports - All authenticated users */}
                          <Route path="/reports" element={<Reports />} />
                          
                          {/* Settings - Admin only */}
                          <Route path="/settings" element={
                            <ProtectedRoute requiredRoles={['admin']}>
                              <Settings />
                            </ProtectedRoute>
                          } />
                        </Routes>
                      </div>
                    </div>
                  </main>
                </div>
              </div>
            </ProtectedRoute>
          } />
        </Routes>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App; 