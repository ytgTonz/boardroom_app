import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, Calendar, Building, Menu, X, Bell } from 'lucide-react';
import { notificationsAPI } from '../services/api';
import { Notification } from '../types';
import { useEffect, useRef } from 'react';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      try {
        const data = await notificationsAPI.getAll();
        setNotifications(data);
      } catch (error) {
        // handle error
      }
    };
    fetchNotifications();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkRead = async (id: string) => {
    await notificationsAPI.markRead(id);
    setNotifications(notifications => notifications.map(n => n._id === id ? { ...n, read: true } : n));
  };

  const handleDelete = async (id: string) => {
    await notificationsAPI.deleteOne(id);
    setNotifications(notifications => notifications.filter(n => n._id !== id));
  };

  const handleDropdownToggle = () => setShowDropdown(v => !v);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

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
                <div className="relative group">
                  <Link to="/admin" className="flex items-center space-x-2 text-gray-600 hover:text-primary-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Admin</span>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </Link>
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="py-2">
                      <Link to="/admin/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        Dashboard
                      </Link>
                      <Link to="/admin/boardrooms" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        Manage Boardrooms
                      </Link>
                      <Link to="/admin/bookings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        Manage Bookings
                      </Link>
                      <Link to="/admin/users" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        Manage Users
                      </Link>
                    </div>
                  </div>
                </div>
              )}
              {/* Notification Bell */}
              <div className="relative">
                <button onClick={handleDropdownToggle} className="relative focus:outline-none">
                  <Bell className="w-5 h-5 text-gray-600 hover:text-primary-600" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {showDropdown && (
                  <div ref={dropdownRef} className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div className="p-4 border-b font-semibold">Notifications</div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-gray-500 text-sm">No notifications</div>
                      ) : notifications.map(n => (
                        <div key={n._id} className={`flex items-start px-4 py-3 border-b last:border-b-0 ${n.read ? 'bg-white' : 'bg-blue-50'}`}>
                          <div className="flex-1">
                            <div className="text-sm text-gray-800 mb-1">{n.message}</div>
                            <div className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</div>
                          </div>
                          {!n.read && (
                            <button onClick={() => handleMarkRead(n._id)} className="ml-2 text-xs text-blue-600 hover:underline">Mark as read</button>
                          )}
                          <button onClick={() => handleDelete(n._id)} className="ml-2 text-xs text-red-500 hover:underline">Delete</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
                    <>
                      <div className="border-t border-gray-200 pt-4">
                        <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Admin</div>
                      </div>
                      <Link
                        to="/admin/dashboard"
                        onClick={closeMobileMenu}
                        className="flex items-center space-x-3 text-gray-600 hover:text-primary-600 py-2 pl-4"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span>Dashboard</span>
                      </Link>
                      <Link
                        to="/admin/boardrooms"
                        onClick={closeMobileMenu}
                        className="flex items-center space-x-3 text-gray-600 hover:text-primary-600 py-2 pl-4"
                      >
                        <Building className="w-5 h-5" />
                        <span>Manage Boardrooms</span>
                      </Link>
                      <Link
                        to="/admin/bookings"
                        onClick={closeMobileMenu}
                        className="flex items-center space-x-3 text-gray-600 hover:text-primary-600 py-2 pl-4"
                      >
                        <Calendar className="w-5 h-5" />
                        <span>Manage Bookings</span>
                      </Link>
                      <Link
                        to="/admin/users"
                        onClick={closeMobileMenu}
                        className="flex items-center space-x-3 text-gray-600 hover:text-primary-600 py-2 pl-4"
                      >
                        <User className="w-5 h-5" />
                        <span>Manage Users</span>
                      </Link>
                    </>
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