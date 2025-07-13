import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, Calendar, Building, Menu, X } from 'lucide-react';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsMobileMenuOpen(false);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="bg-white shadow-sm border-b relative">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="text-xl font-bold text-primary-600">
            Boardroom Booking
          </Link>
          
          {/* Desktop Navigation */}
          {user ? (
            <nav className="hidden md:flex items-center space-x-6">
              <Link to="/" className="flex items-center space-x-2 text-gray-600 hover:text-primary-600">
                <Calendar className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
              <Link to="/book" className="flex items-center space-x-2 text-gray-600 hover:text-primary-600">
                <Building className="w-4 h-4" />
                <span>Book Room</span>
              </Link>
              <Link to="/boardrooms" className="flex items-center space-x-2 text-gray-600 hover:text-primary-600">
                <Building className="w-4 h-4" />
                <span>All Rooms</span>
              </Link>
              <Link to="/my-bookings" className="flex items-center space-x-2 text-gray-600 hover:text-primary-600">
                <User className="w-4 h-4" />
                <span>My Bookings</span>
              </Link>
              {user?.role === 'admin' && (
                <Link to="/admin/boardrooms" className="flex items-center space-x-2 text-gray-600 hover:text-primary-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Admin</span>
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-gray-600 hover:text-red-600"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </nav>
          ) : (
            <nav className="hidden md:flex items-center space-x-4">
              <Link to="/login" className="btn btn-primary">
                Login
              </Link>
              <Link to="/register" className="btn btn-secondary">
                Register
              </Link>
            </nav>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-600 hover:text-primary-600 hover:bg-gray-100"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-50">
            <div className="px-4 py-6 space-y-4">
              {user ? (
                <>
                  <Link
                    to="/"
                    onClick={closeMobileMenu}
                    className="flex items-center space-x-3 text-gray-600 hover:text-primary-600 py-2"
                  >
                    <Calendar className="w-5 h-5" />
                    <span>Dashboard</span>
                  </Link>
                  <Link
                    to="/book"
                    onClick={closeMobileMenu}
                    className="flex items-center space-x-3 text-gray-600 hover:text-primary-600 py-2"
                  >
                    <Building className="w-5 h-5" />
                    <span>Book Room</span>
                  </Link>
                  <Link
                    to="/boardrooms"
                    onClick={closeMobileMenu}
                    className="flex items-center space-x-3 text-gray-600 hover:text-primary-600 py-2"
                  >
                    <Building className="w-5 h-5" />
                    <span>All Rooms</span>
                  </Link>
                  <Link
                    to="/my-bookings"
                    onClick={closeMobileMenu}
                    className="flex items-center space-x-3 text-gray-600 hover:text-primary-600 py-2"
                  >
                    <User className="w-5 h-5" />
                    <span>My Bookings</span>
                  </Link>
                  {user?.role === 'admin' && (
                    <Link
                      to="/admin/boardrooms"
                      onClick={closeMobileMenu}
                      className="flex items-center space-x-3 text-gray-600 hover:text-primary-600 py-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Admin</span>
                    </Link>
                  )}
                  <div className="border-t border-gray-200 pt-4">
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-3 text-gray-600 hover:text-red-600 py-2 w-full"
                    >
                      <LogOut className="w-5 h-5" />
                      <span>Logout</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={closeMobileMenu}
                    className="block w-full text-center btn btn-primary"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={closeMobileMenu}
                    className="block w-full text-center btn btn-secondary"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header; 