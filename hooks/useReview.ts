import { useState, useEffect, useCallback } from 'react';
import { reviewService, Review } from '@/services/reviewService';

interface UseReviewResult {
  review: Review | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  clearError: () => void;
}

export function useReview(reviewId: string): UseReviewResult {
  const [review, setReview] = useState<Review | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReview = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await reviewService.getReview(reviewId);

      if (response.success && response.data?.review) {
        setReview(response.data.review);
      } else {
        setError(response.message || 'Review not found');
        setReview(null);
      }
    } catch (error) {
      console.error('Fetch review error:', error);
      setError('Network error. Please check your connection.');
      setReview(null);
    } finally {
      setIsLoading(false);
    }
  }, [reviewId]);

  const refresh = useCallback(async () => {
    await fetchReview();
  }, [fetchReview]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    if (reviewId) {
      fetchReview();
    }
  }, [reviewId, fetchReview]);

  return {
    review,
    isLoading,
    error,
    refresh,
    clearError,
  };
}