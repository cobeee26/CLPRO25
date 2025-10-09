import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'teacher' | 'student';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, loading } = useUser();
  const location = useLocation();
  const token = localStorage.getItem('authToken');

  // Show loading spinner while user data is being fetched
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user is authenticated
  if (!token || !user) {
    console.log('❌ No authentication token or user data found');
    return <Navigate to="/login" replace />;
  }

  // Strict role-based access control
  if (requiredRole && user.role !== requiredRole) {
    console.log(`🚫 ACCESS DENIED: User role '${user.role}' cannot access '${requiredRole}' route: ${location.pathname}`);
    
    // Force redirect to appropriate dashboard based on user's actual role
    switch (user.role) {
      case 'admin':
        console.log('🔄 Redirecting admin to /admin/dashboard');
        return <Navigate to="/admin/dashboard" replace />;
      case 'teacher':
        console.log('🔄 Redirecting teacher to /teacher/dashboard');
        return <Navigate to="/teacher/dashboard" replace />;
      case 'student':
        console.log('🔄 Redirecting student to /student/dashboard');
        return <Navigate to="/student/dashboard" replace />;
      default:
        console.log('🔄 Unknown role, redirecting to login');
        return <Navigate to="/login" replace />;
    }
  }

  // Additional security: Check if user is trying to access admin routes without admin role
  if (location.pathname.startsWith('/admin/') && user.role !== 'admin') {
    console.log(`🚫 BLOCKED: Non-admin user '${user.role}' attempted to access admin route: ${location.pathname}`);
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  }

  // Check if user is trying to access teacher routes without teacher role
  if (location.pathname.startsWith('/teacher/') && user.role !== 'teacher') {
    console.log(`🚫 BLOCKED: Non-teacher user '${user.role}' attempted to access teacher route: ${location.pathname}`);
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  }

  // Check if user is trying to access student routes without student role
  if (location.pathname.startsWith('/student/') && user.role !== 'student') {
    console.log(`🚫 BLOCKED: Non-student user '${user.role}' attempted to access student route: ${location.pathname}`);
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  }

  console.log(`✅ ACCESS GRANTED: User '${user.role}' accessing route: ${location.pathname}`);
  return <>{children}</>;
};

export default ProtectedRoute;
