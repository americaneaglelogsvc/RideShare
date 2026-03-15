import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Calendar, Download, Clock, Car, MapPin } from 'lucide-react';
import apiService from '../services/api.service';

interface EarningsPeriodData {
  gross: number;
  net: number;
  trips: number;
  hours: number;
  commission: number;
}

interface TripRecord {
  id: string;
  date: string;
  time: string;
  pickup: string;
  dropoff: string;
  distance: number;
  duration: number;
  fare: number;
  net: number;
  rating: number;
}

export function EarningsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [loading, setLoading] = useState(true);
  const [currentData, setCurrentData] = useState<EarningsPeriodData>({
    gross: 0, net: 0, trips: 0, hours: 0, commission: 0,
  });
  const [recentTrips, setRecentTrips] = useState<TripRecord[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; earnings: number }[]>([]);

  useEffect(() => {
    loadEarnings();
  }, [selectedPeriod]);

  const loadEarnings = async () => {
    setLoading(true);
    try {
      const data = await apiService.getEarnings(selectedPeriod);
      setCurrentData({
        gross: data.grossEarnings || 0,
        net: data.netEarnings || 0,
        trips: data.totalTrips || 0,
        hours: data.onlineHours || 0,
        commission: data.commission || 0,
      });
    } catch {
      // Keep zero-state
    }

    try {
      const trips = await apiService.getTripHistory(5, 0);
      setRecentTrips(trips.map(t => ({
        id: t.tripId,
        date: t.date,
        time: t.time,
        pickup: t.pickup,
        dropoff: t.dropoff,
        distance: t.distance,
        duration: t.duration,
        fare: t.fare,
        net: t.netEarnings,
        rating: t.rating,
      })));
    } catch {
      // Keep empty trips
    }

    setLoading(false);
  };




  const formatCurrency = (cents) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatHours = (hours) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Earnings</h1>
          <div className="flex items-center space-x-4">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Net Earnings</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(currentData.net)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
            <div className="mt-2 text-sm text-gray-500">
              After {((currentData.commission / currentData.gross) * 100).toFixed(0)}% commission
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Trips</p>
                <p className="text-2xl font-bold text-blue-600">{currentData.trips}</p>
              </div>
              <Car className="w-8 h-8 text-blue-600" />
            </div>
            <div className="mt-2 text-sm text-gray-500">
              Avg: {formatCurrency(currentData.net / currentData.trips)} per trip
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Online Time</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatHours(currentData.hours)}
                </p>
              </div>
              <Clock className="w-8 h-8 text-purple-600" />
            </div>
            <div className="mt-2 text-sm text-gray-500">
              {formatCurrency((currentData.net / currentData.hours) * 100)}/hour
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Gross Earnings</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(currentData.gross)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-gray-600" />
            </div>
            <div className="mt-2 text-sm text-gray-500">
              Commission: {formatCurrency(currentData.commission)}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Monthly Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Monthly Earnings</h3>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="2024">2024</option>
                <option value="2023">2023</option>
              </select>
            </div>
            
            <div className="space-y-3">
              {monthlyData.map((data, index) => (
                <div key={data.month} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 w-8">{data.month}</span>
                  <div className="flex-1 mx-4">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${(data.earnings / Math.max(...monthlyData.map(d => d.earnings))) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-16 text-right">
                    {formatCurrency(data.earnings)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Trips */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Trips</h3>
            
            <div className="space-y-4">
              {recentTrips.map((trip) => (
                <div key={trip.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center text-sm text-gray-600 mb-1">
                        <Calendar className="w-4 h-4 mr-1" />
                        <span>{trip.date} at {trip.time}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center text-sm">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                          <span className="text-gray-700">{trip.pickup}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <div className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                          <span className="text-gray-700">{trip.dropoff}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        {formatCurrency(trip.net)}
                      </p>
                      <div className="flex items-center text-sm text-gray-500">
                        <span className="text-yellow-500 mr-1">★</span>
                        <span>{trip.rating}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-500 pt-2 border-t">
                    <span>{trip.distance} miles • {trip.duration} min</span>
                    <span>Gross: {formatCurrency(trip.fare)}</span>
                  </div>
                </div>
              ))}
            </div>

            <button className="w-full mt-4 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium">
              View All Trips
            </button>
          </div>
        </div>

        {/* Payout Information */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payout Information</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Next Payout</h4>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-green-800">Weekly Payout</span>
                  <span className="font-semibold text-green-900">
                    {formatCurrency(currentData.net)}
                  </span>
                </div>
                <p className="text-sm text-green-700">
                  Scheduled for Monday, January 22, 2024
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Payout Method</h4>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Bank Account</p>
                    <p className="text-sm text-gray-600">****1234</p>
                  </div>
                  <button className="text-blue-600 hover:text-blue-700 text-sm">
                    Change
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}