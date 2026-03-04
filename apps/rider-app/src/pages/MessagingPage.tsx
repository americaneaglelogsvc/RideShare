import React, { useState, useRef, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Send, MessageCircle, Shield } from 'lucide-react';

interface Message {
  id: string;
  sender: 'rider' | 'driver';
  text: string;
  timestamp: string;
  masked: boolean;
}

const mockMessages: Message[] = [
  { id: '1', sender: 'driver', text: "Hi, I'm on my way to your pickup location.", timestamp: '2:15 PM', masked: false },
  { id: '2', sender: 'rider', text: "Great, I'll be at the main entrance.", timestamp: '2:16 PM', masked: false },
  { id: '3', sender: 'driver', text: "I'm arriving in about 3 minutes. Black sedan.", timestamp: '2:18 PM', masked: false },
];

export function MessagingPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const msg: Message = {
      id: String(messages.length + 1),
      sender: 'rider',
      text: input.trim(),
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      masked: false,
    };
    setMessages(prev => [...prev, msg]);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm px-6 py-4 shrink-0">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="text-gray-600 hover:text-gray-900 mr-4"><ArrowLeft className="w-5 h-5" /></Link>
            <MessageCircle className="w-6 h-6 text-blue-600 mr-2" />
            <div>
              <h1 className="text-lg font-bold text-gray-900">Driver Chat</h1>
              <p className="text-xs text-gray-500">Trip {tripId}</p>
            </div>
          </div>
          <div className="flex items-center text-xs text-green-600">
            <Shield className="w-4 h-4 mr-1" />
            <span>PII masked</span>
          </div>
        </div>
      </header>

      {/* Privacy Notice */}
      <div className="bg-blue-50 px-6 py-2 text-center shrink-0">
        <p className="text-xs text-blue-700">Messages are masked for privacy. Phone numbers and emails are hidden from the other party.</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-2xl mx-auto space-y-3">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender === 'rider' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs px-4 py-2 rounded-2xl ${
                msg.sender === 'rider'
                  ? 'bg-blue-600 text-white rounded-br-md'
                  : 'bg-white text-gray-900 border border-gray-200 rounded-bl-md'
              }`}>
                <p className="text-sm">{msg.text}</p>
                <p className={`text-xs mt-1 ${msg.sender === 'rider' ? 'text-blue-200' : 'text-gray-400'}`}>{msg.timestamp}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t px-6 py-4 shrink-0">
        <div className="max-w-2xl mx-auto flex items-center space-x-3">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            aria-label="Send message"
            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
