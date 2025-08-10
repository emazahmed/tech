# Order Management System Documentation

This document provides comprehensive documentation for the order management system implementation.

## 🔗 System Overview

The order management system provides complete functionality for handling customer orders from creation to delivery, with a robust admin interface for order processing and tracking.

### Key Features

- **Order Creation**: Convert cart items to orders with payment processing
- **Status Tracking**: Complete order lifecycle management
- **Admin Dashboard**: Comprehensive order management interface
- **Inventory Integration**: Automatic stock updates on order placement
- **Customer Communication**: Order status updates and tracking
- **Analytics**: Order statistics and performance metrics

---

## 📊 Database Schema

### Order Model (`server/models/Order.js`)

**Core Fields:**
- `orderNumber`: Unique identifier (auto-generated: ORD-000001)
- `customerId`: Reference to User model
- `status`: Order status (pending, processing, shipped, delivered, cancelled)
- `items`: Array of ordered products with quantities and prices
- `pricing`: Breakdown of costs (subtotal, tax, shipping, discount, total)
- `shippingAddress`: Delivery address information
- `paymentInfo`: Payment method and transaction details
- `tracking`: Shipping tracking information
- `statusHistory`: Complete audit trail of status changes

**Indexes:**
- `orderNumber` (unique)
- `customerId + createdAt` (customer order history)
- `status + createdAt` (admin filtering)
- `customerInfo.email` (customer lookup)
- Text index on `customerInfo.name` (search functionality)

### Relationships

```javascript
Order {
  customerId -> User._id
  items[].productId -> Product._id
  statusHistory[].updatedBy -> User._id (admin)
}
```

---

## 🔗 API Endpoints

### Base URL
```
http://localhost:5020/api/orders
```

### Authentication
All order endpoints require session-based authentication. Admin endpoints require admin role.

---

### 1. Get All Orders (Admin)

**Endpoint:** `GET /orders`

**Query Parameters:**
- `status` - Filter by order status
- `search` - Search by order number, customer name, or email
- `startDate` - Filter orders from date
- `endDate` - Filter orders to date
- `sortBy` - Sort field (createdAt, total, status)
- `sortOrder` - Sort direction (asc, desc)
- `page` - Page number for pagination
- `limit` - Items per page

**Success Response (200):**
```json
{
  "success": true,
  "count": 25,
  "data": {
    "orders": [
      {
        "id": "65f1a2b3c4d5e6f7a8b9c0d1",
        "orderNumber": "ORD-000001",
        "customerInfo": {
          "name": "John Doe",
          "email": "john@example.com",
          "phone": "+1 (555) 123-4567"
        },
        "status": "processing",
        "pricing": {
          "subtotal": 1199.00,
          "tax": 95.92,
          "shipping": 0,
          "discount": 0,
          "total": 1294.92
        },
        "items": [
          {
            "productId": "prod123",
            "name": "iPhone 16 Pro Max",
            "price": 1199,
            "quantity": 1,
            "totalPrice": 1199
          }
        ],
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "total": 150,
    "page": 1,
    "totalPages": 6,
    "stats": {
      "overview": {
        "totalOrders": 150,
        "recentOrders": 25,
        "totalRevenue": 45000,
        "averageOrderValue": 300
      }
    }
  }
}
```

---

### 2. Get Single Order

**Endpoint:** `GET /orders/:id`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "65f1a2b3c4d5e6f7a8b9c0d1",
      "orderNumber": "ORD-000001",
      "customerInfo": {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1 (555) 123-4567"
      },
      "status": "processing",
      "items": [...],
      "pricing": {...},
      "shippingAddress": {...},
      "paymentInfo": {...},
      "tracking": {
        "trackingNumber": "TRK123456789",
        "carrier": "UPS",
        "estimatedDelivery": "2024-01-20T00:00:00.000Z"
      },
      "statusHistory": [
        {
          "status": "pending",
          "timestamp": "2024-01-15T10:30:00.000Z",
          "updatedBy": null
        },
        {
          "status": "processing",
          "timestamp": "2024-01-15T11:00:00.000Z",
          "updatedBy": "admin123",
          "notes": "Payment confirmed"
        }
      ]
    }
  }
}
```

---

### 3. Create Order

**Endpoint:** `POST /orders`

**Request Body:**
```json
{
  "shippingAddress": {
    "name": "John Doe",
    "address": "123 Main Street, Apt 4B",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "United States",
    "phone": "+1 (555) 123-4567"
  },
  "paymentInfo": {
    "method": "credit_card",
    "transactionId": "TXN-123456789",
    "lastFour": "4242"
  },
  "notes": "Please handle with care",
  "promoCode": "WELCOME20"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "order": {
      "id": "65f1a2b3c4d5e6f7a8b9c0d1",
      "orderNumber": "ORD-000001",
      "status": "pending",
      "pricing": {
        "total": 1294.92
      }
    }
  }
}
```

---

### 4. Update Order Status

**Endpoint:** `PUT /orders/:id/status`

**Request Body:**
```json
{
  "status": "shipped",
  "notes": "Order shipped via UPS",
  "trackingNumber": "TRK123456789",
  "carrier": "UPS",
  "estimatedDelivery": "2024-01-20T00:00:00.000Z"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Order status updated successfully",
  "data": {
    "order": {
      "id": "65f1a2b3c4d5e6f7a8b9c0d1",
      "status": "shipped",
      "tracking": {
        "trackingNumber": "TRK123456789",
        "carrier": "UPS",
        "estimatedDelivery": "2024-01-20T00:00:00.000Z"
      }
    }
  }
}
```

---

### 5. Cancel Order

**Endpoint:** `DELETE /orders/:id`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Order cancelled successfully"
}
```

**Business Rules:**
- Orders can only be cancelled if status is 'pending' or 'processing'
- Cancelled orders restore product inventory
- Payment refunds are handled separately

---

### 6. Get Order Statistics

**Endpoint:** `GET /orders/stats`

**Query Parameters:**
- `period` - Number of days for recent stats (default: 30)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalOrders": 150,
      "recentOrders": 25,
      "totalRevenue": 45000,
      "averageOrderValue": 300
    },
    "statusBreakdown": [
      {
        "_id": "pending",
        "count": 5,
        "totalValue": 1500
      },
      {
        "_id": "processing",
        "count": 8,
        "totalValue": 2400
      }
    ],
    "dailyStats": [
      {
        "_id": "2024-01-15",
        "count": 3,
        "revenue": 900
      }
    ]
  }
}
```

---

### 7. Bulk Update Status

**Endpoint:** `PUT /orders/bulk-status`

**Request Body:**
```json
{
  "orderIds": ["order1", "order2", "order3"],
  "status": "processing",
  "notes": "Bulk processing update"
}
```

---

## 🎯 Frontend Components

### Admin Order Management

**AdminOrdersScreen** (`app/admin/orders/index.tsx`)
- Order list with filtering and search
- Bulk operations for status updates
- Real-time order statistics
- Quick action buttons for common status changes

**OrderDetailsScreen** (`app/admin/orders/[id].tsx`)
- Complete order information display
- Status update interface with tracking
- Customer and shipping details
- Order history and audit trail

**AdminDashboard** (`app/admin/dashboard.tsx`)
- Order statistics overview
- Recent orders preview
- Quick navigation to order management

### Customer Order Features

**CheckoutScreen** (`app/checkout.tsx`)
- Integrated with order creation API
- Address selection from saved addresses
- Payment processing simulation
- Order confirmation and tracking

---

## 🔧 Service Layer

### OrderService (`services/orderService.ts`)

**Key Methods:**
- `getOrders(filters)` - Fetch orders with filtering
- `getOrder(id)` - Get single order details
- `createOrder(data)` - Create new order from cart
- `updateOrderStatus(id, status, options)` - Update order status
- `getOrderStats(period)` - Get order analytics
- `bulkUpdateStatus(orderIds, status)` - Bulk status updates

**Error Handling:**
- Network error detection and retry
- Validation error display
- Session authentication checks
- Graceful degradation for offline scenarios

---

## 🔄 Order Lifecycle

### 1. Order Creation
```
Cart Items → Validation → Inventory Check → Order Creation → Cart Clear → Inventory Update
```

### 2. Status Flow
```
pending → processing → shipped → delivered
    ↓
cancelled (only from pending/processing)
```

### 3. Inventory Management
- **Order Creation**: Reduces product inventory
- **Order Cancellation**: Restores product inventory
- **Stock Validation**: Prevents overselling

---

## 🛡️ Security Features

### Session-Based Authentication
- All order operations require valid session
- Admin operations require admin role
- Customer can only access their own orders

### Input Validation
- Comprehensive validation for all order data
- Address format validation
- Payment information sanitization
- Quantity and price validation

### Data Integrity
- Atomic operations for order creation
- Inventory consistency checks
- Transaction rollback on failures

---

## 📱 Mobile Integration

### Order Creation Flow
1. User completes checkout form
2. Address validation and selection
3. Payment information collection
4. Order submission to API
5. Cart clearing and confirmation

### Admin Mobile Interface
- Responsive design for mobile admin access
- Touch-friendly controls for status updates
- Quick action buttons for common operations
- Pull-to-refresh for real-time updates

---

## 🔍 Testing

### API Testing with cURL

**Create Order:**
```bash
curl -X POST http://localhost:5020/api/orders \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "shippingAddress": {
      "name": "John Doe",
      "address": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001"
    },
    "paymentInfo": {
      "method": "credit_card",
      "lastFour": "4242"
    }
  }'
```

**Update Order Status:**
```bash
curl -X PUT http://localhost:5020/api/orders/ORDER_ID/status \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "status": "shipped",
    "trackingNumber": "TRK123456789",
    "carrier": "UPS"
  }'
```

### Frontend Testing
- Test order creation with various cart configurations
- Verify status updates reflect in real-time
- Test bulk operations with multiple orders
- Validate error handling for network issues

---

## 🚀 Performance Optimizations

### Database Optimizations
- Compound indexes for common query patterns
- Aggregation pipelines for statistics
- Efficient pagination with skip/limit
- Text search indexes for customer lookup

### Frontend Optimizations
- Lazy loading of order details
- Optimistic updates for status changes
- Caching of order statistics
- Debounced search functionality

### API Optimizations
- Population of related data in single queries
- Selective field projection for list views
- Batch operations for bulk updates
- Response compression for large datasets

---

## 🔧 Configuration

### Environment Variables
```env
# Order Configuration
ORDER_NUMBER_PREFIX=ORD-
TAX_RATE=0.08
FREE_SHIPPING_THRESHOLD=100
DEFAULT_SHIPPING_COST=9.99

# Payment Configuration
PAYMENT_PROCESSOR=stripe
PAYMENT_WEBHOOK_SECRET=your_webhook_secret
```

### Order Status Configuration
```javascript
const ORDER_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing', 
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};
```

---

## 📈 Analytics and Reporting

### Order Statistics
- Total orders and revenue
- Average order value
- Status distribution
- Daily/weekly/monthly trends
- Customer order patterns

### Performance Metrics
- Order processing time
- Status update frequency
- Customer satisfaction indicators
- Inventory turnover rates

---

## 🔮 Future Enhancements

### Planned Features
1. **Email Notifications**: Automated customer updates
2. **Advanced Tracking**: Real-time shipping updates
3. **Return Management**: Return and refund processing
4. **Inventory Alerts**: Low stock notifications
5. **Customer Portal**: Self-service order tracking
6. **Analytics Dashboard**: Advanced reporting and insights

### Integration Opportunities
1. **Payment Gateways**: Stripe, PayPal integration
2. **Shipping APIs**: UPS, FedEx, USPS tracking
3. **Email Services**: SendGrid, Mailgun notifications
4. **SMS Notifications**: Twilio integration
5. **Inventory Management**: Advanced stock control

---

## 🛠️ Troubleshooting

### Common Issues

**Order Creation Fails:**
- Verify cart has items
- Check product availability
- Validate shipping address format
- Ensure payment information is complete

**Status Update Errors:**
- Confirm admin authentication
- Validate status transition rules
- Check order exists and is not cancelled

**Performance Issues:**
- Monitor database query performance
- Check index usage with explain()
- Optimize aggregation pipelines
- Consider pagination limits

### Debug Commands

```bash
# Check order collection
mongosh
use onetech_ecommerce
db.orders.find().limit(5).pretty()

# Check order statistics
db.orders.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } }
])

# Find orders by customer
db.orders.find({ "customerInfo.email": "customer@example.com" })
```

---

This order management system provides a complete solution for e-commerce order processing with robust admin tools, customer features, and scalable architecture for future growth.