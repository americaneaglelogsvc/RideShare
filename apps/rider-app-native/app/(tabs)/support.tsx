import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { HelpCircle, Phone, Mail, MessageCircle, Clock, CheckCircle, AlertCircle, ChevronRight, ArrowLeft, Plus, Minus, Search, Filter, CreditCard, Car, Shield, User, Star } from 'lucide-react-native';
import { riderApi } from '../../lib/api';

export default function SupportScreen() {
  const router = useRouter();
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showNew, setShowNew] = useState(false);
  const [newType, setNewType] = useState('Billing');
  const [newSubject, setNewSubject] = useState('');
  const [newDetails, setNewDetails] = useState('');

  const supportCategories = [
    { id: 'all', label: 'All Issues', icon: HelpCircle, color: '#6b7280' },
    { id: 'payment', label: 'Payment Issues', icon: CreditCard, color: '#10b981' },
    { id: 'ride', label: 'Ride Problems', icon: Car, color: '#1a73e8' },
    { id: 'safety', label: 'Safety Concerns', icon: Shield, color: '#ef4444' },
    { id: 'account', label: 'Account Issues', icon: User, color: '#f59e0b' }
  ];

  const supportTickets = [
    {
      id: '1',
      subject: 'Overcharged for recent ride',
      category: 'payment',
      status: 'resolved',
      priority: 'medium',
      createdAt: '2024-03-05',
      updatedAt: '2024-03-06',
      description: 'I was charged $45.50 for a ride that should have been $35.00.',
      response: 'We\'ve reviewed your trip and issued a $10.50 refund to your payment method.',
      rating: 5
    },
    {
      id: '2',
      subject: 'Driver was late for pickup',
      category: 'ride',
      status: 'open',
      priority: 'low',
      createdAt: '2024-03-06',
      updatedAt: '2024-03-06',
      description: 'Driver arrived 15 minutes late for my scheduled ride.',
      response: null,
      rating: null
    },
    {
      id: '3',
      subject: 'Lost item in vehicle',
      category: 'ride',
      status: 'investigating',
      priority: 'high',
      createdAt: '2024-03-04',
      updatedAt: '2024-03-05',
      description: 'I left my phone in the back seat of the vehicle.',
      response: 'We\'ve contacted the driver and are waiting for confirmation.',
      rating: null
    }
  ];

  const faqItems = [
    {
      id: '1',
      question: 'How do I cancel a ride?',
      answer: 'You can cancel a ride through the app up to 2 minutes after booking without any charges. After that, cancellation fees may apply.'
    },
    {
      id: '2',
      question: 'What is the cancellation policy?',
      answer: 'Cancellations within 2 minutes of booking are free. After 2 minutes, a $5.00 cancellation fee applies. No-shows after driver arrival incur the full fare.'
    },
    {
      id: '3',
      question: 'How do I report a lost item?',
      answer: 'Contact our support team immediately through the app or call our 24/7 helpline. We\'ll help coordinate with the driver to retrieve your item.'
    },
    {
      id: '4',
      question: 'How are fares calculated?',
      answer: 'Fares are calculated based on base rate, distance traveled, time, and current demand. You\'ll always see the estimated fare before booking.'
    },
    {
      id: '5',
      question: 'What if my driver takes a wrong route?',
      answer: 'Our app uses GPS to track the optimal route. If you believe there was an issue, please report it within 24 hours for fare review.'
    }
  ];

  const filteredTickets = supportTickets.filter(ticket => {
    const matchesCategory = selectedCategory === 'all' || ticket.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return '#10b981';
      case 'open': return '#f59e0b';
      case 'investigating': return '#1a73e8';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved': return CheckCircle;
      case 'open': return Clock;
      case 'investigating': return AlertCircle;
      default: return HelpCircle;
    }
  };

  const toggleTicketExpansion = (ticketId: string) => {
    setExpandedTicket(expandedTicket === ticketId ? null : ticketId);
  };

  const handleCreateTicket = () => {
    setShowNew(true);
  };

  const handleCallSupport = () => {
    Alert.alert('Call Support', 'Would dial: 1-800-URWAY-HELP');
  };

  const handleEmailSupport = () => {
    Alert.alert('Email Support', 'Would open: support@urwaydispatch.com');
  };

  const submitIssue = () => {
    if (!newSubject.trim()) return;
    
    const newTicket = {
      id: Date.now().toString(),
      subject: newSubject.trim(),
      category: newType.toLowerCase(),
      status: 'open',
      priority: 'medium',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      description: newDetails.trim(),
      response: null,
      rating: null
    };
    
    supportTickets.unshift(newTicket);
    setShowNew(false);
    setNewSubject('');
    setNewDetails('');
    Alert.alert('Success', 'Support ticket created successfully!');
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
        <Text style={styles.headerTitle}>Help & Support</Text>
        <TouchableOpacity style={styles.createButton} onPress={handleCreateTicket}>
          <Plus size={20} color="#1a73e8" />
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionButton} onPress={handleCallSupport}>
            <Phone size={24} color="#1a73e8" />
            <Text style={styles.quickActionText}>Call Us</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton} onPress={handleEmailSupport}>
            <Mail size={24} color="#10b981" />
            <Text style={styles.quickActionText}>Email Us</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton} onPress={handleCreateTicket}>
            <MessageCircle size={24} color="#f59e0b" />
            <Text style={styles.quickActionText}>New Ticket</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tickets..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.categoryTabs}>
            {supportCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryTab,
                  selectedCategory === category.id && styles.activeCategoryTab
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <category.icon size={16} color={selectedCategory === category.id ? '#fff' : category.color} />
                <Text style={[
                  styles.categoryTabText,
                  selectedCategory === category.id && styles.activeCategoryTabText
                ]}>
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Support Tickets */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Support Tickets</Text>
        {filteredTickets.length === 0 ? (
          <View style={styles.emptyState}>
            <HelpCircle size={48} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No tickets found</Text>
            <Text style={styles.emptyStateSubtitle}>
              {searchQuery ? 'Try adjusting your search' : 'Create your first support ticket'}
            </Text>
          </View>
        ) : (
          filteredTickets.map((ticket) => {
            const StatusIcon = getStatusIcon(ticket.status);
            return (
              <View key={ticket.id} style={styles.ticketCard}>
                <TouchableOpacity onPress={() => toggleTicketExpansion(ticket.id)}>
                  <View style={styles.ticketHeader}>
                    <View style={styles.ticketInfo}>
                      <Text style={styles.ticketSubject}>{ticket.subject}</Text>
                      <Text style={styles.ticketDate}>Created {ticket.createdAt}</Text>
                    </View>
                    <View style={styles.ticketStatus}>
                      <StatusIcon size={16} color={getStatusColor(ticket.status)} />
                      <Text style={[styles.statusText, { color: getStatusColor(ticket.status) }]}>
                        {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {expandedTicket === ticket.id && (
                  <View style={styles.ticketDetails}>
                    <Text style={styles.ticketDescription}>{ticket.description}</Text>
                    
                    {ticket.response && (
                      <View style={styles.responseSection}>
                        <Text style={styles.responseLabel}>Our Response:</Text>
                        <Text style={styles.responseText}>{ticket.response}</Text>
                      </View>
                    )}
                    
                    {ticket.rating && (
                      <View style={styles.ratingSection}>
                        <Text style={styles.ratingLabel}>Your Rating:</Text>
                        {renderStars(ticket.rating)}
                      </View>
                    )}
                    
                    <View style={styles.ticketActions}>
                      <TouchableOpacity style={styles.actionButton}>
                        <Text style={styles.actionText}>Reply</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionButton}>
                        <Text style={styles.actionText}>Close Ticket</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>

      {/* FAQ Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        {faqItems.map((item) => (
          <View key={item.id} style={styles.faqItem}>
            <Text style={styles.faqQuestion}>{item.question}</Text>
            <Text style={styles.faqAnswer}>{item.answer}</Text>
          </View>
        ))}
      </View>

      {/* Contact Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <View style={styles.contactInfo}>
          <View style={styles.contactItem}>
            <Phone size={20} color="#1a73e8" />
            <View style={styles.contactDetails}>
              <Text style={styles.contactLabel}>24/7 Helpline</Text>
              <Text style={styles.contactValue}>1-800-URWAY-HELP</Text>
            </View>
          </View>
          <View style={styles.contactItem}>
            <Mail size={20} color="#10b981" />
            <View style={styles.contactDetails}>
              <Text style={styles.contactLabel}>Email Support</Text>
              <Text style={styles.contactValue}>support@urwaydispatch.com</Text>
            </View>
          </View>
          <View style={styles.contactItem}>
            <MessageCircle size={20} color="#f59e0b" />
            <View style={styles.contactDetails}>
              <Text style={styles.contactLabel}>Live Chat</Text>
              <Text style={styles.contactValue}>Available 9 AM - 9 PM CST</Text>
            </View>
          </View>
        </View>
      </View>

      {/* New Ticket Modal */}
      <Modal visible={showNew} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New Support Issue</Text>

            <Text style={styles.label}>Category</Text>
            <View style={styles.typeRow}>
              {supportCategories.slice(1).map(cat => (
                <TouchableOpacity key={cat.id}
                  style={[styles.typeBtn, newType === cat.label && styles.typeBtnActive]}
                  onPress={() => setNewType(cat.label)}>
                  <Text style={[styles.typeText, newType === cat.label && styles.typeTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Subject</Text>
            <TextInput 
              style={styles.input} 
              value={newSubject} 
              onChangeText={setNewSubject}
              placeholder="Brief description" 
              placeholderTextColor="#666" 
            />

            <Text style={styles.label}>Details</Text>
            <TextInput 
              style={[styles.input, styles.textArea]} 
              value={newDetails} 
              onChangeText={setNewDetails}
              placeholder="Provide more context..." 
              placeholderTextColor="#666"
              multiline 
              numberOfLines={4} 
              textAlignVertical="top" 
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowNew(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={submitIssue}>
                <Text style={styles.submitText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  createButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionsSection: {
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
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
  categoryTabs: {
    flexDirection: 'row',
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activeCategoryTab: {
    backgroundColor: '#1a73e8',
  },
  categoryTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginLeft: 4,
  },
  activeCategoryTabText: {
    color: '#fff',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  ticketCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  ticketInfo: {
    flex: 1,
  },
  ticketSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  ticketDate: {
    fontSize: 14,
    color: '#666',
  },
  ticketStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  ticketDetails: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  ticketDescription: {
    fontSize: 14,
    color: '#1a1a1a',
    marginBottom: 12,
  },
  responseSection: {
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  responseLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 4,
  },
  responseText: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginRight: 8,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  ticketActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  faqItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  contactInfo: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  contactDetails: {
    marginLeft: 12,
    flex: 1,
  },
  contactLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 14,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  label: {
    color: '#666',
    fontSize: 13,
    marginBottom: 6,
    marginTop: 12,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeBtn: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  typeBtnActive: {
    backgroundColor: '#1a73e8',
  },
  typeText: {
    color: '#666',
    fontSize: 12,
  },
  typeTextActive: {
    color: '#fff',
  },
  input: {
    backgroundColor: '#f3f4f6',
    color: '#1a1a1a',
    padding: 12,
    borderRadius: 10,
    fontSize: 15,
  },
  textArea: {
    minHeight: 80,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cancelText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '600',
  },
  submitBtn: {
    flex: 1,
    backgroundColor: '#1a73e8',
    padding: 14,
    alignItems: 'center',
    borderRadius: 10,
  },
  submitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
