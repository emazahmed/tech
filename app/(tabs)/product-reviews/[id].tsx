import React, { useState, useMemo, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Image,
  StyleSheet,
  Alert,
  Platform,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Star, ThumbsUp, ThumbsDown, Filter, ChevronDown, Camera, X } from 'lucide-react-native';
import { useApp } from '@/context/AppContext';
import Header from '@/components/Header';
import Button from '@/components/Button';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useReviews } from '@/hooks/useReviews';
import { reviewService, Review, CreateReviewData } from '@/services/reviewService';
import { authService } from '@/services/authService';

interface ReviewForm {
  rating: number | string;
  title: string;
  content: string;
  images: string[];
}

export default function ProductReviewsScreen() {
  const { id } = useLocalSearchParams();
  const { state } = useApp();
  const { 
    reviews, 
    stats, 
    isLoading, 
    isRefreshing, 
    error, 
    refresh, 
    filterReviews 
  } = useReviews({ 
    productId: id as string,
    pageSize: 20 
  });
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful'>('newest');
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [reviewForm, setReviewForm] = useState<ReviewForm>({
    rating: 0,
    title: '',
    content: '',
    images: [],
  });
  const [formErrors, setFormErrors] = useState<Partial<ReviewForm>>({});

  const product = state.products.find(p => p.id === id);

  useEffect(() => {
    checkReviewEligibility();
  }, [id, state.user]);

  useEffect(() => {
    // Apply filters when sortBy or filterRating changes
    const filters: any = {};
    
    // Convert sortBy to API format
    switch (sortBy) {
      case 'newest':
        filters.sortBy = 'createdAt';
        filters.sortOrder = 'desc';
        break;
      case 'oldest':
        filters.sortBy = 'createdAt';
        filters.sortOrder = 'asc';
        break;
      case 'highest':
        filters.sortBy = 'rating';
        filters.sortOrder = 'desc';
        break;
      case 'lowest':
        filters.sortBy = 'rating';
        filters.sortOrder = 'asc';
        break;
      case 'helpful':
        filters.sortBy = 'helpful';
        filters.sortOrder = 'desc';
        break;
    }
    
    if (filterRating) {
      filters.rating = filterRating;
    }
    
    filterReviews(filters);
  }, [sortBy, filterRating]);

  const checkReviewEligibility = async () => {
    if (!state.user || !id) {
      setIsAuthenticated(false);
      setCanReview(false);
      setHasReviewed(false);
      return;
    }

    try {
      const isAuth = await authService.isAuthenticated();
      setIsAuthenticated(isAuth);
      
      if (isAuth) {
        const response = await reviewService.canReviewProduct(id as string);
        if (response.success && response.data) {
          setCanReview(response.data.canReview || false);
          setHasReviewed(!response.data.canReview && response.data.reason === 'already_reviewed');
        }
      }
    } catch (error) {
      console.error('Error checking review eligibility:', error);
    }
  };

  const handleAddPhoto = () => {
    Alert.alert('Add Photo', 'Camera/Gallery functionality would be implemented here');
  };

  const filteredAndSortedReviews = useMemo(() => {
    // Reviews are already filtered and sorted by the API
    return reviews;
  }, [reviews, sortBy, filterRating]);

  const averageRating = stats?.averageRating || 0;
  const totalReviewsCount = stats?.totalReviews || 0;
  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: stats?.ratingDistribution?.[rating as keyof typeof stats.ratingDistribution] || 0,
    percentage: totalReviewsCount > 0 
      ? ((stats?.ratingDistribution?.[rating as keyof typeof stats.ratingDistribution] || 0) / totalReviewsCount) * 100 
      : 0,
  }));

  const validateReviewForm = (): boolean => {
    const errors: Partial<ReviewForm> = {};
    
    if (reviewForm.rating === 0) {
      errors.rating = 'Please select a rating';
    }
    
    if (!reviewForm.title.trim()) {
      errors.title = 'Title is required';
    }
    
    if (!reviewForm.content.trim()) {
      errors.content = 'Review content is required';
    } else if (reviewForm.content.trim().length < 20) {
      errors.content = 'Review must be at least 20 characters';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitReview = async () => {
    if (!validateReviewForm()) return;

    setIsSubmitting(true);

    try {
      const reviewData: CreateReviewData = {
        productId: id as string,
        rating: typeof reviewForm.rating === 'string' ? Number(reviewForm.rating) : reviewForm.rating,
        title: reviewForm.title,
        content: reviewForm.content,
        images: reviewForm.images,
      };

      const response = await reviewService.createReview(reviewData);

      if (response.success) {
        setShowWriteReview(false);
        setReviewForm({ rating: 0, title: '', content: '', images: [] });
        setFormErrors({});
        Alert.alert('Success', 'Your review has been submitted!');
        
        // Refresh reviews and check eligibility
        await refresh();
        await checkReviewEligibility();
      } else {
        if (response.errors && response.errors.length > 0) {
          const fieldErrors: Partial<ReviewForm> = {};
          response.errors.forEach(error => {
            if (error.field === 'rating') fieldErrors.rating = error.message as any;
            if (error.field === 'title') fieldErrors.title = error.message;
            if (error.field === 'content') fieldErrors.content = error.message;
          });
          setFormErrors(fieldErrors);
        } else {
          Alert.alert('Error', response.message);
        }
      }
    } catch (error) {
      console.error('Submit review error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoteHelpful = (reviewId: string, isHelpful: boolean) => {
    if (!isAuthenticated) {
      Alert.alert(
        'Login Required',
        'Please login to vote on reviews.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => router.push('/(tabs)/auth/login') }
        ]
      );
      return;
    }

    reviewService.voteOnReview(reviewId, isHelpful)
      .then(response => {
        if (response.success) {
          // Refresh reviews to get updated vote counts
          refresh();
        } else {
          Alert.alert('Error', response.message);
        }
      })
      .catch(error => {
        console.error('Vote error:', error);
        Alert.alert('Error', 'Failed to record vote');
      });
  };

  const handleWriteReviewPress = () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Login Required',
        'Please login to write a review.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => router.push('/(tabs)/auth/login') }
        ]
      );
      return;
    }

    if (hasReviewed) {
      Alert.alert(
        'Already Reviewed',
        'You have already reviewed this product. You can edit your existing review from your profile.',
        [
          { text: 'OK', style: 'cancel' },
          { text: 'View Profile', onPress: () => router.push('/(tabs)/profile') }
        ]
      );
      return;
    }

    if (!canReview) {
      Alert.alert(
        'Cannot Review',
        'You need to purchase this product before you can write a review.',
        [{ text: 'OK' }]
      );
      return;
    }

    setShowWriteReview(true);
  };

  const handleCancelReview = () => {
    setShowWriteReview(false);
    setReviewForm({ rating: 0, title: '', content: '', images: [] });
    setFormErrors({});
  };

  const handleFilterChange = (newSortBy: typeof sortBy) => {
    setSortBy(newSortBy);
  };

  const handleRatingFilter = (rating: number) => {
    setFilterRating(filterRating === rating ? null : rating);
  };

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <Header
          title="Reviews"
          showBackButton
          onBackPress={() => router.back()}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Product not found</Text>
          <Button title="Go Back" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading && reviews.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Header
          title="Reviews"
          showBackButton
          onBackPress={() => router.back()}
        />
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  if (error && reviews.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Header
          title="Reviews"
          showBackButton
          onBackPress={() => router.back()}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Try Again" onPress={refresh} />
        </View>
      </SafeAreaView>
    );
  }

  const renderStarRating = (rating: number, size: number = 16, interactive: boolean = false) => {
    return (
      <View style={styles.starContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            disabled={!interactive}
            onPress={() => interactive && setReviewForm(prev => ({ ...prev, rating: star }))}
          >
            <Star
              size={size}
              color={star <= rating ? '#FFC107' : '#E2E8F0'}
              fill={star <= rating ? '#FFC107' : 'none'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderRatingDistribution = () => (
    <View style={styles.ratingDistribution}>
      <View style={styles.averageRating}>
        <Text style={styles.averageNumber}>{averageRating.toFixed(1)}</Text>
        {renderStarRating(Math.round(averageRating), 20)}
        <Text style={styles.totalReviews}>{totalReviewsCount} reviews</Text>
      </View>
      
      <View style={styles.distributionBars}>
        {ratingDistribution.map(({ rating, count, percentage }) => (
          <TouchableOpacity
            key={rating}
            style={styles.distributionRow}
            onPress={() => handleRatingFilter(rating)}
          >
            <Text style={styles.ratingNumber}>{rating}</Text>
            <Star size={12} color="#FFC107" fill="#FFC107" />
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${percentage}%` }]} />
            </View>
            <Text style={styles.ratingCount}>{count}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderReview = (review: Review) => (
    <View key={review.id} style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerInfo}>
          {review.userAvatar ? (
            <Image source={{ uri: review.userAvatar }} style={styles.reviewerAvatar} />
          ) : (
            <View style={styles.reviewerAvatarPlaceholder}>
              <Text style={styles.reviewerInitial}>
                {review.userName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.reviewerDetails}>
            <View style={styles.reviewerNameRow}>
              <Text style={styles.reviewerName}>{review.userName}</Text>
              {review.verified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>Verified Purchase</Text>
                </View>
              )}
            </View>
            <Text style={styles.reviewDate}>
              {new Date(review.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
        {renderStarRating(review.rating)}
      </View>
      
      <Text style={styles.reviewTitle}>{review.title}</Text>
      <Text style={styles.reviewContent}>{review.content}</Text>
      
      {review.images && review.images.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewImages}>
          {review.images.map((image, index) => (
            <Image key={index} source={{ uri: image }} style={styles.reviewImage} />
          ))}
        </ScrollView>
      )}
      
      <View style={styles.reviewActions}>
        <Text style={styles.helpfulText}>Was this helpful?</Text>
        <View style={styles.voteButtons}>
          <TouchableOpacity
            style={[
              styles.voteButton,
              review.userHasVoted === 'helpful' && styles.activeVoteButton,
            ]}
            onPress={() => handleVoteHelpful(review.id, true)}
          >
            <ThumbsUp 
              size={16} 
              color={review.userHasVoted === 'helpful' ? '#FFFFFF' : '#64748B'} 
            />
            <Text style={[
              styles.voteText,
              review.userHasVoted === 'helpful' && styles.activeVoteText,
            ]}>
              {review.helpful}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.voteButton,
              review.userHasVoted === 'not-helpful' && styles.activeVoteButton,
            ]}
            onPress={() => handleVoteHelpful(review.id, false)}
          >
            <ThumbsDown 
              size={16} 
              color={review.userHasVoted === 'not-helpful' ? '#FFFFFF' : '#64748B'} 
            />
            <Text style={[
              styles.voteText,
              review.userHasVoted === 'not-helpful' && styles.activeVoteText,
            ]}>
              {review.notHelpful}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

   const renderWriteReviewForm = () => (
    <View style={styles.writeReviewForm}>
      <Text style={styles.formTitle}>Write a Review</Text>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Rating *</Text>
        {renderStarRating(Number(reviewForm.rating), 24, true)}
        {formErrors.rating && <Text style={styles.errorText}>{formErrors.rating}</Text>}
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Review Title *</Text>
        <TextInput
          style={[styles.formInput, formErrors.title && styles.inputError]}
          value={reviewForm.title}
          onChangeText={(text) => {
            setReviewForm(prev => ({ ...prev, title: text }));
            if (formErrors.title) setFormErrors(prev => ({ ...prev, title: undefined }));
          }}
          placeholder="Summarize your experience"
          maxLength={100}
        />
        {formErrors.title && <Text style={styles.errorText}>{formErrors.title}</Text>}
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Your Review * (minimum 20 characters)</Text>
        <TextInput
          style={[styles.formTextArea, formErrors.content && styles.inputError]}
          value={reviewForm.content}
          onChangeText={(text) => {
            setReviewForm(prev => ({ ...prev, content: text }));
            if (formErrors.content) setFormErrors(prev => ({ ...prev, content: undefined }));
          }}
          placeholder="Share your thoughts about this product..."
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          maxLength={1000}
        />
        <Text style={styles.characterCount}>
          {reviewForm.content.length}/1000 characters
        </Text>
        {formErrors.content && <Text style={styles.errorText}>{formErrors.content}</Text>}
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Add Photos (Optional)</Text>
        <TouchableOpacity style={styles.photoUpload} onPress={handleAddPhoto}>
          <Camera size={24} color="#64748B" />
          <Text style={styles.photoUploadText}>Add photos to your review</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.formActions}>
        <Button title="Cancel" onPress={handleCancelReview} variant="outline" />
        <Button title="Submit Review" onPress={handleSubmitReview} loading={isSubmitting} />
      </View>
    </View>
  );


  
  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Reviews"
        showBackButton
        onBackPress={() => router.back()}
      />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            colors={['#2563EB']}
            tintColor="#2563EB"
          />
        }
      >
        {/* Product Info */}
        <View style={styles.productInfo}>
          <Image source={{ uri: product.image }} style={styles.productImage} />
          <View style={styles.productDetails}>
            <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
            <Text style={styles.productBrand}>{product.brand}</Text>
          </View>
        </View>

        {/* Rating Overview */}
        {totalReviewsCount > 0 && renderRatingDistribution()}

        {/* Controls */}
        <View style={styles.controls}>
          <View style={styles.controlsLeft}>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Filter size={16} color="#64748B" />
              <Text style={styles.filterButtonText}>Filter</Text>
              <ChevronDown size={16} color="#64748B" />
            </TouchableOpacity>
          </View>
          
          {canReview && !hasReviewed && (
            <Button
              title="Write Review"
              onPress={handleWriteReviewPress}
              size="small"
            />
          )}
        </View>

        {/* Filters */}
        {showFilters && (
          <View style={styles.filtersPanel}>
            <Text style={styles.filterTitle}>Sort by:</Text>
            <View style={styles.sortOptions}>
              {[
                { key: 'newest', label: 'Newest' },
                { key: 'oldest', label: 'Oldest' },
                { key: 'highest', label: 'Highest Rating' },
                { key: 'lowest', label: 'Lowest Rating' },
                { key: 'helpful', label: 'Most Helpful' },
              ].map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.sortOption,
                    sortBy === key && styles.activeSortOption,
                  ]}
                  onPress={() => handleFilterChange(key as any)}
                >
                  <Text style={[
                    styles.sortOptionText,
                    sortBy === key && styles.activeSortOptionText,
                  ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {filterRating && (
              <TouchableOpacity
                style={styles.clearFilter}
                onPress={() => setFilterRating(null)}
              >
                <X size={16} color="#EF4444" />
                <Text style={styles.clearFilterText}>Clear rating filter</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Write Review Form */}
        {showWriteReview && renderWriteReviewForm()}

        {/* Reviews List */}
        <View style={styles.reviewsList}>
          <Text style={styles.reviewsTitle}>
            {filteredAndSortedReviews.length} Review{filteredAndSortedReviews.length !== 1 ? 's' : ''}
            {filterRating && ` (${filterRating} star${filterRating !== 1 ? 's' : ''})`}
          </Text>
          
          {filteredAndSortedReviews.length === 0 ? (
            <View style={styles.noReviewsContainer}>
              <Text style={styles.noReviewsText}>
                {filterRating ? 'No reviews found for this rating' : 'No reviews yet'}
              </Text>
              <Text style={styles.noReviewsSubtext}>
                {filterRating 
                  ? 'Try selecting a different rating filter' 
                  : 'Be the first to review this product!'
                }
              </Text>
              {!filterRating && canReview && !hasReviewed && (
                <Button
                  title="Write First Review"
                  onPress={handleWriteReviewPress}
                  size="large"
                />
              )}
            </View>
          ) : (
            filteredAndSortedReviews.map(renderReview)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 20,
    textAlign: 'center',
  },
  productInfo: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  productDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 4,
  },
  productBrand: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  ratingDistribution: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  averageRating: {
    alignItems: 'center',
    marginBottom: 20,
  },
  averageNumber: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  totalReviews: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginTop: 8,
  },
  distributionBars: {
    gap: 8,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingNumber: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#1E293B',
    width: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFC107',
  },
  ratingCount: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    width: 20,
    textAlign: 'right',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  controlsLeft: {
    flex: 1,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignSelf: 'flex-start',
  },
  filterButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    marginHorizontal: 8,
  },
  filtersPanel: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 12,
  },
  sortOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sortOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeSortOption: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  sortOptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  activeSortOptionText: {
    color: '#FFFFFF',
  },
  clearFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  clearFilterText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#EF4444',
    marginLeft: 4,
  },
  writeReviewForm: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  formTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1E293B',
  },
  formTextArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1E293B',
    height: 120,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  characterCount: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'right',
    marginTop: 4,
  },
  photoUpload: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  photoUploadText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    marginLeft: 8,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  reviewsList: {
    padding: 20,
  },
  reviewsTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 16,
  },
  noReviewsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noReviewsText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 8,
  },
  noReviewsSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewerInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  reviewerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewerInitial: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  reviewerDetails: {
    marginLeft: 12,
    flex: 1,
  },
  reviewerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewerName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  verifiedBadge: {
    backgroundColor: '#10B981',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  verifiedText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  reviewDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  starContainer: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 23,
  },
  reviewTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 8,
  },
  reviewContent: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 12,
  },
  reviewImages: {
    marginBottom: 12,
  },
  reviewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
  },
  reviewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  helpfulText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  voteButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeVoteButton: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  voteText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    marginLeft: 4,
  },
    activeVoteText: {
      color: '#FFFFFF',
    },
  });
