import React from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Package, ShoppingCart, Plus, LogOut, TrendingUp, Users, DollarSign, Calendar } from 'lucide-react-native';
import { orderService } from '@/services/orderService';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function AdminDashboardScreen() {
  const [orderStats, setOrderStats] = React.useState<any>(null);
  const [recentOrders, setRecentOrders] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  React.useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Load order statistics
      const statsResponse = await orderService.getOrderStats();
      if (statsResponse.success && statsResponse.data) {
        setOrderStats(statsResponse.data);
      }
      
      // Load recent orders
      const ordersResponse = await orderService.getRecentOrders(5);
      if (ordersResponse.success && ordersResponse.data?.orders) {
        setRecentOrders(ordersResponse.data.orders);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboardData();
    setIsRefreshing(false);
  };

  const handleLogout = async () => {
    try {
      router.replace('/admin/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const adminActions = [
    {
      id: 'add-product',
      title: 'Add Product',
      subtitle: 'Create new product',
      icon: Plus,
      color: '#10B981',
      onPress: () => router.push('/admin/products/add'),
    },
    {
      id: 'manage-products',
      title: 'Manage Products',
      subtitle: 'View and edit products',
      icon: Package,
      color: '#2563EB',
      onPress: () => router.push('/admin/products'),
    },
    {
      id: 'manage-orders',
      title: 'Manage Orders',
      subtitle: 'Process customer orders',
      icon: ShoppingCart,
      color: '#F59E0B',
      onPress: () => router.push('/admin/orders'),
    },
  ];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Admin Panel</Text>
            <Text style={styles.subtitle}>Manage your store</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Admin Panel</Text>
          <Text style={styles.subtitle}>Manage your store</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#2563EB']}
            tintColor="#2563EB"
          />
        }
      >
        {/* Dashboard Statistics */}
        {orderStats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: '#2563EB20' }]}>
                  <Package size={24} color="#2563EB" />
                </View>
                <Text style={styles.statNumber}>{orderStats.overview?.totalOrders || 0}</Text>
                <Text style={styles.statLabel}>Total Orders</Text>
              </View>
              
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: '#10B98120' }]}>
                  <DollarSign size={24} color="#10B981" />
                </View>
                <Text style={styles.statNumber}>
                  ${(orderStats.overview?.totalRevenue || 0).toFixed(0)}
                </Text>
                <Text style={styles.statLabel}>Revenue</Text>
              </View>
              
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: '#F59E0B20' }]}>
                  <TrendingUp size={24} color="#F59E0B" />
                </View>
                <Text style={styles.statNumber}>
                  ${(orderStats.overview?.averageOrderValue || 0).toFixed(0)}
                </Text>
                <Text style={styles.statLabel}>Avg Order</Text>
              </View>
              
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: '#8B5CF620' }]}>
                  <Calendar size={24} color="#8B5CF6" />
                </View>
                <Text style={styles.statNumber}>{orderStats.overview?.recentOrders || 0}</Text>
                <Text style={styles.statLabel}>This Month</Text>
              </View>
            </View>
          </View>
        )}

        {/* Recent Orders */}
        {recentOrders.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Orders</Text>
              <TouchableOpacity onPress={() => router.push('/admin/orders')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.recentOrdersContainer}>
              {recentOrders.slice(0, 3).map((order) => (
                <TouchableOpacity
                  key={order.id}
                  style={styles.recentOrderCard}
                  onPress={() => router.push(`/admin/orders/${order.id}`)}
                >
                  <View style={styles.recentOrderHeader}>
                    <Text style={styles.recentOrderId}>{order.orderNumber}</Text>
                    <Text style={styles.recentOrderAmount}>${order.pricing.total.toFixed(2)}</Text>
                  </View>
                  <Text style={styles.recentOrderCustomer}>{order.customerInfo.name}</Text>
                  <View style={styles.recentOrderFooter}>
                    <Text style={styles.recentOrderDate}>
                      {new Date(order.createdAt).toLocaleDateString()}
                    </Text>
                    <View style={[styles.recentOrderStatus, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                      <Text style={[styles.recentOrderStatusText, { color: getStatusColor(order.status) }]}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Admin Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {adminActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionCard}
                onPress={action.onPress}
              >
                <View style={[styles.actionIcon, { backgroundColor: `${action.color}20` }]}>
                  <action.icon size={32} color={action.color} />
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  greeting: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginTop: 4,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
  },
  section: {
    marginTop:0,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 16,
  },
  actionsGrid: {
    gap: 16,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  actionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 4,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#2563EB',
  },
  recentOrdersContainer: {
    gap: 12,
  },
  recentOrderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  recentOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recentOrderId: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  recentOrderAmount: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#2563EB',
  },
  recentOrderCustomer: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginBottom: 8,
  },
  recentOrderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentOrderDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
  },
  recentOrderStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recentOrderStatusText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
  },
});