import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Car, MapPin, Clock, DollarSign, Users, Luggage, Wheelchair, Baby } from 'lucide-react';
import { riderApiService } from '../services/api.service';
import { geocodeAddress, searchAddresses } from '../services/geocoding.service';
import { MobileCard, MobileCardHeader, MobileCardBody } from '../components/MobileCard';
import { MobileButton } from '../components/MobileButton';
import { MobileInput, MobileSelect } from '../components/MobileForm';
import { MobileHeader } from '../components/MobileNavigation';

interface PassengerRequirements {
  passenger_count: number;
  immediacy: 'immediate' | 'scheduled';
  scheduled_time?: string;
  luggage_size: 'none' | 'small' | 'medium' | 'large' | 'extra_large';
  unaccompanied_minors: boolean;
  minors_ages?: number[];
  special_assistance: boolean;
  assistance_type?: 'wheelchair' | 'mobility' | 'visual' | 'hearing' | 'medical' | 'other';
  assistance_details?: string;
  ride_preference: 'economy' | 'standard' | 'premium' | 'luxury';
}

interface VehicleRecommendation {
  vehicle_type: string;
  display_name: string;
  match_score: number;
  match_reasons: string[];
  estimated_fare_cents: number;
  capacity: number;
  luggage_capacity: string;
  features: string[];
}

interface BookingFlowResponse {
  passenger_requirements: PassengerRequirements;
  vehicle_recommendations: VehicleRecommendation[];
  estimated_duration_minutes: number;
  estimated_distance_miles: number;
  nextSteps: string[];
}

interface QuoteData {
  total_cents: number;
  line_items: Array<{ name: string; amount_cents: number; description?: string }>;
  surge_multiplier: number;
  surge_cap: number;
  eta_minutes: number;
  quote_id: string;
}

export function BookingPage() {
  const [step, setStep] = useState(1);
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [pickupCoords, setPickupCoords] = useState<{lat: number; lng: number} | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<{lat: number; lng: number} | null>(null);
  const [pickupSuggestions, setPickupSuggestions] = useState<Array<{lat: number; lng: number; display_name: string}>>([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState<Array<{lat: number; lng: number; display_name: string}>>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleRecommendation | null>(null);
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [requirements, setRequirements] = useState<PassengerRequirements>({
    passenger_count: 1,
    immediacy: 'immediate',
    luggage_size: 'medium',
    unaccompanied_minors: false,
    special_assistance: false,
    ride_preference: 'standard',
  });
  const [bookingFlowData, setBookingFlowData] = useState<BookingFlowResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);

  // Debounced address search
  const searchPickup = useCallback(async (query: string) => {
    setPickup(query);
    setPickupCoords(null);
    if (query.length >= 3) {
      const results = await searchAddresses(query);
      setPickupSuggestions(results);
    } else {
      setPickupSuggestions([]);
    }
  }, []);

  const searchDropoff = useCallback(async (query: string) => {
    setDropoff(query);
    setDropoffCoords(null);
    if (query.length >= 3) {
      const results = await searchAddresses(query);
      setDropoffSuggestions(results);
    } else {
      setDropoffSuggestions([]);
    }
  }, []);

  const selectPickup = (suggestion: {lat: number; lng: number; display_name: string}) => {
    setPickup(suggestion.display_name);
    setPickupCoords({ lat: suggestion.lat, lng: suggestion.lng });
    setPickupSuggestions([]);
  };

  const selectDropoff = (suggestion: {lat: number; lng: number; display_name: string}) => {
    setDropoff(suggestion.display_name);
    setDropoffCoords({ lat: suggestion.lat, lng: suggestion.lng });
    setDropoffSuggestions([]);
  };

  // Handle passenger requirements step
  const handleRequirementsSubmit = async () => {
    if (!pickup || !dropoff) {
      alert('Please enter pickup and dropoff locations');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Geocode addresses if not already resolved
      let pCoords = pickupCoords;
      let dCoords = dropoffCoords;
      if (!pCoords) {
        const result = await geocodeAddress(pickup);
        if (result) {
          pCoords = { lat: result.lat, lng: result.lng };
          setPickupCoords(pCoords);
        } else {
          // Fallback to Chicago downtown if geocoding fails
          pCoords = { lat: 41.8781, lng: -87.6298 };
        }
      }
      if (!dCoords) {
        const result = await geocodeAddress(dropoff);
        if (result) {
          dCoords = { lat: result.lat, lng: result.lng };
          setDropoffCoords(dCoords);
        } else {
          dCoords = { lat: 41.9786, lng: -87.9048 };
        }
      }

      const response = await riderApiService.processPassengerRequirements({
        requirements,
        pickup: {
          lat: pCoords.lat,
          lng: pCoords.lng,
          address: pickup,
        },
        dropoff: {
          lat: dCoords.lat,
          lng: dCoords.lng,
          address: dropoff,
        },
      });

      setBookingFlowData(response);
      setStep(2);
    } catch (error: any) {
      setError(error.message || 'Failed to process requirements. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle vehicle selection
  const handleVehicleSelect = (vehicle: VehicleRecommendation) => {
    setSelectedVehicle(vehicle);
    setStep(3);
  };

  // Get quote for selected vehicle
  const handleGetQuote = async () => {
    if (!selectedVehicle || !pickup || !dropoff) return;

    setLoading(true);
    try {
      // Call the actual pricing service with selected vehicle
      const pCoords = pickupCoords || { lat: 41.8781, lng: -87.6298 };
      const dCoords = dropoffCoords || { lat: 41.9786, lng: -87.9048 };
      const quoteData = await riderApiService.getQuote({
        category: selectedVehicle.vehicle_type,
        service: requirements.immediacy === 'immediate' ? 'on_demand' : 'scheduled',
        pickup: {
          lat: pCoords.lat,
          lng: pCoords.lng,
          address: pickup,
        },
        dropoff: {
          lat: dCoords.lat,
          lng: dCoords.lng,
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
    } catch (err: any) {
      // Use the estimated fare from vehicle recommendation as fallback
      if (selectedVehicle) {
        const fallbackQuote: QuoteData = {
          total_cents: selectedVehicle.estimated_fare_cents,
          line_items: [
            { name: 'Base Fare', amount_cents: Math.round(selectedVehicle.estimated_fare_cents * 0.3) },
            { name: 'Distance', amount_cents: Math.round(selectedVehicle.estimated_fare_cents * 0.5), description: `${bookingFlowData?.estimated_distance_miles?.toFixed(1) || '10.0'} miles` },
            { name: 'Time', amount_cents: Math.round(selectedVehicle.estimated_fare_cents * 0.2), description: `${bookingFlowData?.estimated_duration_minutes || '25'} minutes` },
          ],
          surge_multiplier: 1.0,
          surge_cap: 2.0,
          eta_minutes: 8,
          quote_id: 'quote_' + Date.now(),
        };
        setQuote(fallbackQuote);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBookRide = async () => {
    if (!quote) return;

    setError(null);
    setLoading(true);
    try {
      // Get rider info from Supabase auth session
      const supabase = riderApiService.getSupabaseClient();
      const { data: session } = await supabase.auth.getSession();
      const userMeta = session.session?.user?.user_metadata || {};
      const riderName = `${userMeta.first_name || ''} ${userMeta.last_name || ''}`.trim() || 'Guest';
      const riderPhone = userMeta.phone || '+1-000-000-0000';

      const booking = await riderApiService.bookRide({
        quote_id: quote.quote_id,
        rider_name: riderName,
        rider_phone: riderPhone,
        special_instructions: JSON.stringify(requirements),
        vehicle_type: selectedVehicle?.vehicle_type,
      });

      if (booking.success) {
        setBookingConfirmed(true);
        setBookingId(booking.booking_id);
      }
    } catch (err: any) {
      setError(err.message || 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const updateRequirement = (field: keyof PassengerRequirements, value: any) => {
    setRequirements(prev => ({ ...prev, [field]: value }));
  };

  // Render Step 1: Passenger Requirements
  const renderStep1 = () => (
    <div className="space-y-6">
      <MobileCard>
        <MobileCardHeader>
          <h2 className="text-lg md:text-xl font-semibold mb-6">Tell us about your trip</h2>
        </MobileCardHeader>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">How many people will be riding?</label>
            <MobileSelect
              value={requirements.passenger_count.toString()}
              onChange={(value) => updateRequirement('passenger_count', parseInt(value))}
              options={[
                { value: '1', label: '1 passenger' },
                { value: '2', label: '2 passengers' },
                { value: '3', label: '3 passengers' },
                { value: '4', label: '4 passengers' },
                { value: '5', label: '5 passengers' },
                { value: '6', label: '6 passengers' },
                { value: '7', label: '7 passengers' },
                { value: '8', label: '8 passengers' },
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Is this an immediate need or scheduled for later?</label>
            <MobileSelect
              value={requirements.immediacy}
              onChange={(value) => updateRequirement('immediacy', value)}
              options={[
                { value: 'immediate', label: 'Immediate - I need a ride now' },
                { value: 'scheduled', label: 'Scheduled - I want to book for later' },
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Do you have luggage?</label>
            <MobileSelect
              value={requirements.luggage_size}
              onChange={(value) => updateRequirement('luggage_size', value)}
              options={[
                { value: 'none', label: 'No luggage' },
                { value: 'small', label: 'Small (backpack, small bag)' },
                { value: 'medium', label: 'Medium (suitcase, multiple bags)' },
                { value: 'large', label: 'Large (multiple suitcases)' },
                { value: 'extra_large', label: 'Extra Large (excessive luggage)' },
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Any unaccompanied minors?</label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="minors"
                  checked={!requirements.unaccompanied_minors}
                  onChange={() => updateRequirement('unaccompanied_minors', false)}
                  className="mr-2"
                />
                No
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="minors"
                  checked={requirements.unaccompanied_minors}
                  onChange={() => updateRequirement('unaccompanied_minors', true)}
                  className="mr-2"
                />
                Yes
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Any riders need special assistance?</label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="assistance"
                  checked={!requirements.special_assistance}
                  onChange={() => updateRequirement('special_assistance', false)}
                  className="mr-2"
                />
                No
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="assistance"
                  checked={requirements.special_assistance}
                  onChange={() => updateRequirement('special_assistance', true)}
                  className="mr-2"
                />
                Yes
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">What kind of ride do you prefer?</label>
            <MobileSelect
              value={requirements.ride_preference}
              onChange={(value) => updateRequirement('ride_preference', value)}
              options={[
                { value: 'economy', label: 'Economy - Most affordable' },
                { value: 'standard', label: 'Standard - Good value' },
                { value: 'premium', label: 'Premium - Extra comfort' },
                { value: 'luxury', label: 'Luxury - Best experience' },
              ]}
            />
          </div>
        </div>
      </MobileCard>

      <MobileCard>
        <MobileCardHeader>
          <h2 className="text-lg md:text-xl font-semibold mb-6">Trip Details</h2>
        </MobileCardHeader>
        
        <div className="space-y-4">
          <MobileInput
            label="Pickup Location"
            placeholder="Enter pickup address"
            value={pickup}
            onChange={setPickup}
            icon={MapPin}
          />

          <MobileInput
            label="Dropoff Location"
            placeholder="Enter destination address"
            value={dropoff}
            onChange={setDropoff}
            icon={MapPin}
          />
        </div>
      </MobileCard>

      <MobileButton
        onClick={handleRequirementsSubmit}
        disabled={!pickup || !dropoff || loading}
        icon={Car}
        iconPosition="left"
        className="w-full"
      >
        {loading ? 'Finding Vehicles...' : 'Find Available Vehicles'}
      </MobileButton>
    </div>
  );

  // Render Step 2: Vehicle Selection
  const renderStep2 = () => (
    <div className="space-y-6">
      <MobileCard>
        <MobileCardHeader>
          <h2 className="text-lg md:text-xl font-semibold mb-2">Recommended Vehicles</h2>
          <p className="text-gray-600">Based on your requirements, we found {bookingFlowData?.vehicle_recommendations.length || 0} options</p>
        </MobileCardHeader>
        
        <div className="space-y-4">
          {bookingFlowData?.vehicle_recommendations.map((vehicle, index) => (
            <div
              key={vehicle.vehicle_type}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedVehicle?.vehicle_type === vehicle.vehicle_type
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleVehicleSelect(vehicle)}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg">{vehicle.display_name}</h3>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">{formatCurrency(vehicle.estimated_fare_cents)}</div>
                  <div className="text-xs text-gray-500">Estimated fare</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  {vehicle.capacity} passengers
                </div>
                <div className="flex items-center">
                  <Luggage className="w-4 h-4 mr-1" />
                  {vehicle.luggage_capacity}
                </div>
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-1 ${
                    vehicle.match_score >= 80 ? 'bg-green-500' :
                    vehicle.match_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  {vehicle.match_score}% match
                </div>
              </div>

              <div className="text-sm text-gray-600">
                {vehicle.match_reasons.slice(0, 2).map((reason, idx) => (
                  <div key={idx} className="flex items-center">
                    <div className="w-1 h-1 bg-gray-400 rounded-full mr-2" />
                    {reason}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {vehicle.features.slice(0, 3).map((feature, idx) => (
                  <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </MobileCard>

      <MobileButton
        onClick={() => setStep(1)}
        variant="secondary"
        className="w-full"
      >
        Back to Requirements
      </MobileButton>
    </div>
  );

  // Render Step 3: Quote and Booking
  const renderStep3 = () => (
    <div className="space-y-6">
      <MobileCard>
        <MobileCardHeader>
          <h2 className="text-lg md:text-xl font-semibold mb-2">Selected Vehicle</h2>
        </MobileCardHeader>
        
        {selectedVehicle && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-lg">{selectedVehicle.display_name}</h3>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    {selectedVehicle.capacity} passengers
                  </div>
                  <div className="flex items-center">
                    <Luggage className="w-4 h-4 mr-1" />
                    {selectedVehicle.luggage_capacity}
                  </div>
                </div>
              </div>
              <div className="text-lg font-bold text-blue-600">
                {formatCurrency(selectedVehicle.estimated_fare_cents)}
              </div>
            </div>
          </div>
        )}
      </MobileCard>

      <MobileCard>
        <MobileCardHeader>
          <h2 className="text-lg md:text-xl font-semibold mb-6">Price Quote</h2>
        </MobileCardHeader>
        
        {!quote ? (
          <div className="text-center py-8">
            <MobileButton
              onClick={handleGetQuote}
              disabled={loading}
              icon={DollarSign}
              iconPosition="left"
              className="w-full"
            >
              {loading ? 'Getting Quote...' : 'Get Exact Quote'}
            </MobileButton>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xl md:text-2xl font-bold">
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

            <MobileButton 
              onClick={handleBookRide}
              variant="secondary"
              icon={Car}
              iconPosition="left"
              className="w-full"
            >
              Book Now
            </MobileButton>
          </div>
        )}
      </MobileCard>

      <MobileButton
        onClick={() => setStep(2)}
        variant="secondary"
        className="w-full"
      >
        Back to Vehicles
      </MobileButton>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <MobileHeader 
        title={`Book Your Ride - Step ${step}`}
        leftAction={{
          icon: ArrowLeft,
          onClick: step > 1 ? () => setStep(step - 1) : () => window.history.back(),
          ariaLabel: step > 1 ? 'Previous step' : 'Go back'
        }}
      />

      {/* Desktop Header */}
      <header className="bg-white shadow-sm px-6 py-4 hidden md:block">
        <div className="max-w-4xl mx-auto flex items-center">
          <Link to="/" className="flex items-center text-gray-600 hover:text-gray-900 mr-6">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Link>
          <div className="flex items-center space-x-2">
            <Car className="w-6 h-6 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">UrWay Dispatch</span>
          </div>
          <div className="ml-auto">
            <span className="text-sm text-gray-600">Step {step} of 3</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Book Your Ride</h1>
        </div>

        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= stepNumber 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {stepNumber}
                </div>
                {stepNumber < 3 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    step > stepNumber ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span>Requirements</span>
            <span>Vehicle Selection</span>
            <span>Booking</span>
          </div>
        </div>

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>
    </div>
  );
}
