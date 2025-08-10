# Wishlist and Cart Implementation Setup Guide

This document provides comprehensive setup instructions for the wishlist and cart functionality with session-based authentication.

## 🔄 Overview

This implementation replaces JWT token authentication with session-based authentication for better security and simpler state management. Sessions are stored in MongoDB using `connect-mongo`.

## 🔧 Backend Setup

### 1. Install Required Dependencies

```bash
cd server
npm install express-session connect-mongo
```

### 2. Environment Variables

Add these to your `.env` file:

```env
# Session Configuration
SESSION_SECRET=your-super-secret-session-key-at-least-32-characters-long

# MongoDB URI (if not already set)
MONGODB_URI=mongodb://localhost:27017/onetech_ecommerce

# Client URL for CORS
CLIENT_URL=http://localhost:5020
```

### 3. Database Collections

The implementation creates these new collections:
- `wishlists` - Stores user wishlist items
- `carts` - Stores user cart items  
- `sessions` - Stores user sessions (managed by connect-mongo)

### 4. Start the Backend Server

```bash
cd server
npm run dev
```

## 🎯 Key Features

### Session-Based Authentication

**Security Benefits:**
- Sessions stored server-side in MongoDB
- Automatic session expiry (7 days)
- CSRF protection with SameSite cookies
- No sensitive data stored client-side
- Session regeneration on login for security

**How it works:**
1. User logs in → Server creates session in MongoDB
2. Session ID sent as httpOnly cookie to client
3. Client includes cookie in subsequent requests
4. Server validates session and extracts user info
5. Session automatically expires after 7 days

### Wishlist Functionality

**Features:**
- Add/remove products from wishlist
- Priority levels (low, medium, high)
- Optional notes for wishlist items
- Duplicate prevention
- Offline caching support
- Real-time count badges

**API Endpoints:**
- `GET /api/wishlist` - Get user's wishlist
- `POST /api/wishlist` - Add product to wishlist
- `DELETE /api/wishlist/:productId` - Remove from wishlist
- `DELETE /api/wishlist` - Clear entire wishlist
- `GET /api/wishlist/count` - Get wishlist count
- `GET /api/wishlist/check/:productId` - Check if product is in wishlist

### Cart Functionality

**Features:**
- Add/remove products with quantities
- Update item quantities
- Price tracking (stores price when added)
- Automatic total calculations (subtotal, tax, shipping)
- Move items from wishlist to cart
- Offline caching support
- Real-time count badges

**API Endpoints:**
- `GET /api/cart` - Get user's cart with summary
- `POST /api/cart` - Add product to cart
- `PUT /api/cart/:productId` - Update cart item quantity
- `DELETE /api/cart/:productId` - Remove from cart
- `DELETE /api/cart` - Clear entire cart
- `GET /api/cart/summary` - Get cart totals
- `GET /api/cart/count` - Get cart counts
- `POST /api/cart/from-wishlist/:productId` - Move from wishlist to cart

## 🔒 Security Considerations

### Session Security

**Configuration:**
```javascript
{
  secret: process.env.SESSION_SECRET, // Strong secret key
  resave: false, // Don't save unchanged sessions
  saveUninitialized: false, // Don't create sessions for unauthenticated users
  store: MongoStore, // Store sessions in MongoDB
  cookie: {
    secure: true, // HTTPS only in production
    httpOnly: true, // Prevent XSS attacks
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax' // CSRF protection
  }
}
```

**Best Practices:**
- Sessions automatically expire after 7 days
- Session ID regenerated on login
- Secure cookies in production (HTTPS)
- HttpOnly cookies prevent XSS
- SameSite protection against CSRF

### Data Validation

**Input Validation:**
- All API inputs validated using express-validator
- MongoDB injection prevention
- XSS protection through input sanitization
- Quantity limits (1-99 items per cart item)
- Product existence verification

## 📱 Frontend Integration

### Component Usage

**WishlistButton Component:**
```typescript
import WishlistButton from '@/components/WishlistButton';

<WishlistButton 
  product={product}
  size={24}
  onToggle={(isInWishlist) => console.log('Wishlist status:', isInWishlist)}
/>
```

**CartButton Component:**
```typescript
import CartButton from '@/components/CartButton';

<CartButton 
  product={product}
  showQuantity={true}
  onAddToCart={() => console.log('Added to cart')}
/>
```

**Badge Components:**
```typescript
import CartBadge from '@/components/CartBadge';
import WishlistBadge from '@/components/WishlistBadge';

// Show total items in cart
<CartBadge showItemCount={true} />

// Show wishlist count
<WishlistBadge />
```

### Service Usage

**Wishlist Service:**
```typescript
import { wishlistService } from '@/services/wishlistService';

// Add to wishlist
const response = await wishlistService.addToWishlist({
  productId: 'product-id',
  priority: 'high',
  notes: 'Birthday gift idea'
});

// Get wishlist
const wishlist = await wishlistService.getWishlist();
```

**Cart Service:**
```typescript
import { cartService } from '@/services/cartService';

// Add to cart
const response = await cartService.addToCart({
  productId: 'product-id',
  quantity: 2,
  variant: { size: 'Large', color: 'Blue' }
});

// Get cart with summary
const cart = await cartService.getCart();
```

## 🧪 Testing

### API Testing with cURL

**Login and get session:**
```bash
# Login (creates session)
curl -X POST http://localhost:5020/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'

# Add to wishlist (using session)
curl -X POST http://localhost:5020/api/wishlist \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "productId": "product-id-here",
    "priority": "high"
  }'

# Add to cart (using session)
curl -X POST http://localhost:5020/api/cart \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "productId": "product-id-here",
    "quantity": 2
  }'
```

### Frontend Testing

**Test Authentication:**
1. Login through the app
2. Check browser dev tools → Application → Cookies
3. Should see `onetech.sid` cookie

**Test Wishlist:**
1. Browse products and add to wishlist
2. Check wishlist tab for added items
3. Test remove and clear functionality

**Test Cart:**
1. Add products to cart with different quantities
2. Update quantities and remove items
3. Verify totals calculation
4. Test move from wishlist to cart

## 🚀 Deployment Considerations

### Production Settings

**Session Configuration:**
```javascript
// In production
{
  cookie: {
    secure: true, // Require HTTPS
    httpOnly: true,
    sameSite: 'strict', // Stricter CSRF protection
    domain: '.yourdomain.com' // Set proper domain
  }
}
```

**Environment Variables:**
```env
NODE_ENV=production
SESSION_SECRET=your-production-session-secret-256-bits-minimum
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/onetech_prod
CLIENT_URL=https://yourdomain.com
```

### Performance Optimization

**Database Indexes:**
- Compound indexes on `userId` + `productId` for fast lookups
- TTL index on sessions collection for automatic cleanup
- Indexes on frequently queried fields

**Caching Strategy:**
- Client-side caching with 1-hour expiry
- Automatic cache refresh on data changes
- Fallback to cached data on network errors

## 🔍 Monitoring and Maintenance

### Session Management

**Monitor session usage:**
```javascript
// Check active sessions
db.sessions.countDocuments()

// Check session expiry
db.sessions.find({ expires: { $lt: new Date() } })

// Clean up expired sessions (automatic with TTL)
```

### Performance Metrics

**Key metrics to monitor:**
- Session creation/destruction rate
- Cart abandonment rate
- Wishlist to cart conversion rate
- API response times
- Cache hit rates

## 🔧 Troubleshooting

### Common Issues

**Session not persisting:**
- Check cookie settings in browser
- Verify CORS credentials: 'include'
- Ensure MongoDB connection is stable

**Cart/Wishlist not loading:**
- Check network connectivity
- Verify API endpoints are running
- Check browser console for errors

**Authentication errors:**
- Verify session secret is set
- Check MongoDB session store connection
- Ensure cookies are enabled in browser

This implementation provides a robust, secure foundation for e-commerce wishlist and cart functionality without relying on JWT tokens, using proven session-based authentication patterns.