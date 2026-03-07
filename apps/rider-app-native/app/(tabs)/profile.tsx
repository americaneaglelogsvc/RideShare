import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { User, Phone, Mail, CreditCard, Shield, Bell, HelpCircle, LogOut, Edit, ChevronRight, ArrowLeft, MapPin, Wallet, Settings, Star } from 'lucide-react-native';
import { riderApi } from '../../lib/api';

export default function RiderProfileScreen() {
  const router = useRouter();

  const profileData = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    memberSince: 'January 2024',
    rating: 4.8,
    totalRides: 47,
    memberLevel: 'Gold',
    paymentMethods: [
      { id: '1', type: 'credit', last4: '4242', brand: 'Visa', isDefault: true },
      { id: '2', type: 'credit', last4: '5555', brand: 'Mastercard', isDefault: false }
    ],
    addresses: [
      { id: '1', label: 'Home', address: '123 Main St, Chicago, IL 60601' },
      { id: '2', label: 'Work', address: '456 Business Ave, Chicago, IL 60602' }
    ]
  };

  const menuItems = [
    { id: 'personal', title: 'Personal Information', icon: User, color: '#1a73e8' },
    { id: 'payment', title: 'Payment Methods', icon: CreditCard, color: '#10b981' },
    { id: 'addresses', title: 'Saved Addresses', icon: MapPin, color: '#f59e0b' },
    { id: 'wallet', title: 'Wallet & Credits', icon: Wallet, color: '#9333ea' },
    { id: 'notifications', title: 'Notifications', icon: Bell, color: '#06b6d4' },
    { id: 'privacy', title: 'Privacy & Security', icon: Shield, color: '#ef4444' },
    { id: 'help', title: 'Help & Support', icon: HelpCircle, color: '#6b7280' },
    { id: 'settings', title: 'Settings', icon: Settings, color: '#6b7280' }
  ];

  const handleEditProfile = () => {
    Alert.alert('Edit Profile', 'Profile editing would open here');
  };

  const handleMenuItemPress = (itemId: string) => {
    switch (itemId) {
      case 'personal':
        Alert.alert('Personal Information', 'Personal information editing would open here');
        break;
      case 'payment':
        Alert.alert('Payment Methods', 'Payment methods management would open here');
        break;
      case 'addresses':
        Alert.alert('Saved Addresses', 'Address management would open here');
        break;
      case 'wallet':
        Alert.alert('Wallet & Credits', 'Wallet and credits management would open here');
        break;
      case 'notifications':
        Alert.alert('Notifications', 'Notification settings would open here');
        break;
      case 'privacy':
        Alert.alert('Privacy & Security', 'Privacy and security settings would open here');
        break;
      case 'help':
        router.push('/(tabs)/support');
        break;
      case 'settings':
        Alert.alert('Settings', 'App settings would open here');
        break;
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: () => {
            // Handle logout logic here
            router.replace('/');
          }
        }
      ]
    );
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            color={star <= Math.floor(rating) ? '#f59e0b' : '#e5e7eb'}
            fill={star <= Math.floor(rating) ? '#f59e0b' : 'none'}
          />
        ))}
        <Text style={styles.ratingText}>{rating}</Text>
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
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
          <Edit size={20} color="#1a73e8" />
        </TouchableOpacity>
      </View>

      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: 'https://picsum.photos/seed/user-avatar/100/100.jpg' }}
            style={styles.avatar}
          />
          <View style={styles.memberBadge}>
            <Text style={styles.memberBadgeText}>{profileData.memberLevel}</Text>
          </View>
        </View>
        
        <View style={styles.profileInfo}>
          <Text style={styles.userName}>{profileData.name}</Text>
          <Text style={styles.userEmail}>{profileData.email}</Text>
          <Text style={styles.userPhone}>{profileData.phone}</Text>
          <Text style={styles.memberSince}>Member since {profileData.memberSince}</Text>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsSection}>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profileData.totalRides}</Text>
            <Text style={styles.statLabel}>Total Rides</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profileData.rating}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>$2,847</Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>
        </View>
        
        <View style={styles.ratingSection}>
          <Text style={styles.ratingLabel}>Your Rating</Text>
          {renderStars(profileData.rating)}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionButton} onPress={() => handleMenuItemPress('payment')}>
            <CreditCard size={24} color="#1a73e8" />
            <Text style={styles.quickActionText}>Payment</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton} onPress={() => handleMenuItemPress('addresses')}>
            <MapPin size={24} color="#10b981" />
            <Text style={styles.quickActionText}>Addresses</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton} onPress={() => handleMenuItemPress('wallet')}>
            <Wallet size={24} color="#f59e0b" />
            <Text style={styles.quickActionText}>Wallet</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton} onPress={() => router.push('/(tabs)/support')}>
            <HelpCircle size={24} color="#9333ea" />
            <Text style={styles.quickActionText}>Support</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.menuItems}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => handleMenuItemPress(item.id)}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
                  <item.icon size={20} color={item.color} />
                </View>
                <Text style={styles.menuItemText}>{item.title}</Text>
              </View>
              <ChevronRight size={20} color="#9ca3af" />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Payment Methods */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Methods</Text>
        <View style={styles.paymentMethods}>
          {profileData.paymentMethods.map((method) => (
            <View key={method.id} style={styles.paymentMethod}>
              <View style={styles.paymentMethodLeft}>
                <CreditCard size={20} color="#1a73e8" />
                <View style={styles.paymentMethodInfo}>
                  <Text style={styles.paymentMethodBrand}>{method.brand}</Text>
                  <Text style={styles.paymentMethodNumber}>•••• {method.last4}</Text>
                </View>
              </View>
              {method.isDefault && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultBadgeText}>Default</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </View>

      {/* Sign Out Button */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
          <LogOut size={20} color="#ef4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* App Version */}
      <View style={styles.footer}>
        <Text style={styles.versionText}>UrWay Dispatch v1.0.0</Text>
        <Text style={styles.versionText}>© 2024 UrWay Technologies</Text>
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
  editButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  memberBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  memberBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  profileInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  memberSince: {
    fontSize: 14,
    color: '#9ca3af',
  },
  statsSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statCard: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a73e8',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginRight: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 4,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickActionButton: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontWeight: '600',
  },
  menuItems: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  paymentMethods: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentMethod: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodInfo: {
    marginLeft: 12,
  },
  paymentMethodBrand: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  paymentMethodNumber: {
    fontSize: 14,
    color: '#666',
  },
  defaultBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  defaultBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  versionText: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
});
