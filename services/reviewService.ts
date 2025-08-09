import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Product } from './productService';

// Use localhost for web, IP address for mobile
const API_BASE_URL = Platform.OS === 'web' 
  ? 'http://localhost:5020/api' 
  : 'http://192.168.0.174:5020/api';

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  title: string;
  content: string;
  verified: boolean;
  helpful: number;
  notHelpful: number;
  images?: string[];
  isActive: boolean;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
  userHasVoted?: 'helpful' | 'not-helpful' | null;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface ReviewResponse {
  success: boolean;
  message: string;
  data?: {
    review?: Review;
    reviews?: Review[];
    stats?: ReviewStats;
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
    canReview?: boolean;
    reason?: string;
    existingReview?: Partial<Review>;
    hasPurchased?: boolean;
    verified?: boolean;
    helpful?: number;
    notHelpful?: number;
  };
  count?: number;
  errors?: Array<{
    field: string;
    message: string;
    value: any;
  }>;
}

export interface CreateReviewData {
  productId: string;
  rating: number;
  title: string;
  content: string;
  images?: string[];
}

export interface ReviewFilters {
  productId?: string;
  userId?: string;
  rating?: number;
  sortBy?: 'createdAt' | 'rating' | 'helpful';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

class ReviewService {
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'credentials': 'include', // Include session cookies
    };
  }

  private buildQueryString(filters: ReviewFilters): string {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    return params.toString();
  }

  /**
   * Get all reviews with filtering and pagination
   */
  async getReviews(filters: ReviewFilters = {}): Promise<ReviewResponse> {
    try {
      const queryString = this.buildQueryString(filters);
      const url = `${API_BASE_URL}/reviews${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data: ReviewResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Get reviews error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }

  /**
   * Get single review by ID
   */
  async getReview(id: string): Promise<ReviewResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/reviews/${id}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data: ReviewResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Get review error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }

  /**
   * Get reviews for a specific product
   */
  async getProductReviews(productId: string, filters: Omit<ReviewFilters, 'productId'> = {}): Promise<ReviewResponse> {
    try {
      const queryString = this.buildQueryString(filters);
      const url = `${API_BASE_URL}/reviews/product/${productId}${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data: ReviewResponse = await response.json();
      
      // Cache product reviews for offline access
      if (data.success && data.data?.reviews) {
        await this.cacheProductReviews(productId, data.data.reviews, data.data.stats);
      }
      
      return data;
    } catch (error) {
      console.error('Get product reviews error:', error);
      
      // Try to return cached reviews on network error
      const cachedData = await this.getCachedProductReviews(productId);
      if (cachedData.reviews.length > 0) {
        return {
          success: true,
          message: 'Showing cached reviews',
          data: cachedData
        };
      }
      
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }

  /**
   * Create a new review
   */
  async createReview(reviewData: CreateReviewData): Promise<ReviewResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/reviews`, {
        method: 'POST',
        headers: this.getHeaders(),
        credentials: 'include',
        body: JSON.stringify(reviewData),
      });

      const result: ReviewResponse = await response.json();
      
      // Update cache on successful creation
      if (result.success) {
        await this.refreshProductReviewsCache(reviewData.productId);
      }
      
      return result;
    } catch (error) {
      console.error('Create review error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }

  /**
   * Update an existing review
   */
  async updateReview(id: string, reviewData: Partial<CreateReviewData>): Promise<ReviewResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/reviews/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        credentials: 'include',
        body: JSON.stringify(reviewData),
      });

      const result: ReviewResponse = await response.json();
      
      // Update cache on successful update
      if (result.success && result.data?.review) {
        await this.refreshProductReviewsCache(result.data.review.productId);
      }
      
      return result;
    } catch (error) {
      console.error('Update review error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }

  /**
   * Delete a review
   */
  async deleteReview(id: string): Promise<ReviewResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/reviews/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
        credentials: 'include',
      });

      const result: ReviewResponse = await response.json();
      return result;
    } catch (error) {
      console.error('Delete review error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }

  /**
   * Vote on review helpfulness
   */
  async voteOnReview(id: string, isHelpful: boolean): Promise<ReviewResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/reviews/${id}/vote`, {
        method: 'POST',
        headers: this.getHeaders(),
        credentials: 'include',
        body: JSON.stringify({ isHelpful }),
      });

      const result: ReviewResponse = await response.json();
      return result;
    } catch (error) {
      console.error('Vote on review error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }

  /**
   * Get current user's reviews
   */
  async getUserReviews(page: number = 1, limit: number = 20): Promise<ReviewResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/reviews/user/me?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: this.getHeaders(),
        credentials: 'include',
      });

      const data: ReviewResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Get user reviews error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }

  /**
   * Check if user can review a product
   */
  async canReviewProduct(productId: string): Promise<ReviewResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/reviews/can-review/${productId}`, {
        method: 'GET',
        headers: this.getHeaders(),
        credentials: 'include',
      });

      const data: ReviewResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Can review product error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }

  /**
   * Get product review statistics
   */
  async getProductReviewStats(productId: string): Promise<ReviewResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/reviews/stats/${productId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data: ReviewResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Get product review stats error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }

  // Cache management for offline support
  private async cacheProductReviews(productId: string, reviews: Review[], stats?: ReviewStats): Promise<void> {
    try {
      await AsyncStorage.setItem(`cachedReviews_${productId}`, JSON.stringify(reviews));
      if (stats) {
        await AsyncStorage.setItem(`cachedReviewStats_${productId}`, JSON.stringify(stats));
      }
      await AsyncStorage.setItem(`reviewsCacheTime_${productId}`, Date.now().toString());
    } catch (error) {
      console.error('Error caching product reviews:', error);
    }
  }

  private async getCachedProductReviews(productId: string): Promise<{ reviews: Review[]; stats?: ReviewStats }> {
    try {
      const cachedReviews = await AsyncStorage.getItem(`cachedReviews_${productId}`);
      const cachedStats = await AsyncStorage.getItem(`cachedReviewStats_${productId}`);
      const cacheTime = await AsyncStorage.getItem(`reviewsCacheTime_${productId}`);
      
      if (cachedReviews && cacheTime) {
        const timeDiff = Date.now() - parseInt(cacheTime);
        const oneHour = 60 * 60 * 1000;
        
        // Return cached data if less than 1 hour old
        if (timeDiff < oneHour) {
          return {
            reviews: JSON.parse(cachedReviews),
            stats: cachedStats ? JSON.parse(cachedStats) : undefined
          };
        }
      }
      
      return { reviews: [] };
    } catch (error) {
      console.error('Error getting cached product reviews:', error);
      return { reviews: [] };
    }
  }

  private async refreshProductReviewsCache(productId: string): Promise<void> {
    try {
      const response = await this.getProductReviews(productId);
      if (response.success && response.data?.reviews) {
        await this.cacheProductReviews(productId, response.data.reviews, response.data.stats);
      }
    } catch (error) {
      console.error('Error refreshing product reviews cache:', error);
    }
  }

  private async clearProductReviewsCache(productId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`cachedReviews_${productId}`);
      await AsyncStorage.removeItem(`cachedReviewStats_${productId}`);
      await AsyncStorage.removeItem(`reviewsCacheTime_${productId}`);
    } catch (error) {
      console.error('Error clearing product reviews cache:', error);
    }
  }
}

export const reviewService = new ReviewService();