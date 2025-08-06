import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  Calendar, 
  Edit3, 
  Save, 
  X,
  Shield,
  Clock,
  MapPin
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api }  from '../services/api';
import { errorTracker } from '../utils/sentryConfig';

interface UserProfileData {
  name: string;
  email: string;
  phone?: string;
  department?: string;
  position?: string;
  location?: string;
}

interface UserStats {
  totalBookings: number;
  upcomingBookings: number;
  completedBookings: number;
  lastBookingDate?: string;
}

const UserProfile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userStats, setUserStats] = useState<UserStats>({
    totalBookings: 0,
    upcomingBookings: 0,
    completedBookings: 0
  });
  
  const [profileData, setProfileData] = useState<UserProfileData>({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    department: user?.department || '',
    position: user?.position || '',
    location: user?.location || ''
  });

  const [originalData, setOriginalData] = useState<UserProfileData>(profileData);

  useEffect(() => {
    if (user) {
      const userData = {
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        department: user.department || '',
        position: user.position || '',
        location: user.location || ''
      };
      setProfileData(userData);
      setOriginalData(userData);
    }
  }, [user]);

  useEffect(() => {
    fetchUserStats();
  }, []);

  const fetchUserStats = async () => {
    try {
      const response = await api.get('/users/profile/stats');
      setUserStats(response.data);
    } catch (error) {
      console.error('Error fetching user stats:', error);
      errorTracker.captureException(error as Error, {
        tags: { component: 'UserProfile', operation: 'fetchUserStats' }
      });
    }
  };

  const handleInputChange = (field: keyof UserProfileData, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!profileData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    if (!profileData.email.trim()) {
      toast.error('Email is required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.put('/users/profile', profileData);
      
      // Update the auth context with new user data
      updateUser(response.data.user);
      
      setOriginalData(profileData);
      setIsEditing(false);
      
      toast.success('Profile updated successfully!');
      
      errorTracker.addBreadcrumb({
        category: 'user',
        message: 'Profile updated successfully',
        level: 'info'
      });
      
    } catch (error: any) {
      console.error('Error updating profile:', error);
      
      const errorMessage = error.response?.data?.message || 'Failed to update profile';
      toast.error(errorMessage);
      
      errorTracker.captureException(error, {
        tags: { 
          component: 'UserProfile', 
          operation: 'updateProfile' 
        },
        extra: {
          profileData: { ...profileData, email: '[REDACTED]' }
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setProfileData(originalData);
    setIsEditing(false);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
              <p className="text-gray-600">Manage your personal information and preferences</p>
            </div>
          </div>
          
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              aria-label="Edit profile"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Edit Profile
            </button>
          ) : (
            <div className="flex space-x-3">
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
                aria-label="Cancel editing"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                aria-label="Save changes"
              >
                <Save className="w-4 h-4 mr-2" />
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Personal Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    id="name"
                    value={profileData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                    aria-required="true"
                  />
                ) : (
                  <div className="flex items-center space-x-2 py-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">{profileData.name || 'Not specified'}</span>
                  </div>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    id="email"
                    value={profileData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                    aria-required="true"
                  />
                ) : (
                  <div className="flex items-center space-x-2 py-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">{profileData.email || 'Not specified'}</span>
                  </div>
                )}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    id="phone"
                    value={profileData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                ) : (
                  <div className="flex items-center space-x-2 py-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">{profileData.phone || 'Not specified'}</span>
                  </div>
                )}
              </div>

              {/* Department */}
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    id="department"
                    value={profileData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                ) : (
                  <div className="flex items-center space-x-2 py-2">
                    <Building className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">{profileData.department || 'Not specified'}</span>
                  </div>
                )}
              </div>

              {/* Position */}
              <div>
                <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-2">
                  Position
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    id="position"
                    value={profileData.position}
                    onChange={(e) => handleInputChange('position', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                ) : (
                  <div className="flex items-center space-x-2 py-2">
                    <Shield className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">{profileData.position || 'Not specified'}</span>
                  </div>
                )}
              </div>

              {/* Location */}
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                  Office Location
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    id="location"
                    value={profileData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                ) : (
                  <div className="flex items-center space-x-2 py-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">{profileData.location || 'Not specified'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Account Stats & Info */}
        <div className="space-y-6">
          {/* Account Status */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Role</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-md capitalize">
                  {user?.role || 'User'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Member Since</span>
                <span className="text-sm text-gray-900">
                  {user?.createdAt ? formatDate(user.createdAt) : 'Unknown'}
                </span>
              </div>
            </div>
          </div>

          {/* Booking Statistics */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Statistics</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Total Bookings</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{userStats.totalBookings}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-600">Upcoming</span>
                </div>
                <span className="text-sm font-semibold text-green-600">{userStats.upcomingBookings}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Completed</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{userStats.completedBookings}</span>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Booking</span>
                  <span className="text-sm text-gray-900">
                    {formatDate(userStats.lastBookingDate)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;