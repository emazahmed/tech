import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Use localhost for web, IP address for mobile
const API_BASE_URL = Platform.OS === 'web' 
  ? 'http://localhost:5020/api' 
  : 'http://192.168.0.174:5020/api';

export interface Product {
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
  message?: string;
  total?: number;
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
  image: string;
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
        if (key === 'search' && typeof value === 'string') {
          const trimmedSearch = value.trim();
          if (trimmedSearch) {
            params.append(key, trimmedSearch);
          }
        } else {
          params.append(key, value.toString());
        }
      }
    });

    return params.toString();
  }

  async getProducts(filters: ProductFilters = {}, options?: { signal?: AbortSignal }): Promise<ProductResponse> {
    try {
      const queryString = this.buildQueryString(filters);
      const url = `${API_BASE_URL}/products${queryString ? `?${queryString}` : ''}`;
      
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const shouldCreateTimeout = !options?.signal;
      const controller = shouldCreateTimeout ? new AbortController() : null;
      
      if (shouldCreateTimeout && controller) {
        timeoutId = setTimeout(() => controller.abort(), 10000);
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: options?.signal || controller?.signal,
      });

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            message: 'Products endpoint not found',
            data: { products: [], total: 0 },
            total: 0
          };
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ProductResponse = await response.json();
      
      const normalizedData: ProductResponse = {
        ...data,
        total: data.data?.total || data.total || 0,
        data: {
          ...data.data,
          products: data.data?.products || [],
          total: data.data?.total || data.total || 0,
        }
      };

      return normalizedData;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw error;
      }
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return {
          success: false,
          message: 'Unable to connect to server. Please check your internet connection.',
          data: { products: [], total: 0 },
          total: 0
        };
      }
      
      return {
        success: false,
        message: error.message || 'Network error. Please check your connection and try again.',
        data: { products: [], total: 0 },
        total: 0
      };
    }
  }

  async getProduct(id: string): Promise<ProductResponse> {
    try {
      const url = `${API_BASE_URL}/products/${id}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ProductResponse = await response.json();
      return data;
    } catch {
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }

  async searchProducts(query: string, filters: Omit<ProductFilters, 'search'> = {}): Promise<ProductResponse> {
    return this.getProducts({ ...filters, search: query.trim() });
  }

  async getProductsByCategory(category: string, filters: Omit<ProductFilters, 'category'> = {}): Promise<ProductResponse> {
    return this.getProducts({ ...filters, category });
  }

  async getFeaturedProducts(limit: number = 10): Promise<ProductResponse> {
    return this.getProducts({ 
      sortBy: 'rating', 
      sortOrder: 'desc', 
      limit,
      inStock: true 
    });
  }

  async getCategories(): Promise<{ success: boolean; data?: string[]; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/products/categories`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch {
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }

  async getBrands(): Promise<{ success: boolean; data?: string[]; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/products/brands`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch {
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }

  async createProduct(productData: CreateProductData): Promise<ProductResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(productData),
      });

      const data: ProductResponse = await response.json();
      return data;
    } catch {
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }

  async updateProduct(id: string, productData: Partial<CreateProductData>): Promise<ProductResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(productData),
      });

      const data: ProductResponse = await response.json();
      return data;
    } catch {
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }

  async deleteProduct(id: string): Promise<ProductResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      const data: ProductResponse = await response.json();
      return data;
    } catch {
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }

  async toggleProductStock(id: string, inStock: boolean): Promise<ProductResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}/stock`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({ inStock }),
      });

      const data: ProductResponse = await response.json();
      return data;
    } catch {
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }

  async cacheProducts(products: Product[]): Promise<void> {
    try {
      await AsyncStorage.setItem('cachedProducts', JSON.stringify(products));
      await AsyncStorage.setItem('productsCacheTime', Date.now().toString());
    } catch {}
  }

  async getCachedProducts(): Promise<Product[]> {
    try {
      const cachedProducts = await AsyncStorage.getItem('cachedProducts');
      const cacheTime = await AsyncStorage.getItem('productsCacheTime');
      
      if (cachedProducts && cacheTime) {
        const timeDiff = Date.now() - parseInt(cacheTime);
        const oneHour = 60 * 60 * 1000;
        
        if (timeDiff < oneHour) {
          return JSON.parse(cachedProducts);
        }
      }
      
      return [];
    } catch {
      return [];
    }
  }

  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem('cachedProducts');
      await AsyncStorage.removeItem('productsCacheTime');
    } catch {}
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/products?limit=1`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        message: `Connected successfully. API returned ${data.data?.products?.length || 0} products.`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`
      };
    }
  }
}

export const productService = new ProductService();
