import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, HelpCircle, AlertTriangle, Clock, CheckCircle, Send, ChevronDown, ChevronUp } from 'lucide-react';

interface Dispute {
  id: string;
  tripId: string;
  type: string;
  description: string;
  status: 'open' | 'in_review' | 'resolved';
  createdAt: string;
  resolution?: string;
}

const mockDisputes: Dispute[] = [
  { id: 'disp_001', tripId: 'trip_901', type: 'fare_dispute', description: 'Charged for tolls that were not on the route', status: 'resolved', createdAt: '2026-02-28', resolution: 'Refund of $4.50 processed to your card ending in 4242.' },
  { id: 'disp_002', tripId: 'trip_903', type: 'driver_behavior', description: 'Driver was on the phone during the ride', status: 'in_review', createdAt: '2026-03-01' },
];

export function SupportPage() {
  const [disputes] = useState<Dispute[]>(mockDisputes);
  const [showForm, setShowForm] = useState(false);
  const [newType, setNewType] = useState('fare_dispute');
  const [newTripId, setNewTripId] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!newTripId || !newDesc) return;
    setSubmitted(true);
    setShowForm(false);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'open': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'in_review': return <AlertTriangle className="w-4 h-4 text-blue-600" />;
      case 'resolved': return <CheckCircle className="w-4 h-4 text-green-600" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="text-gray-600 hover:text-gray-900 mr-4"><ArrowLeft className="w-5 h-5" /></Link>
            <HelpCircle className="w-6 h-6 text-blue-600 mr-2" />
            <h1 className="text-xl font-bold text-gray-900">Support & Disputes</h1>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="text-sm text-blue-600 font-medium hover:text-blue-700">
            {showForm ? 'Cancel' : '+ New Issue'}
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-6">
        {submitted && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm text-green-800 font-medium">
            Your support request has been submitted. We'll review it within 24 hours.
          </div>
        )}

        {/* New Dispute Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Report an Issue</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="support-type" className="block text-sm font-medium text-gray-700 mb-1">Issue Type</label>
                <select id="support-type" value={newType} onChange={e => setNewType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                  <option value="fare_dispute">Fare Dispute</option>
                  <option value="driver_behavior">Driver Behavior</option>
                  <option value="safety_incident">Safety Incident</option>
                  <option value="lost_item">Lost Item</option>
                  <option value="cancellation">Cancellation Issue</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="support-trip" className="block text-sm font-medium text-gray-700 mb-1">Trip ID</label>
                <input id="support-trip" type="text" value={newTripId} onChange={e => setNewTripId(e.target.value)} placeholder="e.g. trip_901" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div>
                <label htmlFor="support-desc" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea id="support-desc" value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3} placeholder="Describe the issue..." className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <button onClick={handleSubmit} disabled={!newTripId || !newDesc} className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm disabled:bg-gray-400 flex items-center justify-center">
                <Send className="w-4 h-4 mr-2" /> Submit
              </button>
            </div>
          </div>
        )}

        {/* Existing Disputes */}
        <h3 className="font-semibold text-gray-900 mb-3">Your Issues</h3>
        {disputes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <HelpCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No issues reported</p>
          </div>
        ) : (
          <div className="space-y-3">
            {disputes.map(d => (
              <div key={d.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <button onClick={() => setExpanded(expanded === d.id ? null : d.id)} className="w-full p-4 flex items-center justify-between text-left">
                  <div className="flex items-center space-x-3">
                    {statusIcon(d.status)}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{d.type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
                      <p className="text-xs text-gray-500">Trip {d.tripId} · {d.createdAt}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      d.status === 'resolved' ? 'bg-green-100 text-green-800' :
                      d.status === 'in_review' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>{d.status.replace('_', ' ')}</span>
                    {expanded === d.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>
                {expanded === d.id && (
                  <div className="px-4 pb-4 border-t">
                    <p className="text-sm text-gray-700 mt-3">{d.description}</p>
                    {d.resolution && (
                      <div className="mt-3 bg-green-50 border border-green-200 rounded p-3">
                        <p className="text-xs font-medium text-green-800">Resolution</p>
                        <p className="text-sm text-green-700 mt-1">{d.resolution}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
