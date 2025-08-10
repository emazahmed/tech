import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  FlatList, 
  RefreshControl, 
  StyleSheet, 
  Text,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { CircleAlert as AlertCircle, RefreshCw } from 'lucide-react-native';
import ProductCard from '@/components/ProductCard';
import { useProducts } from '@/hooks/useProducts';
import { ProductFilters } from '@/services/productService';
import Button from '@/components/Button';

interface ProductListProps {
  filters?: ProductFilters;
  layout?: 'grid' | 'list';
  numColumns?: number;
  showLoadMore?: boolean;
  onProductPress?: (productId: string) => void;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
  ListFooterComponent?: React.ComponentType<any> | React.ReactElement | null;
  contentContainerStyle?: any;
}

export default function ProductList({
  filters = {},
  layout = 'grid',
  numColumns = 2,
  showLoadMore = true,
  onProductPress,
  ListHeaderComponent,
  ListFooterComponent,
  contentContainerStyle,
}: ProductListProps) {
  const {
    products,
    isLoading,
    isRefreshing,
    error,
    hasMore,
    refresh,
    loadMore,
    filterProducts,
    clearError,
  } = useProducts({
    initialFilters: filters,
    enablePagination: showLoadMore,
    enableCache: true,
  });

  // Create a stable reference for filters to avoid unnecessary re-renders
  const memoizedFilters = useMemo(() => filters, [
    filters.search,
    filters.category,
    filters.minPrice,
    filters.maxPrice,
    filters.sortBy,
    filters.sortOrder,
    // Add other filter properties that you use
  ]);

  // Update filters when props change
  useEffect(() => {
    filterProducts(memoizedFilters);
  }, [memoizedFilters, filterProducts]);

  const handleRefresh = async () => {
    clearError();
    await refresh();
  };

  const handleLoadMore = async () => {
    if (hasMore && !isLoading && !isRefreshing) {
      await loadMore();
    }
  };

  const renderProduct = ({ item, index }: { item: any; index: number }) => (
    <View style={layout === 'grid' ? styles.gridItem : styles.listItem}>
      <ProductCard 
        product={item} 
        layout={layout}
        showWishlistButton={true}
        showShareButton={false}
        onPress={onProductPress}
      />
    </View>
  );

  const renderLoadMoreButton = () => {
    if (!showLoadMore || !hasMore || isLoading) return null;

    return (
      <View style={styles.loadMoreContainer}>
        <Button
          title="Load More Products"
          onPress={handleLoadMore}
          variant="outline"
          size="large"
        />
      </View>
    );
  };

  const renderLoadingFooter = () => {
    if (!isLoading || isRefreshing) return null;

    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color="#2563EB" />
        <Text style={styles.loadingText}>Loading more products...</Text>
      </View>
    );
  };

  const renderError = () => {
    if (!error) return null;

    return (
      <View style={styles.errorContainer}>
        <AlertCircle size={48} color="#EF4444" />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <RefreshCw size={20} color="#2563EB" />
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No products found</Text>
      <Text style={styles.emptySubtitle}>
        {filters.search 
          ? `No results found for "${filters.search}"`
          : "Try adjusting your search or filters"
        }
      </Text>
      <Button
        title="Refresh"
        onPress={handleRefresh}
        size="large"
      />
    </View>
  );

  if (isLoading && products.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>
          {filters.search ? `Searching for "${filters.search}"...` : 'Loading products...'}
        </Text>
      </View>
    );
  }

  if (error && products.length === 0) {
    return renderError();
  }

  return (
    <View style={styles.container}>
      {error && products.length > 0 && (
        <View style={styles.errorBanner}>
          <AlertCircle size={16} color="#F59E0B" />
          <Text style={styles.errorBannerText}>{error}</Text>
          <TouchableOpacity onPress={clearError}>
            <Text style={styles.dismissText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        numColumns={layout === 'grid' ? numColumns : 1}
        key={`${layout}-${numColumns}`}
        contentContainerStyle={[
          styles.listContainer,
          contentContainerStyle,
        ]}
        columnWrapperStyle={layout === 'grid' && numColumns > 1 ? styles.row : undefined}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#2563EB']}
            tintColor="#2563EB"
          />
        }
        onEndReached={showLoadMore ? handleLoadMore : undefined}
        onEndReachedThreshold={0.1}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={
          <>
            {ListFooterComponent}
            {renderLoadingFooter()}
            {renderLoadMoreButton()}
          </>
        }
        ListEmptyComponent={renderEmptyList}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
  },
  gridItem: {
    flex: 1,
    marginHorizontal: 4,
    marginBottom: 16,
  },
  listItem: {
    width: '100%',
    marginBottom: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginTop: 12,
  },
  loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  retryText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#2563EB',
    marginLeft: 8,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  errorBannerText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#92400E',
    marginLeft: 8,
  },
  dismissText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#D97706',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  debugContainer: {
    backgroundColor: '#F3F4F6',
    padding: 8,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 4,
  },
  debugText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
});