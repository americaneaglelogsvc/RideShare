import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, FileText, Eye, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

interface ConsentItem {
  id: string;
  title: string;
  description: string;
  granted: boolean;
  required: boolean;
  grantedAt?: string;
}

const mockConsents: ConsentItem[] = [
  { id: 'tos', title: 'Terms of Service', description: 'Agreement to abide by platform terms and conditions.', granted: true, required: true, grantedAt: '2026-01-15' },
  { id: 'privacy', title: 'Privacy Policy', description: 'Consent to data collection, processing, and storage as described in our privacy policy.', granted: true, required: true, grantedAt: '2026-01-15' },
  { id: 'location', title: 'Location Data', description: 'Allow the app to collect your location during active trips for dispatch, safety, and billing.', granted: true, required: true, grantedAt: '2026-01-15' },
  { id: 'marketing', title: 'Marketing Communications', description: 'Receive promotional offers, discounts, and service updates via email and SMS.', granted: false, required: false },
  { id: 'analytics', title: 'Analytics & Improvement', description: 'Allow anonymized trip data to be used for service improvement and research.', granted: true, required: false, grantedAt: '2026-01-15' },
  { id: 'third_party', title: 'Third-Party Data Sharing', description: 'Share data with trusted partners for insurance verification and safety programs.', granted: false, required: false },
];

export function ConsentPage() {
  const [consents, setConsents] = useState<ConsentItem[]>(mockConsents);
  const [dsarSubmitted, setDsarSubmitted] = useState(false);

  const toggleConsent = (id: string) => {
    setConsents(prev => prev.map(c => {
      if (c.id === id && !c.required) {
        return { ...c, granted: !c.granted, grantedAt: !c.granted ? new Date().toISOString().split('T')[0] : undefined };
      }
      return c;
    }));
  };

  const handleDsar = (type: 'export' | 'delete') => {
    setDsarSubmitted(true);
    setTimeout(() => setDsarSubmitted(false), 4000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center">
          <Link to="/profile" className="text-gray-600 hover:text-gray-900 mr-4"><ArrowLeft className="w-5 h-5" /></Link>
          <Shield className="w-6 h-6 text-blue-600 mr-2" />
          <h1 className="text-xl font-bold text-gray-900">Privacy & Consent</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
        {dsarSubmitted && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 font-medium">
            Your data request has been submitted. You'll receive a response within 30 days per CCPA/GDPR requirements.
          </div>
        )}

        {/* Consent Management */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Consent Preferences</h3>
          <div className="space-y-4">
            {consents.map(c => (
              <div key={c.id} className="flex items-start justify-between p-3 rounded-lg bg-gray-50">
                <div className="flex-1 mr-4">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900">{c.title}</p>
                    {c.required && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Required</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{c.description}</p>
                  {c.grantedAt && <p className="text-xs text-gray-400 mt-1">Granted: {c.grantedAt}</p>}
                </div>
                <button
                  onClick={() => toggleConsent(c.id)}
                  disabled={c.required}
                  aria-label={`Toggle ${c.title} consent`}
                  className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${
                    c.granted ? 'bg-green-500' : 'bg-gray-300'
                  } ${c.required ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${c.granted ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Legal Documents */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Legal Documents</h3>
          <div className="space-y-3">
            <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
              <div className="flex items-center"><FileText className="w-5 h-5 text-gray-500 mr-3" /><span className="text-sm text-gray-700">Terms of Service</span></div>
              <span className="text-gray-400">→</span>
            </a>
            <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
              <div className="flex items-center"><FileText className="w-5 h-5 text-gray-500 mr-3" /><span className="text-sm text-gray-700">Privacy Policy</span></div>
              <span className="text-gray-400">→</span>
            </a>
          </div>
        </div>

        {/* DSAR — Data Subject Access Requests */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Your Data Rights</h3>
          <p className="text-xs text-gray-500 mb-4">Under GDPR and CCPA, you have the right to access, export, or delete your personal data.</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => handleDsar('export')} className="flex items-center justify-center p-3 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-medium">
              <Eye className="w-4 h-4 mr-2" /> Export My Data
            </button>
            <button onClick={() => handleDsar('delete')} className="flex items-center justify-center p-3 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium">
              <Trash2 className="w-4 h-4 mr-2" /> Delete My Data
            </button>
          </div>
          <div className="flex items-start mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-yellow-600 mr-2 mt-0.5 shrink-0" />
            <p className="text-xs text-yellow-800">Data deletion is permanent and will remove your account, ride history, and payment information. This cannot be undone.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
