import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, MapPin, Car } from 'lucide-react';

export function ScheduledBookingPage() {
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [category, setCategory] = useState('black_sedan');
  const [passengers, setPassengers] = useState(1);
  const [luggage, setLuggage] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!pickup || !dropoff || !date || !time) return;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="bg-white rounded-lg shadow-md p-8 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ride Scheduled!</h2>
          <p className="text-gray-600 mb-1">{new Date(`${date}T${time}`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <p className="text-gray-600 mb-4">at {time}</p>
          <p className="text-sm text-gray-500 mb-6">You'll receive a confirmation and driver details 30 minutes before pickup.</p>
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
          <Calendar className="w-6 h-6 text-purple-600 mr-2" />
          <h1 className="text-xl font-bold text-gray-900">Schedule a Ride</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 space-y-5">
          <div>
            <label htmlFor="sched-pickup" className="block text-sm font-medium text-gray-700 mb-1"><MapPin className="w-4 h-4 inline mr-1 text-green-600" />Pickup Location</label>
            <input id="sched-pickup" type="text" value={pickup} onChange={e => setPickup(e.target.value)} placeholder="Enter pickup address" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>

          <div>
            <label htmlFor="sched-dropoff" className="block text-sm font-medium text-gray-700 mb-1"><MapPin className="w-4 h-4 inline mr-1 text-red-600" />Destination</label>
            <input id="sched-dropoff" type="text" value={dropoff} onChange={e => setDropoff(e.target.value)} placeholder="Enter destination" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="sched-date" className="block text-sm font-medium text-gray-700 mb-1"><Calendar className="w-4 h-4 inline mr-1" />Date</label>
              <input id="sched-date" type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label htmlFor="sched-time" className="block text-sm font-medium text-gray-700 mb-1"><Clock className="w-4 h-4 inline mr-1" />Time</label>
              <input id="sched-time" type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>

          <div>
            <label htmlFor="sched-category" className="block text-sm font-medium text-gray-700 mb-1"><Car className="w-4 h-4 inline mr-1" />Vehicle</label>
            <select id="sched-category" value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
              <option value="black_sedan">Black Sedan</option>
              <option value="black_suv">Black SUV</option>
              <option value="black_ev">Black EV</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="sched-pax" className="block text-sm font-medium text-gray-700 mb-1">Passengers</label>
              <select id="sched-pax" value={passengers} onChange={e => setPassengers(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="sched-luggage" className="block text-sm font-medium text-gray-700 mb-1">Luggage</label>
              <select id="sched-luggage" value={luggage} onChange={e => setLuggage(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                {[0, 1, 2, 3, 4].map(n => <option key={n} value={n}>{n} bag{n !== 1 ? 's' : ''}</option>)}
              </select>
            </div>
          </div>

          {passengers > 3 && category === 'black_sedan' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800 font-medium">Upgrade suggested</p>
              <p className="text-xs text-yellow-700 mt-1">A Black SUV is recommended for {passengers} passengers. <button onClick={() => setCategory('black_suv')} className="text-blue-600 underline">Switch to SUV</button></p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!pickup || !dropoff || !date || !time}
            className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Schedule Ride
          </button>
        </div>
      </div>
    </div>
  );
}
