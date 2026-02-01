import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Batches from './pages/Batches';
import Inventory from './pages/Inventory';
import ProductionSimple from './pages/ProductionSimple';
import Polyhouses from './pages/Polyhouses';
import PurchaseBills from './pages/PurchaseBills';
import ReadyCrops from './pages/ReadyCrops';
import Farmers from './pages/Farmers';
import Bookings from './pages/Bookings';
import Vehicles from './pages/Vehicles';
import Deliveries from './pages/Deliveries';
import Employees from './pages/Employees';
import Attendance from './pages/Attendance';
import Leave from './pages/Leave';
import Payroll from './pages/Payroll';
import VoucherEntry from './pages/VoucherEntry';
import TrialBalance from './pages/TrialBalance';
import DayBook from './pages/DayBook';
import Sales from './pages/Sales';
import Tasks from './pages/Tasks';
import Reports from './pages/Reports';
import PaymentEntry from './pages/PaymentEntry';
import ExpenseManagement from './pages/ExpenseManagement';
import SupplierPerformance from './pages/SupplierPerformance';
import QualityInspection from './pages/QualityInspection';
import ShippingManagement from './pages/ShippingManagement';

function App() {
  return (
    <AuthProvider>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected routes */}
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="batches" element={<Batches />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="production" element={<ProductionSimple />} />
            <Route path="polyhouses" element={<Polyhouses />} />
            <Route path="purchase-bills" element={<PurchaseBills />} />
            <Route path="ready-crops" element={<ReadyCrops />} />
            <Route path="farmers" element={<Farmers />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="vehicles" element={<Vehicles />} />
            <Route path="deliveries" element={<Deliveries />} />
            <Route path="employees" element={<Employees />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="leave" element={<Leave />} />
            <Route path="payroll" element={<Payroll />} />
            <Route path="voucher-entry" element={<VoucherEntry />} />
            <Route path="trial-balance" element={<TrialBalance />} />
            <Route path="day-book" element={<DayBook />} />
            <Route path="payments" element={<PaymentEntry />} />
            <Route path="expenses" element={<ExpenseManagement />} />
            <Route path="sales" element={<Sales />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="reports" element={<Reports />} />
            <Route path="supplier-performance" element={<SupplierPerformance />} />
            <Route path="quality-inspection" element={<QualityInspection />} />
            <Route path="shipping-management" element={<ShippingManagement />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
