import React, { useState, useEffect } from 'react';
import { bookingsAPI, boardroomsAPI, usersAPI } from '../services/api';
import { Booking, Boardroom, UserStats } from '../types';

interface DashboardStats {
  totalBookings: number;
  todayBookings: number;
  totalBoardrooms: number;
  activeBoardrooms: number;
  totalUsers: number;
  recentBookings: Booking[];
  topBoardrooms: { boardroom: string; count: number }[];
  bookingsByStatus: { status: string; count: number }[];
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      console.log('Fetching dashboard data...');
      
      const [bookings, boardrooms, userStatsData] = await Promise.all([
        bookingsAPI.getAll().catch(err => {
          console.error('Error fetching bookings:', err);
          return [];
        }),
        boardroomsAPI.getAllAdmin().catch(err => {
          console.error('Error fetching boardrooms:', err);
          return [];
        }),
        usersAPI.getStats().catch(err => {
          console.error('Error fetching user stats:', err);
          return { totalUsers: 0, adminUsers: 0, regularUsers: 0, recentUsers: [] };
        })
      ]);

      console.log('Fetched data:', { bookings, boardrooms, userStatsData });

      // Ensure arrays are valid
      const validBookings = Array.isArray(bookings) ? bookings : [];
      const validBoardrooms = Array.isArray(boardrooms) ? boardrooms : [];

      // Calculate statistics
      const today = new Date().toDateString();
      const todayBookings = validBookings.filter((booking: Booking) => 
        new Date(booking.startTime).toDateString() === today
      ).length;

      const activeBoardrooms = validBoardrooms.filter((room: Boardroom) => room.isActive).length;

      // Get recent bookings (last 5)
      const recentBookings = validBookings
        .sort((a: Booking, b: Booking) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      // Calculate top boardrooms by booking count
      const boardroomCounts: { [key: string]: number } = {};
      validBookings.forEach((booking: Booking) => {
        if (booking.boardroom && booking.boardroom.name) {
          boardroomCounts[booking.boardroom.name] = (boardroomCounts[booking.boardroom.name] || 0) + 1;
        }
      });

      const topBoardrooms = Object.entries(boardroomCounts)
        .map(([boardroom, count]) => ({ boardroom, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate bookings by status
      const statusCounts: { [key: string]: number } = {};
      validBookings.forEach((booking: Booking) => {
        if (booking.status) {
          statusCounts[booking.status] = (statusCounts[booking.status] || 0) + 1;
        }
      });

      const bookingsByStatus = Object.entries(statusCounts)
        .map(([status, count]) => ({ status, count }));

      const dashboardStats = {
        totalBookings: validBookings.length,
        todayBookings,
        totalBoardrooms: validBoardrooms.length,
        activeBoardrooms,
        totalUsers: userStatsData.totalUsers || 0,
        recentBookings,
        topBoardrooms,
        bookingsByStatus
      };

      console.log('Calculated stats:', dashboardStats);
      setStats(dashboardStats);
      setUserStats(userStatsData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="card text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Unable to load dashboard data</h3>
        <p className="text-gray-500">Please try refreshing the page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">System overview and key metrics</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalBookings}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Today's Bookings</p>
              <p className="text-2xl font-bold text-gray-900">{stats.todayBookings}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Boardrooms</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeBoardrooms}/{stats.totalBoardrooms}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-orange-100 text-orange-600">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bookings by Status */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Bookings by Status</h2>
          <div className="space-y-3">
            {stats.bookingsByStatus.map(({ status, count }) => {
              const percentage = stats.totalBookings > 0 ? (count / stats.totalBookings) * 100 : 0;
              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(status)}`}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                    <span className="ml-3 text-sm text-gray-600">{count} bookings</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-500">{percentage.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Boardrooms */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Most Popular Boardrooms</h2>
          <div className="space-y-3">
            {stats.topBoardrooms.map(({ boardroom, count }, index) => {
              const maxCount = stats.topBoardrooms[0]?.count || 1;
              const percentage = (count / maxCount) * 100;
              return (
                <div key={boardroom} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-bold rounded-full mr-3">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{boardroom}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-500">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Bookings</h2>
          <div className="space-y-4">
            {stats.recentBookings.map((booking) => (
              <div key={booking._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">{booking.user.name}</div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                      {booking.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {booking.boardroom.name} • {formatDate(booking.startTime)}
                  </div>
                  <div className="text-xs text-gray-600 mt-1 truncate">{booking.purpose}</div>
                </div>
              </div>
            ))}
            {stats.recentBookings.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <p>No recent bookings</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Users */}
        {userStats && (
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent User Registrations</h2>
            <div className="space-y-4">
              {userStats.recentUsers.map((user) => (
                <div key={user._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-700">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      user.role === 'admin' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {user.role}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDate(user.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
              {userStats.recentUsers.length === 0 && (
                <div className="text-center py-6 text-gray-500">
                  <p>No recent registrations</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors">
            <div className="text-center">
              <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <div className="mt-2 text-sm font-medium text-gray-900">Create Boardroom</div>
              <div className="text-xs text-gray-500">Add new meeting space</div>
            </div>
          </button>

          <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors">
            <div className="text-center">
              <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <div className="mt-2 text-sm font-medium text-gray-900">Manage Users</div>
              <div className="text-xs text-gray-500">View all system users</div>
            </div>
          </button>

          <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors">
            <div className="text-center">
              <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <div className="mt-2 text-sm font-medium text-gray-900">View Bookings</div>
              <div className="text-xs text-gray-500">All system bookings</div>
            </div>
          </button>

          <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors">
            <div className="text-center">
              <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <div className="mt-2 text-sm font-medium text-gray-900">View Reports</div>
              <div className="text-xs text-gray-500">System analytics</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;