import React, { useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet,
  TextInput,
  Image,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Search, Package, Truck, CircleCheck as CheckCircle, Circle as XCircle, RotateCcw } from 'lucide-react-native';
import { useApp } from '@/context/AppContext';
import Header from '@/components/Header';
import Button from '@/components/Button';
import LoadingSpinner from '@/components/LoadingSpinner';
import { orderService, Order } from '@/services/orderService';


export default function OrdersScreen() {
  const { state } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'recent' | 'past' | 'cancelled'>('all');
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    loadUserOrders();
  }, []);

  const loadUserOrders = async () => {
    if (!state.user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await orderService.getUserOrders(1, 50);
      
      if (response.success && response.data?.orders) {
        setOrders(response.data.orders);
      } else {
        setError(response.message || 'Failed to load orders');
        setOrders([]);
      }
    } catch (error) {
      console.error('Error loading user orders:', error);
      setError('Network error. Please check your connection.');
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadUserOrders();
    setIsRefreshing(false);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.items.some(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFilter = filter === 'all' || 
                         (filter === 'recent' && ['pending', 'processing', 'shipped'].includes(order.status)) ||
                         (filter === 'past' && order.status === 'delivered') ||
                         (filter === 'cancelled' && order.status === 'cancelled');
    
    return matchesSearch && matchesFilter;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Package size={20} color="#F59E0B" />;
      case 'processing':
        return <RotateCcw size={20} color="#2563EB" />;
      case 'shipped':
        return <Truck size={20} color="#8B5CF6" />;
      case 'delivered':
        return <CheckCircle size={20} color="#10B981" />;
      case 'cancelled':
        return <XCircle size={20} color="#EF4444" />;
      default:
        return <Package size={20} color="#64748B" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#F59E0B';
      case 'processing':
        return '#2563EB';
      case 'shipped':
        return '#8B5CF6';
      case 'delivered':
        return '#10B981';
      case 'cancelled':
        return '#EF4444';
      default:
        return '#64748B';
    }
  };

  const handleReorder = (order: Order) => {
    // Add all items from the order to cart
    order.items.forEach(item => {
      const product = state.products.find(p => p.id === item.productId);
      if (product) {
        for (let i = 0; i < item.quantity; i++) {
          // Note: This would need to be implemented with the cart service
          console.log('Reorder functionality needs cart service integration');
        }
      }
    });
    router.push('/(tabs)/cart');
  };

  // Show login prompt if user is not authenticated
  if (!state.user) {
    return (
      <SafeAreaView style={styles.container}>
        <Header
          title="My Orders"
          showBackButton
          onBackPress={() => router.back()}
        />
        <View style={styles.loginPromptContainer}>
          <Package size={64} color="#CBD5E1" />
          <Text style={styles.loginPromptTitle}>Login Required</Text>
          <Text style={styles.loginPromptSubtitle}>
            Please login to view your order history
          </Text>
          <Button
            title="Login"
            onPress={() => router.push('/auth/login')}
            size="large"
          />
        </View>
      </SafeAreaView>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header
          title="My Orders"
          showBackButton
          onBackPress={() => router.back()}
        />
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  // Show error state
  if (error && orders.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Header
          title="My Orders"
          showBackButton
          onBackPress={() => router.back()}
        />
        <View style={styles.errorContainer}>
          <Package size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Unable to Load Orders</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <Button
            title="Try Again"
            onPress={loadUserOrders}
            size="large"
          />
        </View>
      </SafeAreaView>
    );
  }
  const renderOrderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity 
      style={styles.orderCard}
      onPress={() => router.push(`/order-details/${item.id}`)}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderId}>{item.orderNumber}</Text>
          <Text style={styles.orderDate}>
            {new Date(item.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
          {getStatusIcon(item.status)}
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.orderItems}>
        {item.items.slice(0, 2).map((orderItem, index) => (
          <View key={`${item.id}-${orderItem.productId}-${index}`} style={styles.orderItemRow}>
            <Image source={{ uri: orderItem.image || 'https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg?auto=compress&cs=tinysrgb&w=400' }} style={styles.itemImage} />
            <View style={styles.itemDetails}>
              <Text style={styles.itemName} numberOfLines={1}>{orderItem.name}</Text>
              <Text style={styles.itemPrice}>
                ${orderItem.price} × {orderItem.quantity}
              </Text>
            </View>
          </View>
        ))}
        {item.items.length > 2 && (
          <Text style={styles.moreItems}>
            +{item.items.length - 2} more item{item.items.length - 2 > 1 ? 's' : ''}
          </Text>
        )}
      </View>

      <View style={styles.orderFooter}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total: </Text>
          <Text style={styles.totalAmount}>${item.pricing.total.toFixed(2)}</Text>
        </View>
        
        <View style={styles.orderActions}>
          {item.status === 'delivered' && (
            <Button
              title="Reorder"
              onPress={() => handleReorder(item)}
              variant="outline"
              size="small"
            />
          )}
          {(item.status === 'shipped' || item.status === 'processing') && item.tracking?.trackingNumber && (
            <Button
              title="Track"
              onPress={() => console.log('Track order')}
              variant="outline"
              size="small"
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="My Orders"
        showBackButton
        onBackPress={() => router.back()}
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search orders..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#64748B"
          />
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {[
          { key: 'all', label: 'All' },
          { key: 'recent', label: 'Recent' },
          { key: 'past', label: 'Past' },
          { key: 'cancelled', label: 'Cancelled' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.filterTab, filter === tab.key && styles.activeFilterTab]}
            onPress={() => setFilter(tab.key as any)}
          >
            <Text style={[styles.filterTabText, filter === tab.key && styles.activeFilterTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Package size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No orders found</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery ? 'Try adjusting your search' : 'Start shopping to see your orders here'}
          </Text>
          {!searchQuery && (
            <Button
              title="Start Shopping"
              onPress={() => router.push('/(tabs)/search')}
              size="large"
            />
          )}
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.ordersList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#2563EB']}
              tintColor="#2563EB"
            />
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Package size={64} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No orders found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? 'Try adjusting your search' : 'You haven\'t placed any orders yet'}
              </Text>
              {!searchQuery && (
                <Button
                  title="Start Shopping"
                  onPress={() => router.push('/(tabs)/search')}
                  size="large"
                />
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1E293B',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeFilterTab: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterTabText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  activeFilterTabText: {
    color: '#FFFFFF',
  },
  ordersList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  orderCard: {
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
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 4,
  },
  orderItems: {
    marginBottom: 16,
  },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#1E293B',
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  moreItems: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    fontStyle: 'italic',
    marginLeft: 52,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  totalAmount: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
  },
  orderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
  },
  loginPromptContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  loginPromptTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginTop: 20,
    marginBottom: 8,
  },
  loginPromptSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginTop: 20,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
  },
});