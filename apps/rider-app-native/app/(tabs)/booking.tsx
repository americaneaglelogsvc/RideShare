import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, Car, Clock, CreditCard, Search, ArrowLeft, Plus, Minus } from 'lucide-react-native';
import { riderApi } from '../../lib/api';

export default function BookingScreen() {
  const router = useRouter();
  const [pickupLocation, setPickupLocation] = useState('Current Location');
  const [destination, setDestination] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('standard');
  const [passengers, setPassengers] = useState(1);
  const [luggage, setLuggage] = useState(0);
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const vehicleOptions = [
    { id: 'standard', name: 'Standard', capacity: 4, price: 28.50, icon: '🚗' },
    { id: 'comfort', name: 'Comfort', capacity: 4, price: 35.00, icon: '🚙' },
    { id: 'suv', name: 'SUV', capacity: 6, price: 45.00, icon: '🚐' },
    { id: 'luxury', name: 'Luxury', capacity: 4, price: 65.00, icon: '🎩' },
  ];

  const getQuote = async () => {
    if (!destination) {
      Alert.alert('Destination Required', 'Please enter your destination');
      return;
    }
    
    setLoading(true);
    try {
      const result = await riderApi.getQuote({
        category: selectedVehicle,
        service: 'on_demand',
        pickup: { lat: 41.8781, lng: -87.6298, address: pickupLocation },
        dropoff: { lat: 41.9786, lng: -87.9048, address: destination },
      });
      setQuote(result);
    } catch (e) {
      console.error('Quote error:', e);
      Alert.alert('Error', 'Unable to get quote. Please try again.');
    }
    setLoading(false);
  };

  const bookRide = async () => {
    if (!quote) {
      Alert.alert('Quote Required', 'Please get a quote first');
      return;
    }
    
    try {
      await riderApi.bookRide({ 
        pickup: pickupLocation, 
        dropoff: destination, 
        category: selectedVehicle,
        passengers,
        luggage
      });
      Alert.alert('Success', 'Your ride has been booked!');
      router.push('/(tabs)/ride-history');
    } catch (e) {
      console.error('Booking error:', e);
      Alert.alert('Error', 'Unable to book ride. Please try again.');
    }
  };

  const increasePassengers = () => {
    if (passengers < 6) setPassengers(passengers + 1);
  };

  const decreasePassengers = () => {
    if (passengers > 1) setPassengers(passengers - 1);
  };

  const increaseLuggage = () => {
    if (luggage < 4) setLuggage(luggage + 1);
  };

  const decreaseLuggage = () => {
    if (luggage > 0) setLuggage(luggage - 1);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1a73e8" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Your Ride</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Location Inputs */}
      <View style={styles.locationSection}>
        <View style={styles.locationCard}>
          <View style={styles.locationInput}>
            <MapPin size={20} color="#666" />
            <Text style={styles.locationText}>{pickupLocation}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.locationInput}>
            <Search size={20} color="#666" />
            <TextInput
              style={styles.destinationInput}
              placeholder="Where to?"
              value={destination}
              onChangeText={setDestination}
              placeholderTextColor="#999"
            />
          </View>
        </View>
      </View>

      {/* Passenger & Luggage */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Passengers & Luggage</Text>
        <View style={styles.passengerLuggageCard}>
          <View style={styles.counterRow}>
            <View style={styles.counterInfo}>
              <Text style={styles.counterLabel}>Passengers</Text>
              <Text style={styles.counterValue}>{passengers} people</Text>
            </View>
            <View style={styles.counterButtons}>
              <TouchableOpacity 
                style={[styles.counterButton, passengers === 1 && styles.disabledButton]}
                onPress={decreasePassengers}
                disabled={passengers === 1}
              >
                <Minus size={16} color={passengers === 1 ? '#ccc' : '#1a73e8'} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.counterButton, passengers === 6 && styles.disabledButton]}
                onPress={increasePassengers}
                disabled={passengers === 6}
              >
                <Plus size={16} color={passengers === 6 ? '#ccc' : '#1a73e8'} />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.counterRow}>
            <View style={styles.counterInfo}>
              <Text style={styles.counterLabel}>Luggage</Text>
              <Text style={styles.counterValue}>{luggage} bags</Text>
            </View>
            <View style={styles.counterButtons}>
              <TouchableOpacity 
                style={[styles.counterButton, luggage === 0 && styles.disabledButton]}
                onPress={decreaseLuggage}
                disabled={luggage === 0}
              >
                <Minus size={16} color={luggage === 0 ? '#ccc' : '#1a73e8'} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.counterButton, luggage === 4 && styles.disabledButton]}
                onPress={increaseLuggage}
                disabled={luggage === 4}
              >
                <Plus size={16} color={luggage === 4 ? '#ccc' : '#1a73e8'} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Vehicle Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Choose Vehicle</Text>
        <View style={styles.vehicleGrid}>
          {vehicleOptions.map((vehicle) => (
            <TouchableOpacity
              key={vehicle.id}
              style={[
                styles.vehicleCard,
                selectedVehicle === vehicle.id && styles.selectedVehicle
              ]}
              onPress={() => setSelectedVehicle(vehicle.id)}
            >
              <Text style={styles.vehicleIcon}>{vehicle.icon}</Text>
              <Text style={styles.vehicleName}>{vehicle.name}</Text>
              <Text style={styles.vehicleCapacity}>{vehicle.capacity} seats</Text>
              <Text style={styles.vehiclePrice}>${vehicle.price.toFixed(2)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Payment Method */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        <TouchableOpacity style={styles.paymentCard}>
          <View style={styles.paymentInfo}>
            <CreditCard size={24} color="#1a73e8" />
            <View style={styles.paymentDetails}>
              <Text style={styles.paymentTitle}>Credit Card</Text>
              <Text style={styles.paymentSubtitle}>•••• 4242</Text>
            </View>
          </View>
          <Text style={styles.changeText}>Change</Text>
        </TouchableOpacity>
      </View>

      {/* Get Quote Button */}
      <View style={styles.buttonSection}>
        <TouchableOpacity 
          style={[styles.quoteButton, !destination && styles.disabledButton]}
          onPress={getQuote}
          disabled={!destination || loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Getting Quote...' : 'Get Quote'}</Text>
        </TouchableOpacity>
      </View>

      {/* Quote Display */}
      {quote && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trip Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Base Fare</Text>
              <Text style={styles.summaryValue}>${(quote.base_fare_cents / 100).toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Distance</Text>
              <Text style={styles.summaryValue}>${(quote.distance_cents / 100).toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Service Fee</Text>
              <Text style={styles.summaryValue}>${(quote.service_fee_cents / 100).toFixed(2)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, styles.totalLabel]}>Total</Text>
              <Text style={[styles.summaryValue, styles.totalValue]}>
                ${(quote.total_cents / 100).toFixed(2)}
              </Text>
            </View>
            
            <TouchableOpacity style={styles.bookButton} onPress={bookRide}>
              <Text style={styles.buttonText}>Confirm Booking</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  placeholder: {
    width: 40,
  },
  locationSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  locationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  locationText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  destinationInput: {
    marginLeft: 12,
    fontSize: 16,
    color: '#1a1a1a',
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  passengerLuggageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  counterInfo: {
    flex: 1,
  },
  counterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  counterValue: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  counterButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    padding: 2,
  },
  counterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  disabledButton: {
    opacity: 0.5,
  },
  vehicleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  vehicleCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedVehicle: {
    borderColor: '#1a73e8',
    borderWidth: 2,
  },
  vehicleIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  vehicleName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  vehicleCapacity: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  vehiclePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a73e8',
  },
  paymentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentDetails: {
    marginLeft: 12,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  paymentSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  changeText: {
    fontSize: 14,
    color: '#1a73e8',
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a73e8',
  },
  buttonSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  quoteButton: {
    backgroundColor: '#1a73e8',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  bookButton: {
    backgroundColor: '#00c853',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
