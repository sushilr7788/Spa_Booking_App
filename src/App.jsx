import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { useAuth } from './context/AuthContext';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

const CalendarBoard = lazy(() =>
  import('./components/calendar/CalendarBoard').then((module) => ({
    default: module.CalendarBoard,
  }))
);
const ClientsPage = lazy(() =>
  import('./pages/Clients').then((module) => ({
    default: module.ClientsPage,
  }))
);

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }>
            <Route
              index
              element={
                <Suspense fallback={<div className="calendar-loading">Loading schedule...</div>}>
                  <CalendarBoard />
                </Suspense>
              }
            />
            <Route
              path="clients"
              element={
                <Suspense fallback={<div className="calendar-loading">Loading clients...</div>}>
                  <ClientsPage />
                </Suspense>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
