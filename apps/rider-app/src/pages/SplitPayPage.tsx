import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Users, DollarSign, Plus, X, Check, Percent } from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  phone: string;
  share: number;
  status: 'pending' | 'accepted' | 'declined';
}

export function SplitPayPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const [mode, setMode] = useState<'equal' | 'percentage' | 'custom'>('equal');
  const [participants, setParticipants] = useState<Participant[]>([
    { id: '1', name: 'You', phone: '', share: 0, status: 'accepted' },
  ]);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const totalFare = 4500; // $45.00

  const addParticipant = () => {
    if (!newName) return;
    setParticipants(prev => [...prev, {
      id: String(prev.length + 1),
      name: newName,
      phone: newPhone,
      share: 0,
      status: 'pending',
    }]);
    setNewName('');
    setNewPhone('');
  };

  const removeParticipant = (id: string) => {
    if (id === '1') return;
    setParticipants(prev => prev.filter(p => p.id !== id));
  };

  const getShares = () => {
    const count = participants.length;
    if (mode === 'equal') {
      const each = Math.floor(totalFare / count);
      const remainder = totalFare - each * count;
      return participants.map((p, i) => ({ ...p, share: each + (i === 0 ? remainder : 0) }));
    }
    return participants;
  };

  const shares = getShares();

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="bg-white rounded-lg shadow-md p-8 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Split Pay Sent!</h2>
          <p className="text-gray-600 mb-4">Payment requests sent to {participants.length - 1} participant{participants.length > 2 ? 's' : ''}.</p>
          <div className="space-y-2 mb-6">
            {shares.map(p => (
              <div key={p.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{p.name}</span>
                <span className="font-medium">${(p.share / 100).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <Link to="/" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center">
          <Link to="/" className="text-gray-600 hover:text-gray-900 mr-4"><ArrowLeft className="w-5 h-5" /></Link>
          <Users className="w-6 h-6 text-blue-600 mr-2" />
          <h1 className="text-xl font-bold text-gray-900">Split Fare</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500">Trip {tripId}</span>
            <span className="text-xl font-bold text-gray-900"><DollarSign className="w-5 h-5 inline" />{(totalFare / 100).toFixed(2)}</span>
          </div>

          {/* Split Mode */}
          <div className="flex space-x-2 mb-6">
            {(['equal', 'percentage', 'custom'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize ${mode === m ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {m === 'percentage' && <Percent className="w-3 h-3 inline mr-1" />}
                {m}
              </button>
            ))}
          </div>

          {/* Participants */}
          <div className="space-y-3 mb-6">
            {shares.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${p.status === 'accepted' ? 'bg-green-100' : 'bg-gray-200'}`}>
                    {p.status === 'accepted' ? <Check className="w-4 h-4 text-green-600" /> : <Users className="w-4 h-4 text-gray-500" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.name}</p>
                    {p.phone && <p className="text-xs text-gray-500">{p.phone}</p>}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-gray-900">${(p.share / 100).toFixed(2)}</span>
                  {p.id !== '1' && (
                    <button onClick={() => removeParticipant(p.id)} aria-label={`Remove ${p.name}`} className="text-red-400 hover:text-red-600">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add Participant */}
          <div className="border border-dashed border-gray-300 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Add participant</p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Name" className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              <input type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="Phone" className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <button onClick={addParticipant} disabled={!newName} className="w-full py-2 border border-blue-300 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 disabled:opacity-50 flex items-center justify-center">
              <Plus className="w-4 h-4 mr-1" /> Add
            </button>
          </div>
        </div>

        <button
          onClick={() => setSubmitted(true)}
          disabled={participants.length < 2}
          className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Send Split Pay Request
        </button>
      </div>
    </div>
  );
}
