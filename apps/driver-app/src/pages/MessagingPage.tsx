import React, { useState, useEffect, useRef } from 'react';
import { Send, Shield, Clock, ArrowLeft, User } from 'lucide-react';

interface Message {
    id: string;
    sender: 'driver' | 'rider' | 'system';
    text: string;
    timestamp: Date;
    masked: boolean;
}

interface Conversation {
    id: string;
    tripId: string;
    riderName: string;
    riderInitials: string;
    lastMessage: string;
    lastMessageTime: Date;
    unreadCount: number;
    status: 'active' | 'completed';
}

export function MessagingPage() {
    const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Mock conversations
    const [conversations] = useState<Conversation[]>([
        {
            id: 'c1',
            tripId: 'TRIP-20260303-001',
            riderName: 'A. Smith',
            riderInitials: 'AS',
            lastMessage: 'I\'m at the north entrance',
            lastMessageTime: new Date(Date.now() - 120000),
            unreadCount: 1,
            status: 'active',
        },
        {
            id: 'c2',
            tripId: 'TRIP-20260303-002',
            riderName: 'M. Johnson',
            riderInitials: 'MJ',
            lastMessage: 'Thank you for the ride!',
            lastMessageTime: new Date(Date.now() - 3600000),
            unreadCount: 0,
            status: 'completed',
        },
        {
            id: 'c3',
            tripId: 'TRIP-20260302-015',
            riderName: 'J. Davis',
            riderInitials: 'JD',
            lastMessage: '*** PII masked — retention window passed ***',
            lastMessageTime: new Date(Date.now() - 86400000),
            unreadCount: 0,
            status: 'completed',
        },
    ]);

    // Mock messages for selected conversation
    const [messages, setMessages] = useState<Record<string, Message[]>>({
        c1: [
            { id: 'm1', sender: 'system', text: 'Trip TRIP-20260303-001 assigned. In-trip messaging enabled.', timestamp: new Date(Date.now() - 600000), masked: false },
            { id: 'm2', sender: 'rider', text: 'Hi, I\'m wearing a blue jacket', timestamp: new Date(Date.now() - 300000), masked: false },
            { id: 'm3', sender: 'driver', text: 'Got it! I\'m in a black Lincoln Continental, plate IL-12345', timestamp: new Date(Date.now() - 240000), masked: false },
            { id: 'm4', sender: 'rider', text: 'I\'m at the north entrance', timestamp: new Date(Date.now() - 120000), masked: false },
        ],
        c2: [
            { id: 'm5', sender: 'system', text: 'Trip TRIP-20260303-002 assigned. In-trip messaging enabled.', timestamp: new Date(Date.now() - 7200000), masked: false },
            { id: 'm6', sender: 'rider', text: 'Can you arrive at the side door?', timestamp: new Date(Date.now() - 5400000), masked: false },
            { id: 'm7', sender: 'driver', text: 'Absolutely, headed there now', timestamp: new Date(Date.now() - 5100000), masked: false },
            { id: 'm8', sender: 'rider', text: 'Thank you for the ride!', timestamp: new Date(Date.now() - 3600000), masked: false },
        ],
        c3: [
            { id: 'm9', sender: 'system', text: 'Trip TRIP-20260302-015 — messages masked per retention policy (72h).', timestamp: new Date(Date.now() - 86400000), masked: true },
            { id: 'm10', sender: 'rider', text: '*** PII masked — retention window passed ***', timestamp: new Date(Date.now() - 86400000), masked: true },
            { id: 'm11', sender: 'driver', text: '*** PII masked — retention window passed ***', timestamp: new Date(Date.now() - 86400000), masked: true },
        ],
    });

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [selectedConversation, messages]);

    const handleSend = () => {
        if (!newMessage.trim() || !selectedConversation) return;

        const conv = conversations.find(c => c.id === selectedConversation);
        if (conv?.status === 'completed') return;

        const msg: Message = {
            id: `m${Date.now()}`,
            sender: 'driver',
            text: newMessage,
            timestamp: new Date(),
            masked: false,
        };

        setMessages(prev => ({
            ...prev,
            [selectedConversation]: [...(prev[selectedConversation] || []), msg],
        }));
        setNewMessage('');
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatRelativeTime = (date: Date) => {
        const diff = Date.now() - date.getTime();
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    };

    const currentConversation = conversations.find(c => c.id === selectedConversation);
    const currentMessages = selectedConversation ? messages[selectedConversation] || [] : [];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm px-6 py-4">
                <div className="flex items-center gap-4">
                    {selectedConversation && (
                        <button
                            onClick={() => setSelectedConversation(null)}
                            className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    )}
                    <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
                    <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
                        <Shield className="w-4 h-4 text-green-600" />
                        <span>PII-masked · 72h retention</span>
                    </div>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-6 py-6">
                <div className="bg-white rounded-lg shadow-md overflow-hidden" style={{ height: 'calc(100vh - 160px)' }}>
                    <div className="flex h-full">
                        {/* Conversation List */}
                        <div className={`w-full md:w-80 border-r border-gray-200 overflow-y-auto ${selectedConversation ? 'hidden md:block' : ''
                            }`}>
                            {conversations.map(conv => (
                                <div
                                    key={conv.id}
                                    onClick={() => setSelectedConversation(conv.id)}
                                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${selectedConversation === conv.id ? 'bg-blue-50' : ''
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold ${conv.status === 'active' ? 'bg-blue-600' : 'bg-gray-400'
                                            }`}>
                                            {conv.riderInitials}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <p className="font-medium text-gray-900">{conv.riderName}</p>
                                                <span className="text-xs text-gray-500">{formatRelativeTime(conv.lastMessageTime)}</span>
                                            </div>
                                            <p className="text-sm text-gray-500 truncate">{conv.lastMessage}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">{conv.tripId}</p>
                                        </div>
                                        {conv.unreadCount > 0 && (
                                            <span className="w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                                                {conv.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Message Area */}
                        <div className={`flex-1 flex flex-col ${!selectedConversation ? 'hidden md:flex' : 'flex'
                            }`}>
                            {selectedConversation && currentConversation ? (
                                <>
                                    {/* Chat Header */}
                                    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ${currentConversation.status === 'active' ? 'bg-blue-600' : 'bg-gray-400'
                                                    }`}>
                                                    {currentConversation.riderInitials}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{currentConversation.riderName}</p>
                                                    <p className="text-xs text-gray-500">{currentConversation.tripId}</p>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${currentConversation.status === 'active'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                {currentConversation.status === 'active' ? 'Active Trip' : 'Completed'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Messages */}
                                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                        {currentMessages.map(msg => (
                                            <div
                                                key={msg.id}
                                                className={`flex ${msg.sender === 'driver' ? 'justify-end' : msg.sender === 'system' ? 'justify-center' : 'justify-start'}`}
                                            >
                                                {msg.sender === 'system' ? (
                                                    <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-500 max-w-md text-center">
                                                        {msg.text}
                                                    </div>
                                                ) : (
                                                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${msg.sender === 'driver'
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-gray-200 text-gray-900'
                                                        } ${msg.masked ? 'opacity-50 italic' : ''}`}>
                                                        <p className="text-sm">{msg.text}</p>
                                                        <div className={`flex items-center gap-1 mt-1 text-xs ${msg.sender === 'driver' ? 'text-blue-200' : 'text-gray-400'
                                                            }`}>
                                                            <Clock className="w-3 h-3" />
                                                            <span>{formatTime(msg.timestamp)}</span>
                                                            {msg.masked && <Shield className="w-3 h-3 ml-1" />}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    {/* Input */}
                                    <div className="p-4 border-t border-gray-200">
                                        {currentConversation.status === 'active' ? (
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="text"
                                                    value={newMessage}
                                                    onChange={(e) => setNewMessage(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                                    placeholder="Type a message..."
                                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                                <button
                                                    onClick={handleSend}
                                                    disabled={!newMessage.trim()}
                                                    className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <Send className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <p className="text-center text-sm text-gray-500">
                                                This conversation is closed. Trip has been completed.
                                            </p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-gray-400">
                                    <div className="text-center">
                                        <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p className="text-lg font-medium">Select a conversation</p>
                                        <p className="text-sm">Choose a trip conversation from the list</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
