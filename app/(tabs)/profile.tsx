import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Settings, ShoppingBag, Heart, CircleHelp as HelpCircle, LogOut, ChevronRight, CircleUser as UserCircle, Bell, FileText, Shield } from 'lucide-react-native';
import { router } from 'expo-router';
import { useApp } from '@/context/AppContext';
import Button from '@/components/Button';
import { authService } from '@/services/authService';

const menuItems = [
  {
    id: 'user-profile',
    title: 'Edit Profile',
    icon: User,
    screen: '/user-profile',
    description: 'Manage your personal information'
  },
  {
    id: 'orders',
    title: 'My Orders',
    icon: ShoppingBag,
    screen: '/orders',
    description: 'View your order history'
  },
  {
    id: 'wishlist',
    title: 'Wishlist',
    icon: Heart,
    screen: '/wishlist',
    description: 'Your saved items'
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: Settings,
    screen: '/settings',
    description: 'App preferences'
  },
  {
    id: 'help',
    title: 'Help & Support',
    icon: HelpCircle,
    screen: '/help-support',
    description: 'Get help and support'
  },
  {
    id: 'terms',
    title: 'Terms of Service',
    icon: FileText,
    screen: '/terms-of-service',
    description: 'Read our terms'
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    icon: Shield,
    screen: '/privacy-policy',
    description: 'Read our privacy policy'
  },
];

export default function ProfileScreen() {
  const { state, dispatch } = useApp();

  const handleLogin = () => {
    router.push('/auth/login');
  };

  const handleSignup = () => {
    router.push('/auth/signup');
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.logout();
              dispatch({ type: 'SET_USER', payload: null });
              dispatch({ type: 'CLEAR_CART' });
              dispatch({ type: 'CLEAR_WISHLIST' });
            } catch (error) {
              console.error('Error logging out:', error);
            }
          }
        },
      ]
    );
  };

  const handleMenuPress = (screen: string) => {
    if (!state.user && !['help-support', 'terms-of-service', 'privacy-policy'].some(s => screen.includes(s))) {
      Alert.alert(
        'Login Required',
        'Please login to access this feature.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Login', 
            onPress: () => router.push('/auth/login')
          },
        ]
      );
      return;
    }
    
    router.push(screen as any);
  };

  if (!state.user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        <View style={styles.loginPrompt}>
          <UserCircle size={80} color="#CBD5E1" />
          <Text style={styles.loginTitle}>Welcome to One Tech</Text>
          <Text style={styles.loginSubtitle}>
            Login or create an account to access your profile, orders, and more
          </Text>
          
          <View style={styles.loginButtons}>
            <Button
              title="Login"
              onPress={handleLogin}
              fullWidth
              size="large"
            />
            <Button
              title="Sign Up"
              onPress={handleSignup}
              variant="outline"
              fullWidth
              size="large"
            />
          </View>
        </View>

        {/* Guest Menu Items */}
        <View style={styles.guestMenu}>
          {menuItems.filter(item => ['help', 'terms', 'privacy'].includes(item.id)).map((item) => (
            <TouchableOpacity 
              key={item.id}
              style={styles.menuItem}
              onPress={() => handleMenuPress(item.screen)}
            >
              <item.icon size={24} color="#64748B" />
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemTitle}>{item.title}</Text>
                <Text style={styles.menuItemDescription}>{item.description}</Text>
              </View>
              <ChevronRight size={20} color="#CBD5E1" />
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* User Info */}
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <User size={32} color="#2563EB" />
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{state.user.name}</Text>
            <Text style={styles.userEmail}>{state.user.email}</Text>
            {state.user.phone && (
              <Text style={styles.userPhone}>{state.user.phone}</Text>
            )}
            {state.user.isEmailVerified !== undefined && (
              <View style={styles.verificationStatus}>
                <View style={[
                  styles.verificationDot,
                  { backgroundColor: state.user.isEmailVerified ? '#10B981' : '#F59E0B' }
                ]} />
                <Text style={[
                  styles.verificationText,
                  { color: state.user.isEmailVerified ? '#10B981' : '#F59E0B' }
                ]}>
                  {state.user.isEmailVerified ? 'Email Verified' : 'Verified'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menu}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => handleMenuPress(item.screen)}
            >
              <item.icon size={24} color="#64748B" />
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemTitle}>{item.title}</Text>
                <Text style={styles.menuItemDescription}>{item.description}</Text>
              </View>
              <ChevronRight size={20} color="#CBD5E1" />
            </TouchableOpacity>
          ))}
          
          {/* Logout */}
          <TouchableOpacity style={styles.logoutItem} onPress={handleLogout}>
            <LogOut size={24} color="#EF4444" />
            <View style={styles.menuItemContent}>
              <Text style={styles.logoutText}>Logout</Text>
              <Text style={styles.menuItemDescription}>Sign out of your account</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>One Tech v1.2</Text>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
  },
  
  // Login prompt styles
  loginPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loginTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginTop: 24,
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  loginButtons: {
    width: '100%',
    gap: 12,
  },
  guestMenu: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  // User info styles
  userInfo: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginBottom: 8,
  },
  verificationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  verificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  verificationText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },

  // Menu styles
  menu: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuItemContent: {
    flex: 1,
    marginLeft: 16,
  },
  menuItemTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 4,
  },
  menuItemDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  logoutText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
    marginBottom: 4,
  },

  // App info
  appInfo: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  appInfoText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
    marginBottom: 4,
  },
});