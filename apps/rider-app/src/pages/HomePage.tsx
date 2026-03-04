import React from 'react';
import { Link } from 'react-router-dom';
import { Car, Clock, Calendar, User, History, HelpCircle, MapPin } from 'lucide-react';

export function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Car className="w-7 h-7 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">UrWay Dispatch</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/profile" className="p-2 rounded-full bg-gray-100 hover:bg-gray-200">
              <User className="w-5 h-5 text-gray-600" />
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Where to?</h1>
        <p className="text-gray-600 mb-8">Book a premium ride in seconds</p>

        {/* Quick Booking */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <Link to="/book" className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <MapPin className="w-6 h-6 text-blue-600" />
            <div className="flex-1">
              <p className="font-medium text-gray-900">Enter destination</p>
              <p className="text-sm text-gray-500">On-demand ride</p>
            </div>
            <Car className="w-5 h-5 text-gray-400" />
          </Link>
        </div>

        {/* Booking Options */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Link to="/book" className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow text-center">
            <Car className="w-10 h-10 text-blue-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900">On-Demand</h3>
            <p className="text-sm text-gray-500 mt-1">Ride now</p>
          </Link>

          <Link to="/book/scheduled" className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow text-center">
            <Calendar className="w-10 h-10 text-purple-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900">Schedule</h3>
            <p className="text-sm text-gray-500 mt-1">Book ahead</p>
          </Link>

          <Link to="/book/hourly" className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow text-center">
            <Clock className="w-10 h-10 text-green-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900">Hourly</h3>
            <p className="text-sm text-gray-500 mt-1">By the hour</p>
          </Link>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link to="/history" className="flex flex-col items-center p-3 rounded-lg hover:bg-gray-50">
              <History className="w-6 h-6 text-gray-600 mb-1" />
              <span className="text-xs text-gray-700">Ride History</span>
            </Link>
            <Link to="/profile" className="flex flex-col items-center p-3 rounded-lg hover:bg-gray-50">
              <User className="w-6 h-6 text-gray-600 mb-1" />
              <span className="text-xs text-gray-700">Profile</span>
            </Link>
            <Link to="/support" className="flex flex-col items-center p-3 rounded-lg hover:bg-gray-50">
              <HelpCircle className="w-6 h-6 text-gray-600 mb-1" />
              <span className="text-xs text-gray-700">Support</span>
            </Link>
            <Link to="/consent" className="flex flex-col items-center p-3 rounded-lg hover:bg-gray-50">
              <Clock className="w-6 h-6 text-gray-600 mb-1" />
              <span className="text-xs text-gray-700">Legal</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
