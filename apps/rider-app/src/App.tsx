import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { BookingPage } from './pages/BookingPage';
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/ProfilePage';
import { RideHistoryPage } from './pages/RideHistoryPage';
import { ScheduledBookingPage } from './pages/ScheduledBookingPage';
import { HourlyBookingPage } from './pages/HourlyBookingPage';
import { SplitPayPage } from './pages/SplitPayPage';
import { RatingsPage } from './pages/RatingsPage';
import { MessagingPage } from './pages/MessagingPage';
import { SupportPage } from './pages/SupportPage';
import { ConsentPage } from './pages/ConsentPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/book" element={<BookingPage />} />
          <Route path="/book/scheduled" element={<ScheduledBookingPage />} />
          <Route path="/book/hourly" element={<HourlyBookingPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/history" element={<RideHistoryPage />} />
          <Route path="/split-pay/:tripId" element={<SplitPayPage />} />
          <Route path="/rate/:tripId" element={<RatingsPage />} />
          <Route path="/messages/:tripId" element={<MessagingPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/consent" element={<ConsentPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
