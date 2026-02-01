# Authentication System Documentation

## Overview
Complete authentication and authorization system for AgriNursery ERP with JWT tokens, role-based access control, and audit logging.

## Features

### ✅ Implemented
- **User Authentication**
  - Login with username/password
  - Password hashing with bcrypt (10 rounds)
  - JWT token generation (24h expiry)
  - Session management with database storage
  - Last login tracking

- **User Management**
  - User registration (admin-only)
  - Profile viewing and updates
  - Password change with validation
  - User activation/deactivation
  - Role-based user listing

- **Authorization**
  - JWT token validation middleware
  - Role-based access control (admin, manager, user, viewer)
  - Protected route enforcement
  - Optional authentication for public endpoints

- **Security**
  - Password strength validation (min 8 characters)
  - Password hash verification
  - Token expiration handling
  - Session invalidation on password change
  - Audit logging for sensitive operations

- **Audit & Compliance**
  - User action logging (create, update, delete, password changes)
  - IP address tracking
  - Request details capture
  - Automatic audit trail

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    phone VARCHAR(15),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Sessions Table
```sql
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Audit Logs Table
```sql
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    resource VARCHAR(100),
    resource_id INTEGER,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### Public Endpoints

#### POST /api/auth/login
Login with username and password.

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@agrinursery.com",
      "full_name": "System Administrator",
      "role": "admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2024-01-02T10:00:00.000Z"
  }
}
```

### Protected Endpoints (Require Authentication)

#### POST /api/auth/logout
Logout and invalidate current session.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### GET /api/auth/profile
Get current user profile.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "admin",
    "email": "admin@agrinursery.com",
    "full_name": "System Administrator",
    "role": "admin",
    "phone": "+91-1234567890",
    "last_login": "2024-01-01T10:00:00.000Z",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

#### PUT /api/auth/profile
Update current user profile.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "full_name": "Updated Name",
  "email": "newemail@example.com",
  "phone": "+91-9876543210"
}
```

#### POST /api/auth/change-password
Change user password.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

### Admin-Only Endpoints

#### POST /api/auth/register
Register a new user (admin only).

**Headers:** `Authorization: Bearer <admin-token>`

**Request:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123",
  "full_name": "John Doe",
  "role": "user",
  "phone": "+91-9876543210"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "username": "john_doe",
    "email": "john@example.com",
    "full_name": "John Doe",
    "role": "user",
    "phone": "+91-9876543210",
    "created_at": "2024-01-01T10:00:00.000Z"
  },
  "message": "User registered successfully"
}
```

#### GET /api/auth/users
Get all users (admin/manager only).

**Headers:** `Authorization: Bearer <admin-token>`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@agrinursery.com",
      "full_name": "System Administrator",
      "role": "admin",
      "phone": null,
      "is_active": true,
      "last_login": "2024-01-01T10:00:00.000Z",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### PUT /api/auth/users/:id
Update user details (admin only).

**Headers:** `Authorization: Bearer <admin-token>`

**Request:**
```json
{
  "full_name": "Updated Name",
  "email": "updated@example.com",
  "role": "manager",
  "is_active": true
}
```

#### DELETE /api/auth/users/:id
Deactivate user (admin only, soft delete).

**Headers:** `Authorization: Bearer <admin-token>`

**Response:**
```json
{
  "success": true,
  "message": "User deactivated successfully"
}
```

## Middleware

### authenticate
Validates JWT token and attaches user to request object.

**Usage:**
```javascript
const { authenticate } = require('./middleware/auth.middleware');

router.get('/protected', authenticate, (req, res) => {
  // req.user contains authenticated user info
  res.json({ user: req.user });
});
```

### authorize(...roles)
Checks if authenticated user has required role.

**Usage:**
```javascript
const { authenticate, authorize } = require('./middleware/auth.middleware');

router.post('/admin-only', authenticate, authorize('admin'), (req, res) => {
  res.json({ message: 'Admin access granted' });
});

router.get('/staff-only', authenticate, authorize('admin', 'manager'), (req, res) => {
  res.json({ message: 'Staff access granted' });
});
```

### auditLog(action, resource)
Logs user actions to audit_logs table.

**Usage:**
```javascript
const { authenticate, auditLog } = require('./middleware/auth.middleware');

router.post('/create', 
  authenticate, 
  auditLog('CREATE', 'product'), 
  (req, res) => {
    // Action will be logged automatically
  }
);
```

### optionalAuth
Validates token if present, but doesn't fail if missing.

**Usage:**
```javascript
const { optionalAuth } = require('./middleware/auth.middleware');

router.get('/public-or-private', optionalAuth, (req, res) => {
  if (req.user) {
    // User is authenticated
  } else {
    // Anonymous access
  }
});
```

## CLI Tools

### Create Admin User
```bash
cd /server
node scripts/create-admin.js
```

Interactive script to create admin users:
- Prompts for username, email, full name, phone, password
- Validates input (password strength, duplicates)
- Hashes password securely
- Creates user with admin role

## Testing

### Run Tests
```bash
cd /server
npm test                 # Run all tests
npm run test:watch       # Watch mode
```

### Test Coverage
- 22 test cases covering all auth flows
- Login success/failure scenarios
- Registration with validation
- Password change and reset
- Role-based access control
- Token expiration and validation
- Session management

**Current Coverage:**
- Auth Controller: 61.76% lines
- Auth Middleware: 72.22% lines

## Security Best Practices

### Password Security
- Minimum 8 characters enforced
- Bcrypt hashing with 10 rounds
- Never stored in plain text
- Password verification uses constant-time comparison

### Token Security
- JWT signed with secret key (use strong secret in production)
- 24-hour expiration
- Token hash stored in database for revocation
- Session invalidation on password change

### API Security
- All endpoints except /login require authentication
- Role-based authorization for sensitive operations
- Audit logging for compliance
- IP address tracking

## Error Handling

### Common Errors

**401 Unauthorized**
```json
{
  "success": false,
  "error": "No token provided"
}
```

**403 Forbidden**
```json
{
  "success": false,
  "error": "Insufficient permissions"
}
```

**409 Conflict**
```json
{
  "success": false,
  "error": "Username or email already exists"
}
```

**400 Bad Request**
```json
{
  "success": false,
  "error": "Password must be at least 8 characters"
}
```

## Default Credentials

**Admin User:**
- Username: `admin`
- Password: `admin123`
- Email: `admin@agrinursery.com`

⚠️ **IMPORTANT:** Change the default admin password immediately after first login in production!

## Frontend Integration

### AuthProvider Component
React context provider for authentication state management.

```jsx
import { AuthProvider } from './pages/Login';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  );
}
```

### ProtectedRoute Component
Wrapper for routes requiring authentication.

```jsx
import ProtectedRoute from './components/ProtectedRoute';

<Route 
  path="/admin" 
  element={
    <ProtectedRoute requiredRole={['admin']}>
      <AdminPanel />
    </ProtectedRoute>
  } 
/>
```

### Using useAuth Hook
```jsx
import { useAuth } from './pages/Login';

function MyComponent() {
  const { user, token, login, logout } = useAuth();

  // Check authentication
  if (!user) {
    return <div>Please login</div>;
  }

  // Use user data
  return <div>Welcome {user.full_name}</div>;
}
```

## Production Checklist

- [ ] Change default admin password
- [ ] Set strong JWT_SECRET in environment variables
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS for specific origins
- [ ] Set up rate limiting on auth endpoints
- [ ] Enable session timeout cleanup job
- [ ] Review and adjust token expiration time
- [ ] Set up audit log retention policy
- [ ] Configure password complexity requirements
- [ ] Enable two-factor authentication (future enhancement)
- [ ] Set up monitoring for failed login attempts
- [ ] Configure account lockout after failed attempts

## Future Enhancements

- [ ] Two-factor authentication (2FA)
- [ ] OAuth/SSO integration
- [ ] Password reset via email
- [ ] Account lockout after failed attempts
- [ ] Session management dashboard
- [ ] User activity tracking
- [ ] Permission-based access control (beyond roles)
- [ ] API key authentication for external integrations
