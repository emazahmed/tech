# API Documentation - User Authentication

This document provides comprehensive API documentation for the user authentication system.

## 🔗 Base URL

```
http://localhost:5000/api
```

## 📋 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 🛡️ Security Features

- **Rate Limiting**: 5 requests per 15 minutes for auth endpoints
- **Account Lockout**: Account locked for 2 hours after 5 failed login attempts
- **Password Hashing**: bcrypt with 12 rounds
- **Input Validation**: Comprehensive validation for all inputs
- **XSS Protection**: Input sanitization against XSS attacks
- **NoSQL Injection Protection**: MongoDB query sanitization

---

## 📝 Endpoints

### 1. User Registration

**Endpoint:** `POST /auth/signup`

**Description:** Register a new user account

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "phone": "+1234567890"
}
```

**Validation Rules:**
- `name`: 2-50 characters, letters and spaces only
- `email`: Valid email format
- `password`: Minimum 8 characters with uppercase, lowercase, number, and special character
- `phone`: Optional, valid phone number format

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "a1b2c3d4e5f6...",
    "user": {
      "id": "65f1a2b3c4d5e6f7a8b9c0d1",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "isEmailVerified": false,
      "lastLogin": null,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

**Error Responses:**

*400 - Validation Error:*
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "password",
      "message": "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      "value": "weakpass"
    }
  ]
}
```

*409 - User Already Exists:*
```json
{
  "success": false,
  "message": "User already exists with this email"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "phone": "+1234567890"
  }'
```

---

### 2. User Login

**Endpoint:** `POST /auth/login`

**Description:** Authenticate user and receive access token

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "a1b2c3d4e5f6...",
    "user": {
      "id": "65f1a2b3c4d5e6f7a8b9c0d1",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "isEmailVerified": false,
      "lastLogin": "2024-01-15T10:35:00.000Z",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

**Error Responses:**

*401 - Invalid Credentials:*
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

*401 - Account Locked:*
```json
{
  "success": false,
  "message": "Account temporarily locked due to too many failed login attempts"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

---

### 3. Get Current User

**Endpoint:** `GET /auth/me`

**Description:** Get current authenticated user information

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "65f1a2b3c4d5e6f7a8b9c0d1",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "role": "user",
      "isEmailVerified": false,
      "lastLogin": "2024-01-15T10:35:00.000Z",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "addresses": []
    }
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Access token required"
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 4. Update User Profile

**Endpoint:** `PUT /auth/profile`

**Description:** Update user profile information

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "name": "John Smith",
  "phone": "+1987654321"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": "65f1a2b3c4d5e6f7a8b9c0d1",
      "name": "John Smith",
      "email": "john@example.com",
      "phone": "+1987654321",
      "role": "user",
      "isEmailVerified": false
    }
  }
}
```

**cURL Example:**
```bash
curl -X PUT http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith",
    "phone": "+1987654321"
  }'
```

---

### 5. Change Password

**Endpoint:** `PUT /auth/change-password`

**Description:** Change user password

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "currentPassword": "SecurePass123!",
  "newPassword": "NewSecurePass456@"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Current password is incorrect"
}
```

**cURL Example:**
```bash
curl -X PUT http://localhost:5000/api/auth/change-password \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "SecurePass123!",
    "newPassword": "NewSecurePass456@"
  }'
```

---

### 6. Logout

**Endpoint:** `POST /auth/logout`

**Description:** Logout user and invalidate token

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 7. Health Check

**Endpoint:** `GET /health`

**Description:** Check server and database status

**Success Response (200):**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-15T10:40:00.000Z",
  "database": {
    "status": "connected",
    "host": "localhost",
    "port": 27017,
    "name": "onetech_ecommerce"
  }
}
```

---

## 🔐 JWT Token Structure

**Header:**
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload:**
```json
{
  "userId": "65f1a2b3c4d5e6f7a8b9c0d1",
  "iat": 1642248000,
  "exp": 1642852800,
  "iss": "onetech-api",
  "aud": "onetech-app"
}
```

**Token Expiration:** 7 days (configurable via JWT_EXPIRES_IN)

---

## 📊 HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid input or validation error |
| 401 | Unauthorized - Authentication required or failed |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

---

## 🧪 Testing with Postman

### Environment Variables
Create a Postman environment with:
```
baseUrl: http://localhost:5000/api
token: {{authToken}}
```

### Test Collection

1. **Register User**
   - Method: POST
   - URL: `{{baseUrl}}/auth/signup`
   - Body: Raw JSON with user data
   - Tests: Save token to environment variable

2. **Login User**
   - Method: POST
   - URL: `{{baseUrl}}/auth/login`
   - Body: Raw JSON with credentials
   - Tests: Save token to environment variable

3. **Get Profile**
   - Method: GET
   - URL: `{{baseUrl}}/auth/me`
   - Headers: Authorization: Bearer {{token}}

---

## 🔧 Integration Examples

### Frontend Integration (React/JavaScript)

```javascript
// API service
class AuthService {
  constructor() {
    this.baseURL = 'http://localhost:5000/api';
    this.token = localStorage.getItem('token');
  }

  async signup(userData) {
    const response = await fetch(`${this.baseURL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();
    
    if (data.success) {
      this.token = data.data.token;
      localStorage.setItem('token', this.token);
    }
    
    return data;
  }

  async login(credentials) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();
    
    if (data.success) {
      this.token = data.data.token;
      localStorage.setItem('token', this.token);
    }
    
    return data;
  }

  async getProfile() {
    const response = await fetch(`${this.baseURL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });

    return await response.json();
  }

  logout() {
    this.token = null;
    localStorage.removeItem('token');
  }
}

// Usage example
const authService = new AuthService();

// Register user
const signupData = {
  name: 'John Doe',
  email: 'john@example.com',
  password: 'SecurePass123!',
  phone: '+1234567890'
};

authService.signup(signupData)
  .then(response => {
    if (response.success) {
      console.log('User registered successfully');
    } else {
      console.error('Registration failed:', response.message);
    }
  });
```

---

## 🚨 Error Handling

### Common Error Patterns

```javascript
// Handle API responses
const handleApiResponse = async (response) => {
  const data = await response.json();
  
  if (!data.success) {
    // Handle different error types
    switch (response.status) {
      case 400:
        // Validation errors
        if (data.errors) {
          data.errors.forEach(error => {
            console.error(`${error.field}: ${error.message}`);
          });
        }
        break;
      
      case 401:
        // Authentication errors
        console.error('Authentication failed:', data.message);
        // Redirect to login
        break;
      
      case 429:
        // Rate limit exceeded
        console.error('Too many requests:', data.message);
        break;
      
      default:
        console.error('API Error:', data.message);
    }
    
    throw new Error(data.message);
  }
  
  return data;
};
```

---

## 📈 Rate Limiting

### Current Limits

- **General API**: 100 requests per 15 minutes per IP
- **Authentication**: 5 requests per 15 minutes per IP
- **Account Lockout**: 5 failed login attempts locks account for 2 hours

### Rate Limit Headers

```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 1642248900
```

---

## 🔍 Monitoring and Logging

### Request Logging
All requests are logged with:
- Timestamp
- HTTP method
- Request path
- Client IP address

### Error Logging
Errors include:
- Error message
- Stack trace (development only)
- Request context
- User information (if authenticated)

---

## 🛠️ Development Tools

### Database Inspection
```bash
# Connect to MongoDB
mongosh

# Switch to database
use onetech_ecommerce

# View users
db.users.find().pretty()

# Check failed login attempts
db.users.find({ loginAttempts: { $gt: 0 } })

# View locked accounts
db.users.find({ lockUntil: { $gt: new Date() } })
```

### JWT Token Debugging
Use [jwt.io](https://jwt.io) to decode and verify JWT tokens during development.

---

This documentation provides everything needed to integrate with the authentication API. For additional features or customization, refer to the source code and setup guide.