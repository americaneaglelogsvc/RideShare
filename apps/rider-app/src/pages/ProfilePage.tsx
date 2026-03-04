import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, User, Mail, Phone, MapPin, CreditCard, Shield, Save } from 'lucide-react';

export function ProfilePage() {
  const [profile, setProfile] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1-312-555-0199',
    address: '456 N State St, Chicago, IL 60654',
  });
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center">
          <Link to="/" className="text-gray-600 hover:text-gray-900 mr-4">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {saved && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-800 text-sm font-medium">
            Profile updated successfully!
          </div>
        )}

        {/* Avatar & Name */}
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">{profile.firstName} {profile.lastName}</h2>
          <p className="text-sm text-gray-500">Rider since Jan 2026</p>
        </div>

        {/* Personal Info */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
            <button
              onClick={() => editing ? handleSave() : setEditing(true)}
              className="flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {editing ? <><Save className="w-4 h-4 mr-1" /> Save</> : 'Edit'}
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">First Name</label>
                <input
                  type="text"
                  value={profile.firstName}
                  onChange={e => setProfile({ ...profile, firstName: e.target.value })}
                  disabled={!editing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Last Name</label>
                <input
                  type="text"
                  value={profile.lastName}
                  onChange={e => setProfile({ ...profile, lastName: e.target.value })}
                  disabled={!editing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-700"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1"><Mail className="w-3 h-3 inline mr-1" />Email</label>
              <input
                type="email"
                value={profile.email}
                onChange={e => setProfile({ ...profile, email: e.target.value })}
                disabled={!editing}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1"><Phone className="w-3 h-3 inline mr-1" />Phone</label>
              <input
                type="tel"
                value={profile.phone}
                onChange={e => setProfile({ ...profile, phone: e.target.value })}
                disabled={!editing}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1"><MapPin className="w-3 h-3 inline mr-1" />Home Address</label>
              <input
                type="text"
                value={profile.address}
                onChange={e => setProfile({ ...profile, address: e.target.value })}
                disabled={!editing}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-700"
              />
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h3>
          <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center">
              <CreditCard className="w-5 h-5 text-blue-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">Visa •••• 4242</p>
                <p className="text-xs text-gray-500">Expires 12/27</p>
              </div>
            </div>
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Default</span>
          </div>
          <button className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">+ Add payment method</button>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Account</h3>
          <div className="space-y-3">
            <Link to="/consent" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
              <div className="flex items-center">
                <Shield className="w-5 h-5 text-gray-500 mr-3" />
                <span className="text-sm text-gray-700">Privacy & Consent</span>
              </div>
              <span className="text-gray-400">→</span>
            </Link>
            <Link to="/support" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
              <div className="flex items-center">
                <Phone className="w-5 h-5 text-gray-500 mr-3" />
                <span className="text-sm text-gray-700">Support & Disputes</span>
              </div>
              <span className="text-gray-400">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
