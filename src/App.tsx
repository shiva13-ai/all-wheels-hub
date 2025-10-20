import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Index';
import Store from './pages/Store';
import Profile from './pages/Profile';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from './components/ui/toaster';
import Auth from './pages/Auth';
import FindMechanics from './pages/FindMechanics';
import Tracking from './pages/Tracking';
import ChatPage from './pages/Chat';
import MechanicDashboard from './pages/MechanicDashboard';
import NotFound from './pages/NotFound';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import ServiceHistory from './pages/ServiceHistory';
import MechanicStore from './pages/MechanicStore';
import OrderHistory from './pages/OrderHistory';


// A private route wrapper component
const ProtectedRoute = ({ children, roles }: { children: JSX.Element, roles?: ('user' | 'mechanic' | 'admin')[] }) => {
  const { user, profile, loading } = useAuth();
  
  if (loading) {
    // Optionally return a loading spinner or null while auth is loading
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (roles && profile && !roles.includes(profile.role)) {
    return <Navigate to="/" replace />; // Redirect if role is not authorized
  }

  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/store" element={<Store />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/find-mechanics" element={<FindMechanics />} />
      <Route path="/emergency" element={<Home />} /> 
      <Route path="/cart" element={<Cart />} />

      {/* Protected Routes */}
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/tracking/:bookingId" element={<ProtectedRoute><Tracking /></ProtectedRoute>} />
      <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
      <Route path="/chat/:bookingId" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><ServiceHistory /></ProtectedRoute>} />
      <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
      <Route path="/orders" element={<ProtectedRoute><OrderHistory /></ProtectedRoute>} />
      
      {/* Mechanic Only Routes */}
      <Route path="/mechanic-dashboard" element={<ProtectedRoute roles={['mechanic', 'admin']}><MechanicDashboard /></ProtectedRoute>} />
      <Route path="/mechanic-store" element={<ProtectedRoute roles={['mechanic', 'admin']}><MechanicStore /></ProtectedRoute>} />

      {/* Fallback route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  );
}

