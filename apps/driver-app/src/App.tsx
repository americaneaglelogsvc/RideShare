import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './components/AuthProvider';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardPage } from './pages/DashboardPage';
import { TripPage } from './pages/TripPage';
import { ProfilePage } from './pages/ProfilePage';
import { EarningsPage } from './pages/EarningsPage';
import { AirportQueuePage } from './pages/AirportQueuePage';
import { ScheduledRidesPage } from './pages/ScheduledRidesPage';
import { AuthPage } from './pages/AuthPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { FleetOwnerPage } from './pages/FleetOwnerPage';
import { MessagingPage } from './pages/MessagingPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/" element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } />
            <Route path="/trip" element={
              <ProtectedRoute>
                <TripPage />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } />
            <Route path="/earnings" element={
              <ProtectedRoute>
                <EarningsPage />
              </ProtectedRoute>
            } />
            <Route path="/scheduled-rides" element={
              <ProtectedRoute>
                <ScheduledRidesPage />
              </ProtectedRoute>
            } />
            <Route path="/airport-queue" element={
              <ProtectedRoute>
                <AirportQueuePage />
              </ProtectedRoute>
            } />
            <Route path="/fleet" element={
              <ProtectedRoute>
                <FleetOwnerPage />
              </ProtectedRoute>
            } />
            <Route path="/messages" element={
              <ProtectedRoute>
                <MessagingPage />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;