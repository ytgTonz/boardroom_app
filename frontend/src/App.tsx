import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';

import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Register from './components/Register';
import BookingForm from './components/BookingForm';
import MyBookings from './components/MyBookings';
import CalendarView from './components/CalendarView';
import BoardroomList from './components/BoardroomList';
import AdminBoardrooms from './components/AdminBoardrooms';
import AdminUsers from './components/AdminUsers';
import AdminBookings from './components/AdminBookings';
import AdminDashboard from './components/AdminDashboard';
import ErrorBoundary from './components/ErrorBoundary';
import { useAuth } from './contexts/AuthContext';

// Set up axios defaults from environment variable
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
axios.defaults.baseURL = apiUrl;

// Log configuration in development
if (import.meta.env.DEV) {
  console.log('🔧 Frontend Configuration:', {
    apiUrl,
    environment: import.meta.env.VITE_ENVIRONMENT || 'development',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0'
  });
}

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <Routes>
            <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
            <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
            <Route path="/book" element={user ? <BookingForm /> : <Navigate to="/login" />} />
            <Route path="/my-bookings" element={user ? <MyBookings /> : <Navigate to="/login" />} />
            <Route path="/calendar" element={user ? <CalendarView /> : <Navigate to="/login" />} />
            <Route path="/boardrooms" element={<BoardroomList />} />
            <Route path="/admin" element={user?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/" />} />
            <Route path="/admin/dashboard" element={user?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/" />} />
            <Route path="/admin/boardrooms" element={user?.role === 'admin' ? <AdminBoardrooms /> : <Navigate to="/" />} />
            <Route path="/admin/bookings" element={user?.role === 'admin' ? <AdminBookings /> : <Navigate to="/" />} />
            <Route path="/admin/booking" element={<Navigate to="/admin/bookings" replace />} />
            <Route path="/admin/users" element={user?.role === 'admin' ? <AdminUsers /> : <Navigate to="/" />} />
          </Routes>
        </main>
        {/* ToastContainer for react-toastify */}
        <ToastContainer
          position="top-center"
          autoClose={4000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
      </div>
    </Router>
  );
};

const App = () => {
  return (
    <ErrorBoundary componentName="Application">
      <AppContent />
    </ErrorBoundary>
  );
};

export default App; 