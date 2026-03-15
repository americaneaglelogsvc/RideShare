import React, { useState, useEffect } from 'react';
import { User, Car, FileText, Settings, Edit, Camera, Phone, Mail, MapPin } from 'lucide-react';
import apiService from '../services/api.service';

export function ProfilePage() {
  const [activeTab, setActiveTab] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    dateOfBirth: '',
    rating: 0,
    totalTrips: 0,
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: 0,
    vehicleColor: '',
    licensePlate: '',
    vehicleCategory: 'sedan',
    driversLicenseExpiry: '',
    insuranceExpiry: '',
    registrationExpiry: '',
    backgroundCheckDate: '',
    airportPermits: [] as string[],
    preferredAreas: [] as string[],
    maxDistance: 25,
    autoAccept: false,
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profile = await apiService.getProfile();
      setProfileData(prev => ({
        ...prev,
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phone: profile.phone,
        address: profile.address || '',
        rating: profile.rating,
        totalTrips: profile.totalTrips,
        vehicleMake: profile.vehicle?.make || '',
        vehicleModel: profile.vehicle?.model || '',
        vehicleYear: profile.vehicle?.year || 0,
        vehicleColor: profile.vehicle?.color || '',
        licensePlate: profile.vehicle?.licensePlate || '',
        vehicleCategory: profile.vehicle?.category || 'sedan',
      }));
    } catch (err) {
      // Profile load failed — show empty form
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiService.updateProfile({
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        email: profileData.email,
        phone: profileData.phone,
      });
      setIsEditing(false);
    } catch (err) {
      // Save failed — keep editing mode
    } finally {
      setSaving(false);
    }
  };

  const renderPersonalInfo = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
        >
          <Edit className="w-4 h-4" />
          <span>{isEditing ? 'Cancel' : 'Edit'}</span>
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
          <input
            type="text"
            name="firstName"
            value={profileData.firstName}
            onChange={handleInputChange}
            disabled={!isEditing}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
          <input
            type="text"
            name="lastName"
            value={profileData.lastName}
            onChange={handleInputChange}
            disabled={!isEditing}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
          <div className="relative">
            <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
            <input
              type="email"
              name="email"
              value={profileData.email}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
          <div className="relative">
            <Phone className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
            <input
              type="tel"
              name="phone"
              value={profileData.phone}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
          <div className="relative">
            <MapPin className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              name="address"
              value={profileData.address}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      )}
    </div>
  );

  const renderVehicleInfo = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Vehicle Information</h3>
        <button className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg">
          <Camera className="w-4 h-4" />
          <span>Update Photos</span>
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Make</label>
          <input
            type="text"
            value={profileData.vehicleMake}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
          <input
            type="text"
            value={profileData.vehicleModel}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
          <input
            type="text"
            value={profileData.vehicleYear}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
          <input
            type="text"
            value={profileData.vehicleColor}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">License Plate</label>
          <input
            type="text"
            value={profileData.licensePlate}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
          <input
            type="text"
            value={profileData.vehicleCategory.replace('_', ' ').toUpperCase()}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
          />
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800 text-sm">
          <strong>Note:</strong> Vehicle information changes require admin approval. Contact support to update vehicle details.
        </p>
      </div>
    </div>
  );

  const renderDocuments = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Documents & Certifications</h3>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">Driver's License</h4>
            <span className="text-sm text-green-600">✓ Verified</span>
          </div>
          <p className="text-sm text-gray-600 mb-2">
            Expires: {new Date(profileData.driversLicenseExpiry).toLocaleDateString()}
          </p>
          <button className="text-blue-600 hover:text-blue-700 text-sm">
            Update Document
          </button>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">Insurance</h4>
            <span className="text-sm text-green-600">✓ Verified</span>
          </div>
          <p className="text-sm text-gray-600 mb-2">
            Expires: {new Date(profileData.insuranceExpiry).toLocaleDateString()}
          </p>
          <button className="text-blue-600 hover:text-blue-700 text-sm">
            Update Document
          </button>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">Vehicle Registration</h4>
            <span className="text-sm text-green-600">✓ Verified</span>
          </div>
          <p className="text-sm text-gray-600 mb-2">
            Expires: {new Date(profileData.registrationExpiry).toLocaleDateString()}
          </p>
          <button className="text-blue-600 hover:text-blue-700 text-sm">
            Update Document
          </button>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">Background Check</h4>
            <span className="text-sm text-green-600">✓ Passed</span>
          </div>
          <p className="text-sm text-gray-600 mb-2">
            Last Updated: {new Date(profileData.backgroundCheckDate).toLocaleDateString()}
          </p>
          <p className="text-sm text-gray-500">
            Renewed annually
          </p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Airport Permits</h4>
        <div className="flex space-x-2">
          {profileData.airportPermits.map((permit) => (
            <span
              key={permit}
              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              {permit}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Driver Preferences</h3>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Maximum Trip Distance (miles)
          </label>
          <input
            type="number"
            name="maxDistance"
            value={profileData.maxDistance}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="5"
            max="50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preferred Areas
          </label>
          <div className="flex flex-wrap gap-2">
            {profileData.preferredAreas.map((area) => (
              <span
                key={area}
                className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm"
              >
                {area}
              </span>
            ))}
          </div>
          <button className="mt-2 text-blue-600 hover:text-blue-700 text-sm">
            Edit Preferred Areas
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Auto-Accept Short Trips</h4>
            <p className="text-sm text-gray-600">
              Automatically accept trips under 5 miles
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={profileData.autoAccept}
              onChange={(e) => setProfileData({
                ...profileData,
                autoAccept: e.target.checked
              })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="border-t pt-6">
          <h4 className="font-medium text-gray-900 mb-4">Account Actions</h4>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              Download My Data
            </button>
            <button className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              Request Account Deactivation
            </button>
            <button className="w-full text-left px-4 py-3 border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'vehicle', label: 'Vehicle', icon: Car },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Driver Profile</h1>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="font-semibold text-gray-900">
                {profileData.firstName} {profileData.lastName}
              </p>
              <div className="flex items-center text-sm text-gray-600">
                <span className="text-yellow-500 mr-1">★</span>
                <span>{profileData.rating} • {profileData.totalTrips} trips</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-md p-8">
              {activeTab === 'personal' && renderPersonalInfo()}
              {activeTab === 'vehicle' && renderVehicleInfo()}
              {activeTab === 'documents' && renderDocuments()}
              {activeTab === 'settings' && renderSettings()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}