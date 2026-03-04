import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useRealtime } from '../hooks/useRealtime';
import apiService, { DashboardData } from '../services/api.service';
import { 
  Car, 
  MapPin, 
  DollarSign, 
  Clock, 
  User, 
  Settings, 
  Power,
  Bell,
  Navigation,
  Plane,
  Calendar,
  Compass
} from 'lucide-react';

export function DashboardPage() {
  const { driver, logout } = useAuth();
  const { currentOffer, acceptOffer, declineOffer } = useRealtime(driver?.id || null);
  const [isOnline, setIsOnline] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState('Downtown Chicago');
  const [destinationMode, setDestinationMode] = useState(false);
  const [destinationAddress, setDestinationAddress] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const data = await apiService.getDashboard();
      setDashboardData(data);
      setIsOnline(data.driver.status === 'online');
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleOnlineStatus = async () => {
    try {
      const newStatus = isOnline ? 'offline' : 'online';
      await apiService.updateStatus(newStatus);
      setIsOnline(!isOnline);
      
      // Reload dashboard data to get updated info
      await loadDashboardData();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Car className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">UrWay Dispatch Driver</h1>
              <p className="text-sm text-gray-600">Welcome back, {driver?.firstName}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Bell className="w-6 h-6 text-gray-600" />
            <button
              onClick={logout}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Logout
            </button>
            <Link to="/profile" className="p-2 rounded-full bg-gray-100">
              <User className="w-6 h-6 text-gray-600" />
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Online/Offline Toggle */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Driver Status</h2>
              <p className="text-gray-600">
                {isOnline ? 'You are online and available for rides' : 'You are offline'}
              </p>
            </div>
            <button
              onClick={toggleOnlineStatus}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
                isOnline 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              <Power className="w-5 h-5" />
              <span>{isOnline ? 'Go Offline' : 'Go Online'}</span>
            </button>
          </div>
          
          {isOnline && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center text-green-600">
                <Navigation className="w-4 h-4 mr-2" />
                <span className="text-sm">Current location: {currentLocation}</span>
              </div>
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div className="flex items-center">
                  <Compass className={`w-5 h-5 mr-2 ${destinationMode ? 'text-blue-600' : 'text-gray-400'}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Destination Mode</p>
                    <p className="text-xs text-gray-500">Only receive rides heading your way</p>
                  </div>
                </div>
                <button
                  aria-label="Toggle destination mode"
                  onClick={() => setDestinationMode(!destinationMode)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${destinationMode ? 'bg-blue-600' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${destinationMode ? 'translate-x-6' : ''}`} />
                </button>
              </div>
              {destinationMode && (
                <input
                  type="text"
                  placeholder="Enter your destination address..."
                  value={destinationAddress}
                  onChange={(e) => setDestinationAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
          )}
        </div>

        {/* Today's Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today's Earnings</p>
                <p className="text-2xl font-bold text-green-600">
                  ${((dashboardData?.todayStats.earnings || 0) / 100).toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Trips Completed</p>
                <p className="text-2xl font-bold text-blue-600">{dashboardData?.todayStats.trips || 0}</p>
              </div>
              <Car className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Online Time</p>
                <p className="text-2xl font-bold text-purple-600">
                  {Math.floor((dashboardData?.todayStats.onlineHours || 0))}h {Math.round(((dashboardData?.todayStats.onlineHours || 0) % 1) * 60)}m
                </p>
              </div>
              <Clock className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link 
              to="/trip" 
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <MapPin className="w-8 h-8 text-blue-600 mb-2" />
              <span className="text-sm font-medium">Current Trip</span>
            </Link>

            <Link 
              to="/earnings" 
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <DollarSign className="w-8 h-8 text-green-600 mb-2" />
              <span className="text-sm font-medium">Earnings</span>
            </Link>

            <Link 
              to="/scheduled-rides" 
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Calendar className="w-8 h-8 text-orange-600 mb-2" />
              <span className="text-sm font-medium">Scheduled Rides</span>
            </Link>

            <Link 
              to="/airport-queue" 
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Plane className="w-8 h-8 text-purple-600 mb-2" />
              <span className="text-sm font-medium">Airport Queue</span>
            </Link>

            <Link 
              to="/profile" 
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Settings className="w-8 h-8 text-gray-600 mb-2" />
              <span className="text-sm font-medium">Settings</span>
            </Link>
          </div>
        </div>

        {/* Ride Offers Section */}
        {isOnline && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ride Offers</h3>
            {currentOffer ? (
              <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">New Ride Request</p>
                    <p className="text-sm text-gray-600">
                      From: {currentOffer.pickup_address}
                    </p>
                    <p className="text-sm text-green-600">
                      Net Payout: ${(currentOffer.net_payout_cents / 100).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => declineOffer(currentOffer.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Decline
                    </button>
                    <button 
                      onClick={() => acceptOffer(currentOffer.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Accept
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Car className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No ride offers at the moment</p>
                <p className="text-sm">Stay online to receive ride requests</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
