import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from '@/pages/Index';
import Store from '@/pages/Store';
import Profile from '@/pages/Profile';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';

// A private route wrapper component
const ProtectedRoute = ({ children, roles }: { children: JSX.Element, roles?: ('customer' | 'mechanic')[] }) => {
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
      
      {/* Example of a route requiring authentication */}
      <Route path="/profile" element={
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      } />

      {/* Placeholder routes for other pages mentioned in Header */}
      <Route path="/auth" element={<div>Auth Page (Login/Signup)</div>} />
      <Route path="/find-mechanics" element={<div>Find Mechanics Page</div>} />
      <Route path="/emergency" element={<div>Emergency Page</div>} />
      <Route path="/chat" element={<ProtectedRoute><div>Chat Page</div></ProtectedRoute>} />
      <Route path="/mechanic-dashboard" element={<ProtectedRoute roles={['mechanic']}><div>Mechanic Dashboard Page</div></ProtectedRoute>} />

      {/* Fallback route */}
      <Route path="*" element={<div>404 Not Found</div>} />
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
