import { useState, useEffect, useCallback } from 'react';
import { reviewService, Review, ReviewStats, ReviewFilters } from '@/services/reviewService';

interface UseReviewsResult {
  reviews: Review[];
  stats: ReviewStats | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  hasMore: boolean;
  totalReviews: number;
  currentPage: number;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  filterReviews: (filters: ReviewFilters) => Promise<void>;
  clearError: () => void;
}

interface UseReviewsOptions {
  productId?: string;
  initialFilters?: ReviewFilters;
  pageSize?: number;
  enablePagination?: boolean;
  enableCache?: boolean;
}

export function useReviews(options: UseReviewsOptions = {}): UseReviewsResult {
  const {
    productId,
    initialFilters = {},
    pageSize = 20,
    enablePagination = true,
    enableCache = true,
  } = options;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalReviews, setTotalReviews] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentFilters, setCurrentFilters] = useState<ReviewFilters>(initialFilters);

  const fetchReviews = useCallback(async (
    filters: ReviewFilters = {},
    page: number = 1,
    append: boolean = false
  ) => {
    try {
      if (!append) {
        setIsLoading(true);
      }
      setError(null);

      const requestFilters: ReviewFilters = {
        ...currentFilters,
        ...filters,
        page,
        limit: pageSize,
      };

      let response;
      if (productId) {
        response = await reviewService.getProductReviews(productId, requestFilters);
      } else {
        response = await reviewService.getReviews(requestFilters);
      }

      if (response.success && response.data?.reviews) {
        const newReviews = response.data.reviews;
        
        if (append) {
          setReviews(prev => [...prev, ...newReviews]);
        } else {
          setReviews(newReviews);
        }

        setTotalReviews(response.data.total || newReviews.length);
        setHasMore(newReviews.length === pageSize && (response.data.totalPages ? page < response.data.totalPages : true));
        setCurrentPage(page);

        // Set stats if available
        if (response.data.stats) {
          setStats(response.data.stats);
        }
      } else {
        setError(response.message || 'Failed to fetch reviews');
      }
    } catch (error) {
      console.error('Fetch reviews error:', error);
      setError('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentFilters, pageSize, productId]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setCurrentPage(1);
    setHasMore(true);
    await fetchReviews(currentFilters, 1, false);
  }, [fetchReviews, currentFilters]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading || isRefreshing) return;
    
    const nextPage = currentPage + 1;
    await fetchReviews(currentFilters, nextPage, true);
  }, [hasMore, isLoading, isRefreshing, currentPage, fetchReviews, currentFilters]);

  const filterReviews = useCallback(async (filters: ReviewFilters) => {
    const newFilters = { ...currentFilters, ...filters };
    setCurrentFilters(newFilters);
    setCurrentPage(1);
    setHasMore(true);
    await fetchReviews(newFilters, 1, false);
  }, [currentFilters, fetchReviews]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initial load
  useEffect(() => {
    const filters = productId ? { ...initialFilters, productId } : initialFilters;
    fetchReviews(filters, 1, false);
  }, [productId]);

  return {
    reviews,
    stats,
    isLoading,
    isRefreshing,
    error,
    hasMore,
    totalReviews,
    currentPage,
    refresh,
    loadMore,
    filterReviews,
    clearError,
  };
}