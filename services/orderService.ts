import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Product } from './productService';
import { Key } from 'react';

// Use localhost for web, IP address for mobile
const API_BASE_URL = Platform.OS === 'web' 
  ? 'http://localhost:5020/api' 
  : 'http://192.168.0.174:5020/api';

export interface OrderItem {
  brand: any;
  image: string;
  id: Key | null | undefined;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  totalPrice: number;
  variant?: {
    size?: string;
    color?: string;
    model?: string;
  };
}

export interface Order {
  date: string | number | Date;
  id: string;
  orderNumber: string;
  customerId: string;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
  };
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: OrderItem[];
  pricing: {
    subtotal: number;
    tax: number;
    shipping: number;
    discount: number;
    total: number;
  };
  shippingAddress: {
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  paymentInfo: {
    method: string;
    status: string;
    transactionId?: string;
    lastFour?: string;
  };
  tracking?: {
    trackingNumber?: string;
    carrier?: string;
    estimatedDelivery?: string;
    actualDelivery?: string;
  };
  notes?: string;
  promoCode?: string;
  createdAt: string;
  updatedAt: string;
  statusHistory: Array<{
    status: string;
    timestamp: string;
    updatedBy?: string;
    notes?: string;
  }>;
}

export interface OrderResponse {
  success: boolean;
  message: string;
  data?: {
    order?: Order;
    orders?: Order[];
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
    stats?: any;
    overview?: any;
    statusBreakdown?: any;
    dailyStats?: any;
  };
  count?: number;
  errors?: Array<{
    field: string;
    message: string;
    value: any;
  }>;
}

export interface CreateOrderData {
  shippingAddress: {
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
    phone?: string;
  };
  paymentInfo: {
    method: 'credit_card' | 'debit_card' | 'paypal' | 'apple_pay' | 'google_pay';
    transactionId?: string;
    lastFour?: string;
  };
  notes?: string;
  promoCode?: string;
  // ✅ ADD THESE FIELDS
  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
    totalPrice: number;
    variant?: {
      size?: string;
      color?: string;
      model?: string;
    };
    image?: string;
    brand?: string;
    sku?: string;
  }>;
  pricing?: {
    subtotal: number;
    tax: number;
    shipping: number;
    total: number;
    itemCount: number;
  };
}

export interface OrderFilters {
  status?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: 'createdAt' | 'total' | 'status' | 'orderNumber';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

class OrderService {
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'credentials': 'include', // Include session cookies
    };
  }

  private buildQueryString(filters: OrderFilters): string {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    return params.toString();
  }

  /**
   * Get all orders with filtering and pagination
   */
  async getOrders(filters: OrderFilters = {}): Promise<OrderResponse> {
    try {
      const queryString = this.buildQueryString(filters);
      const url = `${API_BASE_URL}/orders${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        credentials: 'include',
      });

      const data: OrderResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Get orders error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }

  /**
   * Get single order by ID
   */
  async getOrder(id: string): Promise<OrderResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${id}`, {
        method: 'GET',
        headers: this.getHeaders(),
        credentials: 'include',
      });

      const data: OrderResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Get order error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }

  /**
   * Create new order from cart
   */
  async createOrder(orderData: CreateOrderData): Promise<OrderResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: this.getHeaders(),
        credentials: 'include',
        body: JSON.stringify(orderData),
      });

      const data: OrderResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Create order error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    id: string, 
    status: Order['status'], 
    options: {
      notes?: string;
      trackingNumber?: string;
      carrier?: string;
      estimatedDelivery?: string;
    } = {}
  ): Promise<OrderResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${id}/status`, {
        method: 'PUT',
        headers: this.getHeaders(),
        credentials: 'include',
        body: JSON.stringify({ status, ...options }),
      });

      const data: OrderResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Update order status error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(id: string): Promise<OrderResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
        credentials: 'include',
      });

      const data: OrderResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Cancel order error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }

  /**
   * Get customer orders
   */
  async getCustomerOrders(customerId: string, page: number = 1, limit: number = 10): Promise<OrderResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/customer/${customerId}?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: this.getHeaders(),
        credentials: 'include',
      });

      const data: OrderResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Get customer orders error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }

  /**
   * Get current user's orders (using session authentication)
   */
  async getUserOrders(page: number = 1, limit: number = 50): Promise<OrderResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/orders?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: this.getHeaders(),
        credentials: 'include',
      });

      const data: OrderResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Get user orders error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }
  /**
   * Get order statistics
   */
  async getOrderStats(period: number = 30): Promise<OrderResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/stats?period=${period}`, {
        method: 'GET',
        headers: this.getHeaders(),
        credentials: 'include',
      });

      const data: OrderResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Get order stats error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }

  /**
   * Get recent orders
   */
  async getRecentOrders(limit: number = 10): Promise<OrderResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/recent?limit=${limit}`, {
        method: 'GET',
        headers: this.getHeaders(),
        credentials: 'include',
      });

      const data: OrderResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Get recent orders error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }

  /**
   * Bulk update order status
   */
  async bulkUpdateStatus(
    orderIds: string[], 
    status: Order['status'], 
    notes?: string
  ): Promise<OrderResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/bulk-status`, {
        method: 'PUT',
        headers: this.getHeaders(),
        credentials: 'include',
        body: JSON.stringify({ orderIds, status, notes }),
      });

      const data: OrderResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Bulk update status error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }
}

export const orderService = new OrderService();