import React from 'react';
import { Link } from 'react-router-dom';
import { Car, Clock, Calendar, User, History, HelpCircle, MapPin, Home, CreditCard } from 'lucide-react';
import { MobileCard, MobileCardHeader, MobileCardBody } from '../components/MobileCard';
import { MobileButton } from '../components/MobileButton';
import { MobileNav } from '../components/MobileNavigation';

export function HomePage() {
  const navItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Book', href: '/book', icon: MapPin },
    { label: 'History', href: '/history', icon: History },
    { label: 'Profile', href: '/profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Mobile Header */}
      <header className="bg-white shadow-sm px-4 py-4 md:hidden">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Car className="w-7 h-7 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">UrWay Dispatch</span>
          </div>
          <Link to="/profile" className="p-2 rounded-full bg-gray-100 hover:bg-gray-200">
            <User className="w-5 h-5 text-gray-600" />
          </Link>
        </div>
      </header>

      {/* Desktop Header */}
      <header className="bg-white shadow-sm px-6 py-4 hidden md:block">
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

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Where to?</h1>
          <p className="text-gray-600 text-sm md:text-base">Book a premium ride in seconds</p>
        </div>

        {/* Quick Booking */}
        <MobileCard className="mb-6" hover onClick={() => window.location.href = '/book'}>
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <MapPin className="w-6 h-6 text-blue-600" />
            <div className="flex-1">
              <p className="font-medium text-gray-900">Enter destination</p>
              <p className="text-sm text-gray-500">On-demand ride</p>
            </div>
            <Car className="w-5 h-5 text-gray-400" />
          </div>
        </MobileCard>

        {/* Booking Options */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <MobileCard hover onClick={() => window.location.href = '/book'}>
            <div className="text-center p-4 md:p-6">
              <Car className="w-8 h-8 md:w-10 md:h-10 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 text-sm md:text-base">On-Demand</h3>
              <p className="text-xs md:text-sm text-gray-500 mt-1">Ride now</p>
            </div>
          </MobileCard>

          <MobileCard hover onClick={() => window.location.href = '/book/scheduled'}>
            <div className="text-center p-4 md:p-6">
              <Calendar className="w-8 h-8 md:w-10 md:h-10 text-purple-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 text-sm md:text-base">Schedule</h3>
              <p className="text-xs md:text-sm text-gray-500 mt-1">Book ahead</p>
            </div>
          </MobileCard>

          <MobileCard hover onClick={() => window.location.href = '/book/hourly'}>
            <div className="text-center p-4 md:p-6">
              <Clock className="w-8 h-8 md:w-10 md:h-10 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 text-sm md:text-base">Hourly</h3>
              <p className="text-xs md:text-sm text-gray-500 mt-1">By the hour</p>
            </div>
          </MobileCard>
        </div>

        {/* Quick Links */}
        <MobileCard>
          <MobileCardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Quick Links</h2>
          </MobileCardHeader>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link to="/history" className="flex flex-col items-center p-3 rounded-lg hover:bg-gray-50 touch-manipulation">
              <History className="w-6 h-6 text-gray-600 mb-1" />
              <span className="text-xs text-gray-700">Ride History</span>
            </Link>
            <Link to="/profile" className="flex flex-col items-center p-3 rounded-lg hover:bg-gray-50 touch-manipulation">
              <User className="w-6 h-6 text-gray-600 mb-1" />
              <span className="text-xs text-gray-700">Profile</span>
            </Link>
            <Link to="/support" className="flex flex-col items-center p-3 rounded-lg hover:bg-gray-50 touch-manipulation">
              <HelpCircle className="w-6 h-6 text-gray-600 mb-1" />
              <span className="text-xs text-gray-700">Support</span>
            </Link>
            <Link to="/consent" className="flex flex-col items-center p-3 rounded-lg hover:bg-gray-50 touch-manipulation">
              <Clock className="w-6 h-6 text-gray-600 mb-1" />
              <span className="text-xs text-gray-700">Legal</span>
            </Link>
          </div>
        </MobileCard>
      </div>

      {/* Mobile Navigation */}
      <MobileNav items={navItems} />
    </div>
  );
}
