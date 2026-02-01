import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../pages/Login';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, token } = useAuth();
  const location = useLocation();

  if (!token || !user) {
    // Redirect to login page, but save the location they were trying to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has required role (if specified)
  if (requiredRole && !requiredRole.includes(user.role)) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p>You don't have permission to access this page.</p>
        <p>Required role: {requiredRole.join(' or ')}</p>
        <p>Your role: {user.role}</p>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
