import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './services/auth';

// Layouts
import MainLayout from './components/layouts/MainLayout';
import AdminLayout from './components/layouts/AdminLayout';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import ProductsPage from './pages/ProductsPage';
import GoogleAuthSuccessPage from './pages/GoogleAuthSuccessPage';

// Admin Pages
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminLogsPage from './pages/admin/AdminLogsPage';
import AdminDashboard from './pages/admin/AdminDashboard';

// Protected Route Component
const ProtectedRoute = ({ children, requireAdmin = false }: { children: React.ReactNode; requireAdmin?: boolean }) => {
  const { user, loading } = useAuth();

  console.log('🛡️ [PROTECTED] Route check:', {
    loading,
    hasUser: !!user,
    userRole: user?.role,
    requireAdmin,
    path: window.location.pathname
  });

  if (loading) {
    console.log('⏳ [PROTECTED] Still loading, showing spinner...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    console.log('🚫 [PROTECTED] No user, redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user.role !== 'admin' && user.role !== 'staff') {
    console.log('🚫 [PROTECTED] User not admin/staff, redirecting to /');
    return <Navigate to="/" replace />;
  }

  console.log('✅ [PROTECTED] Access granted');
  return <>{children}</>;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="login" element={user ? <Navigate to="/profile" /> : <LoginPage />} />
        <Route path="register" element={user ? <Navigate to="/profile" /> : <RegisterPage />} />
        <Route path="auth/google/success" element={<GoogleAuthSuccessPage />} />
      </Route>

      {/* Protected User Routes */}
      <Route path="/" element={<MainLayout />}>
        <Route
          path="profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requireAdmin>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="logs" element={<AdminLogsPage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;

