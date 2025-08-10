# Security Implementation Guide

This document outlines the comprehensive security measures implemented in the MongoDB user authentication system.

## 🔐 Security Overview

Our authentication system implements multiple layers of security to protect user data and prevent common attacks. Here's a detailed breakdown of all security measures.

---

## 🛡️ Password Security

### Password Hashing with bcrypt

**Implementation:**
```javascript
// In User model (models/User.js)
const bcrypt = require('bcryptjs');

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(12); // 12 rounds for strong security
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};
```

**Security Benefits:**
- **Salt Rounds**: 12 rounds provide strong protection against rainbow table attacks
- **Unique Salts**: Each password gets a unique salt
- **Adaptive**: bcrypt automatically handles salt generation and verification
- **Future-Proof**: Can increase rounds as hardware improves

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)

---

## 🔑 JWT Token Security

### Token Generation and Validation

**Implementation:**
```javascript
const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { 
      expiresIn: '7d',
      issuer: 'onetech-api',
      audience: 'onetech-app'
    }
  );
};
```

**Security Features:**
- **Strong Secret**: Minimum 256-bit secret key
- **Expiration**: Tokens expire after 7 days
- **Issuer/Audience**: Prevents token misuse across applications
- **Stateless**: No server-side session storage required

**Token Storage Recommendations:**
- **Frontend**: Store in httpOnly cookies (most secure)
- **Mobile**: Use secure storage (Keychain/Keystore)
- **Avoid**: localStorage for sensitive tokens

---

## 🚫 Account Protection

### Brute Force Protection

**Implementation:**
```javascript
// Account lockout after failed attempts
userSchema.methods.incLoginAttempts = function() {
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 };
  }
  
  return this.updateOne(updates);
};
```

**Protection Features:**
- **Attempt Tracking**: Counts failed login attempts per account
- **Progressive Lockout**: Account locked after 5 failed attempts
- **Time-based Unlock**: Automatic unlock after 2 hours
- **Reset on Success**: Successful login resets attempt counter

---

## 🌐 Network Security

### Rate Limiting

**Implementation:**
```javascript
const rateLimit = require('express-rate-limit');

// General API rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP'
});

// Stricter limits for authentication
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 auth attempts per window
  skipSuccessfulRequests: true
});
```

**Protection Against:**
- **DDoS Attacks**: Limits requests per IP
- **Brute Force**: Restricts authentication attempts
- **Resource Exhaustion**: Prevents server overload

### CORS Configuration

**Implementation:**
```javascript
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**Security Benefits:**
- **Origin Restriction**: Only allows requests from specified domains
- **Credential Support**: Enables secure cookie transmission
- **Method Limitation**: Restricts allowed HTTP methods

---

## 🧹 Input Sanitization

### XSS Protection

**Implementation:**
```javascript
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

app.use(xss()); // Clean user input from malicious HTML
app.use(mongoSanitize()); // Prevent NoSQL injection attacks
app.use(hpp()); // Prevent HTTP Parameter Pollution
```

**Protection Against:**
- **XSS Attacks**: Removes malicious scripts from input
- **NoSQL Injection**: Sanitizes MongoDB queries
- **Parameter Pollution**: Prevents duplicate parameter attacks

### Input Validation

**Implementation:**
```javascript
const { body } = require('express-validator');

const signupValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email required'),
    
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must meet complexity requirements')
];
```

**Validation Features:**
- **Format Checking**: Validates email format, phone numbers
- **Length Limits**: Enforces minimum/maximum lengths
- **Pattern Matching**: Ensures password complexity
- **Sanitization**: Normalizes and cleans input data

---

## 🔒 HTTP Security Headers

### Helmet.js Implementation

**Implementation:**
```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  crossOriginEmbedderPolicy: false
}));
```

**Security Headers Added:**
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **X-Frame-Options**: Prevents clickjacking attacks
- **X-XSS-Protection**: Enables browser XSS filtering
- **Strict-Transport-Security**: Enforces HTTPS connections
- **Content-Security-Policy**: Controls resource loading

---

## 🗄️ Database Security

### MongoDB Security Measures

**Connection Security:**
```javascript
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4 // Use IPv4
};
```

**Schema Validation:**
```javascript
// Built-in MongoDB validation
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false // Never include in queries by default
  }
});
```

**Security Features:**
- **Unique Indexes**: Prevent duplicate emails
- **Field Validation**: Server-side data validation
- **Password Exclusion**: Passwords never returned in queries
- **Connection Pooling**: Efficient connection management

---

## 🔍 Security Monitoring

### Logging and Auditing

**Request Logging:**
```javascript
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});
```

**Error Logging:**
```javascript
app.use((err, req, res, next) => {
  console.error('Security Event:', {
    timestamp: new Date().toISOString(),
    error: err.message,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    path: req.path
  });
});
```

**Monitoring Capabilities:**
- **Request Tracking**: All API requests logged
- **Error Tracking**: Security-related errors flagged
- **IP Monitoring**: Track requests by IP address
- **User Activity**: Login attempts and account changes

---

## ⚠️ Security Best Practices

### Environment Security

**Environment Variables:**
```bash
# Use strong, unique secrets
JWT_SECRET=your-256-bit-secret-key-here
MONGODB_URI=mongodb://username:password@host:port/database

# Different secrets for different environments
JWT_SECRET_DEV=dev-secret
JWT_SECRET_PROD=production-secret
```

**Best Practices:**
- **Never commit secrets**: Use .env files and .gitignore
- **Rotate secrets regularly**: Change JWT secrets periodically
- **Use different secrets per environment**: Dev/staging/production
- **Minimum key length**: 256 bits for JWT secrets

### Production Security Checklist

**Server Configuration:**
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Configure reverse proxy (nginx/Apache)
- [ ] Set up firewall rules
- [ ] Enable MongoDB authentication
- [ ] Use MongoDB connection string with credentials
- [ ] Configure log rotation
- [ ] Set up monitoring and alerting

**Application Security:**
- [ ] Set NODE_ENV=production
- [ ] Remove development dependencies
- [ ] Enable security headers
- [ ] Configure CORS for production domains
- [ ] Set secure cookie flags
- [ ] Implement refresh token rotation
- [ ] Add API versioning

**Database Security:**
- [ ] Enable MongoDB authentication
- [ ] Use database-specific users
- [ ] Configure network access restrictions
- [ ] Enable audit logging
- [ ] Regular security updates
- [ ] Database backups with encryption

---

## 🚨 Incident Response

### Security Event Handling

**Account Compromise:**
1. Immediately lock affected account
2. Invalidate all user sessions
3. Force password reset
4. Audit account activity
5. Notify user via secure channel

**Brute Force Detection:**
1. Monitor failed login patterns
2. Implement progressive delays
3. Block suspicious IP addresses
4. Alert administrators
5. Review and adjust rate limits

**Data Breach Response:**
1. Identify scope of breach
2. Secure affected systems
3. Notify affected users
4. Reset all user passwords
5. Review and improve security measures

---

## 🔧 Security Configuration

### Recommended Production Settings

**JWT Configuration:**
```javascript
// Shorter expiration for production
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { 
      expiresIn: '1h', // Shorter for production
      issuer: 'onetech-api',
      audience: 'onetech-app'
    }
  );
};
```

**Rate Limiting (Production):**
```javascript
// Stricter limits for production
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3, // Reduced from 5 to 3
  skipSuccessfulRequests: true
});
```

**Cookie Security:**
```javascript
const cookieOptions = {
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  httpOnly: true,
  secure: true, // HTTPS only
  sameSite: 'strict'
};
```

---

## 📊 Security Metrics

### Key Performance Indicators

**Authentication Metrics:**
- Failed login attempt rate
- Account lockout frequency
- Token expiration events
- Password change frequency

**Security Metrics:**
- Rate limit violations
- XSS/injection attempts
- Suspicious IP activity
- Error rate trends

**Monitoring Tools:**
- Application logs
- Database query logs
- Network traffic analysis
- Security scanning tools

---

## 🔄 Security Updates

### Regular Maintenance

**Weekly:**
- Review security logs
- Check for failed login patterns
- Monitor rate limit violations

**Monthly:**
- Update dependencies
- Review user account status
- Audit access permissions

**Quarterly:**
- Security penetration testing
- Review and update security policies
- Rotate JWT secrets

**Annually:**
- Comprehensive security audit
- Update security documentation
- Review incident response procedures

---

This security implementation provides enterprise-grade protection for user authentication. Regular monitoring and updates ensure continued security effectiveness against evolving threats.