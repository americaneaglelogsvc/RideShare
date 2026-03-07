import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, Car, Clock, Calendar, User, Search, Star, Shield } from 'lucide-react-native';

export default function RiderHomeScreen() {
  const router = useRouter();
  const [pickupLocation, setPickupLocation] = useState('Current Location');
  const [destination, setDestination] = useState('');

  const handleBookRide = () => {
    if (!destination) {
      Alert.alert('Destination Required', 'Please enter your destination');
      return;
    }
    router.push('/(tabs)/booking');
  };

  const handleScheduledRide = () => {
    router.push('/(tabs)/scheduled');
  };

  const handleHourlyRide = () => {
    router.push('/(tabs)/hourly');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>Good morning!</Text>
          <Text style={styles.userName}>Welcome back, John</Text>
        </View>
        <TouchableOpacity style={styles.profileButton}>
          <User size={24} color="#1a73e8" />
        </TouchableOpacity>
      </View>

      {/* Location Input */}
      <View style={styles.locationCard}>
        <View style={styles.locationInput}>
          <MapPin size={20} color="#666" />
          <Text style={styles.locationText}>{pickupLocation}</Text>
        </View>
        
        <View style={styles.divider} />
        
        <TouchableOpacity 
          style={styles.destinationInput}
          onPress={() => router.push('/(tabs)/booking')}
        >
          <Search size={20} color="#666" />
          <Text style={styles.destinationText}>Where to?</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Booking Options */}
      <View style={styles.bookingOptions}>
        <TouchableOpacity style={styles.bookingCard} onPress={handleBookRide}>
          <View style={styles.bookingIcon}>
            <Car size={32} color="#1a73e8" />
          </View>
          <Text style={styles.bookingTitle}>Book Now</Text>
          <Text style={styles.bookingSubtitle}>Get a ride in minutes</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bookingCard} onPress={handleScheduledRide}>
          <View style={styles.bookingIcon}>
            <Calendar size={32} color="#9333ea" />
          </View>
          <Text style={styles.bookingTitle}>Schedule</Text>
          <Text style={styles.bookingSubtitle}>Book for later</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bookingCard} onPress={handleHourlyRide}>
          <View style={styles.bookingIcon}>
            <Clock size={32} color="#f59e0b" />
          </View>
          <Text style={styles.bookingTitle}>Hourly</Text>
          <Text style={styles.bookingSubtitle}>Chauffeur service</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Destinations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Destinations</Text>
        <View style={styles.recentDestinations}>
          <TouchableOpacity style={styles.recentDestination}>
            <View style={styles.recentIcon}>
              <MapPin size={16} color="#1a73e8" />
            </View>
            <View style={styles.recentInfo}>
              <Text style={styles.recentName}>O'Hare Airport</Text>
              <Text style={styles.recentAddress}>Terminal 1, Chicago</Text>
            </View>
            <Text style={styles.recentPrice}>$45.50</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.recentDestination}>
            <View style={styles.recentIcon}>
              <MapPin size={16} color="#1a73e8" />
            </View>
            <View style={styles.recentInfo}>
              <Text style={styles.recentName}>Downtown</Text>
              <Text style={styles.recentAddress}>Michigan Avenue</Text>
            </View>
            <Text style={styles.recentPrice}>$28.00</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.recentDestination}>
            <View style={styles.recentIcon}>
              <MapPin size={16} color="#1a73e8" />
            </View>
            <View style={styles.recentInfo}>
              <Text style={styles.recentName}>United Center</Text>
              <Text style={styles.recentAddress}>1901 W Madison St</Text>
            </View>
            <Text style={styles.recentPrice}>$35.00</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Promotions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Special Offers</Text>
        <View style={styles.promoCard}>
          <View style={styles.promoHeader}>
            <View style={styles.promoIcon}>
              <Star size={24} color="#f59e0b" />
            </View>
            <View style={styles.promoInfo}>
              <Text style={styles.promoTitle}>First Ride Free</Text>
              <Text style={styles.promoSubtitle}>Use code: WELCOME2024</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.promoButton}>
            <Text style={styles.promoButtonText}>Apply Code</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Safety Features */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Safety First</Text>
        <View style={styles.safetyFeatures}>
          <View style={styles.safetyFeature}>
            <Shield size={20} color="#10b981" />
            <Text style={styles.safetyText}>Verified drivers</Text>
          </View>
          <View style={styles.safetyFeature}>
            <Shield size={20} color="#10b981" />
            <Text style={styles.safetyText}>GPS tracking</Text>
          </View>
          <View style={styles.safetyFeature}>
            <Shield size={20} color="#10b981" />
            <Text style={styles.safetyText}>24/7 support</Text>
          </View>
        </View>
      </View>
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
  headerContent: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationCard: {
    backgroundColor: '#fff',
    margin: 20,
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
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },
  destinationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  destinationText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#999',
  },
  bookingOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  bookingCard: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
  },
  bookingIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  bookingSubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
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
  recentDestinations: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recentDestination: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recentIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recentInfo: {
    flex: 1,
  },
  recentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  recentAddress: {
    fontSize: 14,
    color: '#666',
  },
  recentPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a73e8',
  },
  promoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  promoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  promoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  promoInfo: {
    flex: 1,
  },
  promoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  promoSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  promoButton: {
    backgroundColor: '#1a73e8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  promoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  safetyFeatures: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  safetyFeature: {
    alignItems: 'center',
    flex: 1,
  },
  safetyText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
});
