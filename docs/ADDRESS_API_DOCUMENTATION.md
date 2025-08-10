# Address Management API Documentation

This document provides comprehensive API documentation for the address management system.

## 🔗 Base URL

```
http://localhost:5000/api/addresses
```

## 📋 Authentication

All address endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

---

## 📝 Endpoints

### 1. Get All User Addresses

**Endpoint:** `GET /addresses`

**Description:** Retrieve all active addresses for the authenticated user

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Success Response (200):**
```json
{
  "success": true,
  "count": 2,
  "data": {
    "addresses": [
      {
        "id": "65f1a2b3c4d5e6f7a8b9c0d1",
        "label": "Home",
        "type": "home",
        "name": "John Doe",
        "phone": "+1 (555) 123-4567",
        "address": "123 Main Street, Apt 4B",
        "city": "New York",
        "state": "NY",
        "zipCode": "10001",
        "country": "United States",
        "isDefault": true,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:5000/api/addresses \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 2. Get Single Address

**Endpoint:** `GET /addresses/:id`

**Description:** Retrieve a specific address by ID

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "address": {
      "id": "65f1a2b3c4d5e6f7a8b9c0d1",
      "label": "Home",
      "type": "home",
      "name": "John Doe",
      "phone": "+1 (555) 123-4567",
      "address": "123 Main Street, Apt 4B",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "United States",
      "isDefault": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "Address not found"
}
```

---

### 3. Create New Address

**Endpoint:** `POST /addresses`

**Description:** Create a new delivery address

**Request Body:**
```json
{
  "label": "Home",
  "type": "home",
  "name": "John Doe",
  "phone": "+1 (555) 123-4567",
  "address": "123 Main Street, Apt 4B",
  "city": "New York",
  "state": "NY",
  "zipCode": "10001",
  "country": "United States",
  "isDefault": false
}
```

**Validation Rules:**
- `label`: 1-50 characters, required
- `type`: Must be 'home', 'work', or 'other' (optional, defaults to 'home')
- `name`: 2-100 characters, letters and spaces only, required
- `phone`: Valid phone number format, required
- `address`: 5-200 characters, required
- `city`: 2-100 characters, letters and spaces only, required
- `state`: 2-50 characters, required
- `zipCode`: Valid US ZIP code format (12345 or 12345-6789), required
- `country`: 2-100 characters (optional, defaults to 'United States')
- `isDefault`: Boolean (optional, first address automatically becomes default)

**Success Response (201):**
```json
{
  "success": true,
  "message": "Address created successfully",
  "data": {
    "address": {
      "id": "65f1a2b3c4d5e6f7a8b9c0d1",
      "label": "Home",
      "type": "home",
      "name": "John Doe",
      "phone": "+1 (555) 123-4567",
      "address": "123 Main Street, Apt 4B",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "United States",
      "isDefault": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "zipCode",
      "message": "Please provide a valid ZIP code (12345 or 12345-6789)",
      "value": "invalid-zip"
    }
  ]
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/addresses \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Home",
    "type": "home",
    "name": "John Doe",
    "phone": "+1 (555) 123-4567",
    "address": "123 Main Street, Apt 4B",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "United States"
  }'
```

---

### 4. Update Address

**Endpoint:** `PUT /addresses/:id`

**Description:** Update an existing address (all fields optional)

**Request Body:**
```json
{
  "label": "Updated Home",
  "phone": "+1 (555) 987-6543",
  "address": "456 New Street, Apt 2A"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Address updated successfully",
  "data": {
    "address": {
      "id": "65f1a2b3c4d5e6f7a8b9c0d1",
      "label": "Updated Home",
      "type": "home",
      "name": "John Doe",
      "phone": "+1 (555) 987-6543",
      "address": "456 New Street, Apt 2A",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "United States",
      "isDefault": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T11:45:00.000Z"
    }
  }
}
```

---

### 5. Set Default Address

**Endpoint:** `PUT /addresses/:id/default`

**Description:** Set an address as the default delivery address

**Success Response (200):**
```json
{
  "success": true,
  "message": "Default address updated successfully",
  "data": {
    "address": {
      "id": "65f1a2b3c4d5e6f7a8b9c0d1",
      "label": "Work",
      "type": "work",
      "name": "John Doe",
      "phone": "+1 (555) 123-4567",
      "address": "456 Business Ave, Suite 200",
      "city": "New York",
      "state": "NY",
      "zipCode": "10002",
      "country": "United States",
      "isDefault": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T12:00:00.000Z"
    }
  }
}
```

**cURL Example:**
```bash
curl -X PUT http://localhost:5000/api/addresses/65f1a2b3c4d5e6f7a8b9c0d1/default \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 6. Delete Address

**Endpoint:** `DELETE /addresses/:id`

**Description:** Delete an address (soft delete - sets isActive to false)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Address deleted successfully"
}
```

**Special Behavior:**
- If deleting the default address and other addresses exist, the first remaining address automatically becomes the new default
- Addresses are soft-deleted (marked as inactive) rather than permanently removed

**cURL Example:**
```bash
curl -X DELETE http://localhost:5000/api/addresses/65f1a2b3c4d5e6f7a8b9c0d1 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 7. Get Default Address

**Endpoint:** `GET /addresses/default`

**Description:** Get the user's default delivery address

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "address": {
      "id": "65f1a2b3c4d5e6f7a8b9c0d1",
      "label": "Home",
      "type": "home",
      "name": "John Doe",
      "phone": "+1 (555) 123-4567",
      "address": "123 Main Street, Apt 4B",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "United States",
      "isDefault": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "No default address found"
}
```

---

## 🔧 Frontend Integration Example

### React Native Service Usage

```typescript
import { addressService } from '@/services/addressService';

// Get all addresses
const loadAddresses = async () => {
  const response = await addressService.getAddresses();
  if (response.success && response.data?.addresses) {
    setAddresses(response.data.addresses);
  }
};

// Create new address
const createAddress = async (addressData) => {
  const response = await addressService.createAddress(addressData);
  if (response.success) {
    Alert.alert('Success', 'Address added successfully!');
    loadAddresses(); // Refresh list
  } else {
    Alert.alert('Error', response.message);
  }
};

// Set default address
const setDefault = async (addressId) => {
  const response = await addressService.setDefaultAddress(addressId);
  if (response.success) {
    Alert.alert('Success', 'Default address updated!');
    loadAddresses(); // Refresh list
  }
};
```

---

## 🚨 Error Handling

### Common Error Responses

**401 - Unauthorized:**
```json
{
  "success": false,
  "message": "Access token required"
}
```

**404 - Not Found:**
```json
{
  "success": false,
  "message": "Address not found"
}
```

**400 - Validation Error:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "zipCode",
      "message": "Please provide a valid ZIP code (12345 or 12345-6789)",
      "value": "invalid"
    }
  ]
}
```

---

## 🔍 Database Schema

### Address Collection Structure

```javascript
{
  _id: ObjectId,
  userId: ObjectId, // Reference to User
  label: String, // "Home", "Work", etc.
  type: String, // "home", "work", "other"
  name: String, // Recipient name
  phone: String, // Contact number
  address: String, // Street address
  city: String,
  state: String,
  zipCode: String,
  country: String,
  isDefault: Boolean,
  isActive: Boolean, // For soft delete
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes

- `{ userId: 1, isDefault: 1 }` - For finding default addresses
- `{ userId: 1, isActive: 1 }` - For finding active addresses

---

## 🛠️ Testing

### Test Address Creation

```bash
# Create a test address
curl -X POST http://localhost:5000/api/addresses \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Test Address",
    "type": "home",
    "name": "Test User",
    "phone": "+1 (555) 123-4567",
    "address": "123 Test Street",
    "city": "Test City",
    "state": "TS",
    "zipCode": "12345",
    "country": "United States"
  }'
```

### Test Address Retrieval

```bash
# Get all addresses
curl -X GET http://localhost:5000/api/addresses \
  -H "Authorization: Bearer YOUR_TOKEN"
```

This address management system provides complete CRUD functionality with proper validation, security, and error handling for managing user delivery addresses in your ecommerce application.