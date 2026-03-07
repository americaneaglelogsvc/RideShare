import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, MapPin, Star, CreditCard, Search, Filter, Calendar, DollarSign, ArrowLeft } from 'lucide-react-native';
import { riderApi } from '../../lib/api';

export default function RideHistoryScreen() {
  const router = useRouter();
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data - in real app this would come from API
  const rideHistory = [
    {
      id: '1',
      date: '2024-03-06',
      time: '09:30 AM',
      pickup: '123 Main St, Chicago',
      dropoff: 'O\'Hare Airport Terminal 1',
      driver: 'Michael Chen',
      vehicle: 'Toyota Camry',
      price: 45.50,
      status: 'completed',
      rating: 5,
      paymentMethod: 'Credit Card',
      duration: '25 min',
      distance: '18.2 mi'
    },
    {
      id: '2',
      date: '2024-03-05',
      time: '06:15 PM',
      pickup: 'Downtown Chicago',
      dropoff: 'Lincoln Park',
      driver: 'Sarah Johnson',
      vehicle: 'Honda Pilot',
      price: 28.00,
      status: 'completed',
      rating: 4,
      paymentMethod: 'Credit Card',
      duration: '15 min',
      distance: '8.5 mi'
    },
    {
      id: '3',
      date: '2024-03-04',
      time: '02:45 PM',
      pickup: 'United Center',
      dropoff: 'Navy Pier',
      driver: 'David Lee',
      vehicle: 'Lincoln Town Car',
      price: 35.00,
      status: 'completed',
      rating: 5,
      paymentMethod: 'Credit Card',
      duration: '20 min',
      distance: '12.1 mi'
    },
    {
      id: '4',
      date: '2024-03-03',
      time: '11:00 AM',
      pickup: 'Hotel Downtown',
      dropoff: 'Museum of Science and Industry',
      driver: 'Emily Wilson',
      vehicle: 'Black SUV',
      price: 52.00,
      status: 'cancelled',
      rating: null,
      paymentMethod: 'Credit Card',
      duration: null,
      distance: null
    }
  ];

  const filters = [
    { id: 'all', label: 'All Rides' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' },
    { id: 'scheduled', label: 'Scheduled' }
  ];

  const filteredRides = rideHistory.filter(ride => {
    const matchesFilter = selectedFilter === 'all' || ride.status === selectedFilter;
    const matchesSearch = searchQuery === '' || 
      ride.pickup.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ride.dropoff.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ride.driver.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleRebook = (ride: any) => {
    router.push('/(tabs)/booking');
  };

  const handleRateDriver = (rideId: string) => {
    router.push(`/(tabs)/ratings?rideId=${rideId}`);
  };

  const handleViewReceipt = (rideId: string) => {
    Alert.alert('Receipt', `Receipt for ride ${rideId} would be displayed here`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'cancelled': return '#ef4444';
      case 'scheduled': return '#f59e0b';
      default: return '#666';
    }
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            color={star <= rating ? '#f59e0b' : '#e5e7eb'}
            fill={star <= rating ? '#f59e0b' : 'none'}
          />
        ))}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1a73e8" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ride History</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search rides..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterTabs}>
            {filters.map((filter) => (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.filterTab,
                  selectedFilter === filter.id && styles.activeFilterTab
                ]}
                onPress={() => setSelectedFilter(filter.id)}
              >
                <Text style={[
                  styles.filterTabText,
                  selectedFilter === filter.id && styles.activeFilterTabText
                ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Rides List */}
      <View style={styles.ridesSection}>
        {filteredRides.length === 0 ? (
          <View style={styles.emptyState}>
            <Clock size={48} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No rides found</Text>
            <Text style={styles.emptyStateSubtitle}>
              {searchQuery ? 'Try adjusting your search' : 'Your ride history will appear here'}
            </Text>
          </View>
        ) : (
          filteredRides.map((ride) => (
            <View key={ride.id} style={styles.rideCard}>
              <View style={styles.rideHeader}>
                <View style={styles.rideDateInfo}>
                  <Text style={styles.rideDate}>{ride.date}</Text>
                  <Text style={styles.rideTime}>{ride.time}</Text>
                </View>
                <View style={styles.rideStatusContainer}>
                  <Text style={[styles.rideStatus, { color: getStatusColor(ride.status) }]}>
                    {ride.status.charAt(0).toUpperCase() + ride.status.slice(1)}
                  </Text>
                </View>
              </View>

              <View style={styles.rideRoute}>
                <View style={styles.routePoint}>
                  <MapPin size={16} color="#10b981" />
                  <Text style={styles.routeText}>{ride.pickup}</Text>
                </View>
                <View style={styles.routePoint}>
                  <MapPin size={16} color="#ef4444" />
                  <Text style={styles.routeText}>{ride.dropoff}</Text>
                </View>
              </View>

              <View style={styles.rideDetails}>
                <View style={styles.rideDetail}>
                  <Text style={styles.detailLabel}>Driver</Text>
                  <Text style={styles.detailValue}>{ride.driver}</Text>
                </View>
                <View style={styles.rideDetail}>
                  <Text style={styles.detailLabel}>Vehicle</Text>
                  <Text style={styles.detailValue}>{ride.vehicle}</Text>
                </View>
              </View>

              {ride.status === 'completed' && (
                <View style={styles.rideDetails}>
                  <View style={styles.rideDetail}>
                    <Text style={styles.detailLabel}>Duration</Text>
                    <Text style={styles.detailValue}>{ride.duration}</Text>
                  </View>
                  <View style={styles.rideDetail}>
                    <Text style={styles.detailLabel}>Distance</Text>
                    <Text style={styles.detailValue}>{ride.distance}</Text>
                  </View>
                </View>
              )}

              {ride.rating && (
                <View style={styles.rideRating}>
                  <Text style={styles.ratingLabel}>Your Rating</Text>
                  {renderStars(ride.rating)}
                </View>
              )}

              <View style={styles.rideFooter}>
                <View style={styles.ridePrice}>
                  <DollarSign size={16} color="#1a73e8" />
                  <Text style={styles.priceText}>${ride.price.toFixed(2)}</Text>
                </View>
                <View style={styles.rideActions}>
                  {ride.status === 'completed' && (
                    <>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleRateDriver(ride.id)}
                      >
                        <Star size={16} color="#f59e0b" />
                        <Text style={styles.actionText}>Rate</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleViewReceipt(ride.id)}
                      >
                        <CreditCard size={16} color="#1a73e8" />
                        <Text style={styles.actionText}>Receipt</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleRebook(ride)}
                  >
                    <Calendar size={16} color="#9333ea" />
                    <Text style={styles.actionText}>Rebook</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
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
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    marginLeft: 12,
    fontSize: 16,
    color: '#1a1a1a',
    flex: 1,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  filterTab: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activeFilterTab: {
    backgroundColor: '#1a73e8',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeFilterTabText: {
    color: '#fff',
  },
  ridesSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  rideCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rideDateInfo: {
    flex: 1,
  },
  rideDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  rideTime: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  rideStatusContainer: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  rideStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  rideRoute: {
    marginBottom: 12,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#1a1a1a',
    flex: 1,
  },
  rideDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  rideDetail: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  rideRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  rideFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  ridePrice: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a73e8',
    marginLeft: 4,
  },
  rideActions: {
    flexDirection: 'row',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginLeft: 4,
  },
});
