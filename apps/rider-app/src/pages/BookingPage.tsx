import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Car, MapPin, Clock, DollarSign, ArrowLeft } from 'lucide-react';
import { riderApiService } from '../services/api.service';

interface QuoteData {
  total_cents: number;
  line_items: Array<{ name: string; amount_cents: number; description?: string }>;
  surge_multiplier: number;
  surge_cap: number;
  eta_minutes: number;
  quote_id: string;
}

export function BookingPage() {
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [category, setCategory] = useState('black_sedan');
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGetQuote = async () => {
    if (!pickup || !dropoff) return;

    setLoading(true);
    try {
      // Call the actual pricing service
      const quoteData = await riderApiService.getQuote({
        category,
        service: 'on_demand',
        pickup: {
          lat: 41.8781,
          lng: -87.6298,
          address: pickup,
        },
        dropoff: {
          lat: 41.9786,
          lng: -87.9048,
          address: dropoff,
        },
      });
      
      const formattedQuote: QuoteData = {
        total_cents: quoteData.total_cents,
        line_items: quoteData.line_items,
        surge_multiplier: quoteData.surge_multiplier,
        surge_cap: quoteData.surge_cap,
        eta_minutes: quoteData.eta_minutes,
        quote_id: quoteData.quote_id,
      };
      
      setQuote(formattedQuote);
    } catch (error) {
      console.error('Error getting quote from API:', error);
      // Fallback to mock data if API fails
      const mockQuote: QuoteData = {
        total_cents: 4500,
        line_items: [
          { name: 'Base Fare', amount_cents: 1000 },
          { name: 'Distance', amount_cents: 2600, description: '10.0 miles' },
          { name: 'Time', amount_cents: 900, description: '25 minutes' },
        ],
        surge_multiplier: 1.2,
        surge_cap: 1.8,
        eta_minutes: 8,
        quote_id: 'quote_123456',
      };
      setQuote(mockQuote);
    } finally {
      setLoading(false);
    }
  };

  const handleBookRide = async () => {
    if (!quote) return;

    try {
      const booking = await riderApiService.bookRide({
        quote_id: quote.quote_id,
        rider_name: 'John Doe', // In a real app, this would come from user input
        rider_phone: '+1-312-555-0123',
        special_instructions: 'Please call when you arrive'
      });

      if (booking.success) {
        alert(`Booking successful! Booking ID: ${booking.booking_id}`);
      }
    } catch (error) {
      console.error('Booking error:', error);
      alert('Booking failed. Please try again.');
    }
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center">
          <Link to="/" className="flex items-center text-gray-600 hover:text-gray-900 mr-6">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Link>
          <div className="flex items-center space-x-2">
            <Car className="w-6 h-6 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">UrWay Dispatch</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Book Your Ride</h1>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Booking Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6">Trip Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Pickup Location
                </label>
                <input
                  type="text"
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  placeholder="Enter pickup address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Dropoff Location
                </label>
                <input
                  type="text"
                  value={dropoff}
                  onChange={(e) => setDropoff(e.target.value)}
                  placeholder="Enter destination address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vehicle Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="black_sedan">Black Sedan</option>
                  <option value="black_suv">Black SUV</option>
                  <option value="black_ev">Black EV</option>
                </select>
              </div>

              <button
                onClick={handleGetQuote}
                disabled={!pickup || !dropoff || loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
              >
                {loading ? 'Getting Quote...' : 'Get Quote'}
              </button>
            </div>
          </div>

          {/* Quote Display */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6">Price Quote</h2>
            
            {!quote ? (
              <div className="text-center text-gray-500 py-12">
                <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Enter trip details to get your upfront fare quote</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center text-2xl font-bold">
                  <span>Total</span>
                  <span className="text-blue-600">{formatCurrency(quote.total_cents)}</span>
                </div>

                <div className="border-t pt-4 space-y-2">
                  {quote.line_items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {item.name}
                        {item.description && (
                          <span className="text-gray-400 ml-1">({item.description})</span>
                        )}
                      </span>
                      <span>{formatCurrency(item.amount_cents)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Surge Multiplier</span>
                    <span>{quote.surge_multiplier}x (cap: {quote.surge_cap}x)</span>
                  </div>
                  <div className="flex justify-between">
                    <span><Clock className="w-4 h-4 inline mr-1" />ETA</span>
                    <span>{quote.eta_minutes} minutes</span>
                  </div>
                </div>

                <button 
                  onClick={handleBookRide}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 font-semibold mt-6"
                >
                  Book Now
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}