import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Image, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet,
  Dimensions,
  Alert,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Star, Heart, Share, ShoppingCart, ChevronRight } from 'lucide-react-native';
import { useApp, isInWishlist } from '@/context/AppContext';
import { useProduct } from '@/hooks/useProduct';
import Button from '@/components/Button';
import LoadingSpinner from '@/components/LoadingSpinner';
import WishlistButton from '@/components/WishlistButton';
import CartButton from '@/components/CartButton';

const { width } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const { dispatch } = useApp();
  const { product, isLoading, error, refresh } = useProduct(id as string);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const { state } = useApp();
  const inWishlist = product ? isInWishlist(state.wishlist, product.id) : false;

  // Show loading spinner while fetching product
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1E293B" />
          </TouchableOpacity>
        </View>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }
  // Show error state
  if (error || !product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1E293B" />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Product not found'}</Text>
          <View style={styles.errorActions}>
            <Button title="Try Again" onPress={refresh} variant="outline" />
            <Button title="Go Back" onPress={() => router.back()} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const handleCartSuccess = () => {
    Alert.alert(
      'Added to Cart',
      `${quantity} ${product.name}${quantity > 1 ? 's' : ''} added to cart!`,
      [
        { text: 'Continue Shopping', style: 'cancel' },
        { 
          text: 'View Cart', 
          onPress: () => router.push('/(tabs)/cart')
        },
      ]
    );
  };

  const handleShare = async () => {
    const shareContent = {
      title: product.name,
      message: `Check out this amazing ${product.name} for $${product.price}! ${product.description.substring(0, 100)}... Available at One Tech.`,
      url: `https://onetech.com/product/${product.id}`, // Replace with your actual domain
    };

    if (Platform.OS === 'web') {
      // Web sharing using Web Share API or fallback
      if (navigator.share) {
        try {
          await navigator.share({
            title: shareContent.title,
            text: shareContent.message,
            url: shareContent.url,
          });
        } catch (error) {
          // Fallback for web
          copyToClipboard(shareContent.message + ' ' + shareContent.url);
        }
      } else {
        // Fallback: copy to clipboard
        copyToClipboard(shareContent.message + ' ' + shareContent.url);
      }
    } else {
      // React Native Share (would need expo-sharing for mobile)
      Alert.alert('Share Product', shareContent.message);
    }
  };

  const copyToClipboard = (text: string) => {
    if (Platform.OS === 'web') {
      navigator.clipboard.writeText(text).then(() => {
        Alert.alert('Copied', 'Product link copied to clipboard!');
      }).catch(() => {
        Alert.alert('Error', 'Failed to copy to clipboard');
      });
    }
  };

  const images = product.images || [product.image];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <WishlistButton 
            product={product}
            size={24}
            style={styles.headerButton}
          />
          <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
            <Share size={24} color="#64748B" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Product Images */}
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: images[selectedImageIndex] }} 
            style={styles.mainImage}
            resizeMode="cover"
          />
          {!product.inStock && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockText}>Out of Stock</Text>
            </View>
          )}
          
          {/* Image Indicators */}
          {images.length > 1 && (
            <View style={styles.imageIndicators}>
              {images.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.indicator,
                    selectedImageIndex === index && styles.activeIndicator
                  ]}
                  onPress={() => setSelectedImageIndex(index)}
                />
              ))}
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.productInfo}>
          <View style={styles.brandRow}>
            <Text style={styles.brand}>{product.brand}</Text>
            <View style={styles.ratingContainer}>
              <Star size={16} color="#FFC107" fill="#FFC107" />
              <Text style={styles.rating}>{product.rating.toFixed(1)}</Text>
              <Text style={styles.reviews}>({product.reviews} reviews)</Text>
            </View>
          </View>
          
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.price}>${product.price.toFixed(2)}</Text>
          
          <View style={styles.stockStatus}>
            <View style={[
              styles.stockIndicator,
              { backgroundColor: product.inStock ? '#10B981' : '#EF4444' }
            ]} />
            <Text style={[
              styles.stockText,
              { color: product.inStock ? '#10B981' : '#EF4444' }
            ]}>
              {product.inStock ? 'In Stock' : 'Out of Stock'}
            </Text>
            {inWishlist && (
              <View style={styles.wishlistIndicator}>
                <Heart size={14} color="#EF4444" fill="#EF4444" />
                <Text style={styles.wishlistText}>In Wishlist</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category</Text>
            <View style={styles.categoryTag}>
              <Text style={styles.categoryText}>{product.category}</Text>
            </View>
          </View>

          {/* Share Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer Reviews</Text>
            <TouchableOpacity 
              style={styles.reviewsButton} 
              onPress={() => router.push(`/product-reviews/${product.id}`)}
            >
              <View style={styles.reviewsInfo}>
                <View style={styles.ratingContainer}>
                  <Star size={16} color="#FFC107" fill="#FFC107" />
                  <Text style={styles.rating}>{product.rating}</Text>
                  <Text style={styles.reviews}>({product.reviews} reviews)</Text>
                </View>
                <Text style={styles.reviewsText}>See all reviews</Text>
              </View>
              <ChevronRight size={20} color="#64748B" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Share size={20} color="#2563EB" />
              <Text style={styles.shareButtonText}>Share with friends</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.quantityContainer}>
          <Text style={styles.quantityLabel}>Qty:</Text>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Text style={styles.quantityButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.quantity}>{quantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity(quantity + 1)}
            >
              <Text style={styles.quantityButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <CartButton
          product={product}
          quantity={quantity} // Pass the current quantity
          onAddToCart={handleCartSuccess}
          showQuantity={false} // Don't show internal quantity controls
          style={styles.cartButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  imageContainer: {
    position: 'relative',
    height: width,
    backgroundColor: '#F8FAFC',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outOfStockText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    backgroundColor: '#EF4444',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  activeIndicator: {
    backgroundColor: '#FFFFFF',
  },
  productInfo: {
    padding: 20,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  brand: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginLeft: 4,
  },
  reviews: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginLeft: 4,
  },
  productName: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 8,
    lineHeight: 32,
  },
  price: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#2563EB',
    marginBottom: 16,
  },
  stockStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 12,
  },
  stockIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  stockText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  wishlistIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  wishlistText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#EF4444',
    marginLeft: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    lineHeight: 24,
  },
  categoryTag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#2563EB',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  shareButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#2563EB',
    marginLeft: 8,
  },
  reviewsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  reviewsInfo: {
    flex: 1,
  },
  reviewsText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#2563EB',
    marginTop: 4,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 16,
    minHeight: 80,
    paddingBottom: Platform.OS === 'ios' ? 16 : 16,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    marginRight: 12,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  quantityButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
  },
  quantity: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginHorizontal: 16,
    minWidth: 20,
    textAlign: 'center',
  },
  cartButton: {
    minWidth: 150,
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
  errorActions: {
    flexDirection: 'row',
    gap: 12,
  },
});