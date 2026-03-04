import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, MapPin, Car, DollarSign, Info } from 'lucide-react';

export function HourlyBookingPage() {
  const [pickup, setPickup] = useState('');
  const [hours, setHours] = useState(2);
  const [category, setCategory] = useState('black_sedan');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const rates: Record<string, number> = { black_sedan: 7500, black_suv: 9500, black_ev: 8500 };
  const rate = rates[category] || 7500;
  const total = rate * hours;

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="bg-white rounded-lg shadow-md p-8 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Hourly Booking Confirmed!</h2>
          <p className="text-gray-600 mb-1">{hours} hours · {category.replace('_', ' ')}</p>
          <p className="text-2xl font-bold text-green-600 mb-4">${(total / 100).toFixed(2)}</p>
          <p className="text-sm text-gray-500 mb-6">Your chauffeur will arrive at the pickup location. Overage billed at ${(rate / 100).toFixed(2)}/hr.</p>
          <Link to="/" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center">
          <Link to="/" className="text-gray-600 hover:text-gray-900 mr-4"><ArrowLeft className="w-5 h-5" /></Link>
          <Clock className="w-6 h-6 text-green-600 mr-2" />
          <h1 className="text-xl font-bold text-gray-900">Hourly Chauffeur</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-blue-600 mr-2 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">How it works</p>
              <p className="mt-1">Book a dedicated chauffeur by the hour. Minimum 2 hours, maximum 12. Your driver stays with you for the entire duration. Overage is billed at the hourly rate.</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-5">
          <div>
            <label htmlFor="hourly-pickup" className="block text-sm font-medium text-gray-700 mb-1"><MapPin className="w-4 h-4 inline mr-1 text-green-600" />Pickup Location</label>
            <input id="hourly-pickup" type="text" value={pickup} onChange={e => setPickup(e.target.value)} placeholder="Enter pickup address" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="hourly-date" className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input id="hourly-date" type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label htmlFor="hourly-time" className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input id="hourly-time" type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>

          <div>
            <label htmlFor="hourly-hours" className="block text-sm font-medium text-gray-700 mb-1"><Clock className="w-4 h-4 inline mr-1" />Duration (hours)</label>
            <input id="hourly-hours" type="range" min={2} max={12} value={hours} onChange={e => setHours(Number(e.target.value))} className="w-full" />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>2h min</span>
              <span className="text-lg font-bold text-gray-900">{hours}h</span>
              <span>12h max</span>
            </div>
          </div>

          <div>
            <label htmlFor="hourly-cat" className="block text-sm font-medium text-gray-700 mb-1"><Car className="w-4 h-4 inline mr-1" />Vehicle</label>
            <select id="hourly-cat" value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
              <option value="black_sedan">Black Sedan — $75/hr</option>
              <option value="black_suv">Black SUV — $95/hr</option>
              <option value="black_ev">Black EV — $85/hr</option>
            </select>
          </div>

          <div>
            <label htmlFor="hourly-notes" className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
            <textarea id="hourly-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Any special requests..." className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>

          {/* Price Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">{category.replace('_', ' ')} × {hours} hours</span>
              <span className="text-gray-900">${(total / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Overage rate</span>
              <span className="text-gray-900">${(rate / 100).toFixed(2)}/hr</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Total</span>
              <span className="text-green-600">${(total / 100).toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={() => setSubmitted(true)}
            disabled={!pickup || !date || !time}
            className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Book Hourly Chauffeur
          </button>
        </div>
      </div>
    </div>
  );
}
