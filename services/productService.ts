import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Use localhost for web, IP address for mobile
const API_BASE_URL = Platform.OS === 'web' 
  ? 'http://localhost:5020/api' 
  : 'http://192.168.0.174:5020/api';export interface Product {
  _id: string;
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  description: string;
  rating: number;
  reviews: number;
  inStock: boolean;
  brand: string;
  images: string[];
  sku?: string;
  inventoryCount?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductResponse {
  success: boolean;
  message: string;
  data?: {
    products?: Product[];
    product?: Product;
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
  errors?: Array<{
    field: string;
    message: string;
    value: any;
  }>;
}

export interface ProductFilters {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  search?: string;
  sortBy?: 'name' | 'price' | 'rating' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CreateProductData {
  name: string;
  description: string;
  price: number;
  category: string;
  brand: string;
  sku: string;
  inventoryCount: number;
  inStock: boolean;
  image: string; // Primary image
  images: string[];
}

class ProductService {
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
    };
  }

  private buildQueryString(filters: ProductFilters): string {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    return params.toString();
  }

  /**
   * Fetch all products with optional filtering and pagination
   */
  async getProducts(filters: ProductFilters = {}): Promise<ProductResponse> {
    try {
      const queryString = this.buildQueryString(filters);
      const url = `${API_BASE_URL}/products${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: await this.getHeaders(),
      });

      const data: ProductResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Get products error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }

  /**
   * Fetch a single product by ID
   */
  async getProduct(id: string): Promise<ProductResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'GET',
        headers: await this.getHeaders(),
      });

      const data: ProductResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Get product error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }

  /**
   * Search products by query
   */
  async searchProducts(query: string, filters: Omit<ProductFilters, 'search'> = {}): Promise<ProductResponse> {
    return this.getProducts({ ...filters, search: query });
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(category: string, filters: Omit<ProductFilters, 'category'> = {}): Promise<ProductResponse> {
    return this.getProducts({ ...filters, category });
  }

  /**
   * Get featured products
   */
  async getFeaturedProducts(limit: number = 10): Promise<ProductResponse> {
    return this.getProducts({ 
      sortBy: 'rating', 
      sortOrder: 'desc', 
      limit,
      inStock: true 
    });
  }

  /**
   * Get product categories
   */
  async getCategories(): Promise<{ success: boolean; data?: string[]; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/products/categories`, {
        method: 'GET',
        headers: await this.getHeaders(),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get categories error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }

  /**
   * Get product brands
   */
  async getBrands(): Promise<{ success: boolean; data?: string[]; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/products/brands`, {
        method: 'GET',
        headers: await this.getHeaders(),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get brands error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }

  // Admin functions (require authentication)

  /**
   * Create a new product (Admin only)
   */
  async createProduct(productData: CreateProductData): Promise<ProductResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(productData),
      });

      const data: ProductResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Create product error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }

  /**
   * Update an existing product (Admin only)
   */
  async updateProduct(id: string, productData: Partial<CreateProductData>): Promise<ProductResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(productData),
      });

      const data: ProductResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Update product error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }

  /**
   * Delete a product (Admin only)
   */
  async deleteProduct(id: string): Promise<ProductResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      const data: ProductResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Delete product error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }

  /**
   * Toggle product stock status (Admin only)
   */
  async toggleProductStock(id: string, inStock: boolean): Promise<ProductResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}/stock`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({ inStock }),
      });

      const data: ProductResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Toggle product stock error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }

  /**
   * Cache products locally for offline access
   */
  async cacheProducts(products: Product[]): Promise<void> {
    try {
      await AsyncStorage.setItem('cachedProducts', JSON.stringify(products));
      await AsyncStorage.setItem('productsCacheTime', Date.now().toString());
    } catch (error) {
      console.error('Error caching products:', error);
    }
  }

  /**
   * Get cached products for offline access
   */
  async getCachedProducts(): Promise<Product[]> {
    try {
      const cachedProducts = await AsyncStorage.getItem('cachedProducts');
      const cacheTime = await AsyncStorage.getItem('productsCacheTime');
      
      if (cachedProducts && cacheTime) {
        const timeDiff = Date.now() - parseInt(cacheTime);
        const oneHour = 60 * 60 * 1000;
        
        // Return cached data if less than 1 hour old
        if (timeDiff < oneHour) {
          return JSON.parse(cachedProducts);
        }
      }
      
      return [];
    } catch (error) {
      console.error('Error getting cached products:', error);
      return [];
    }
  }

  /**
   * Clear product cache
   */
  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem('cachedProducts');
      await AsyncStorage.removeItem('productsCacheTime');
    } catch (error) {
      console.error('Error clearing product cache:', error);
    }
  }
}

export const productService = new ProductService();