import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';


export default function AdminLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const adminSession = await AsyncStorage.getItem('adminSession');
      if (adminSession) {
        const session = JSON.parse(adminSession);
        // Check if session is still valid (e.g., not expired)
        const loginTime = new Date(session.loginTime);
        const now = new Date();
        const hoursSinceLogin = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceLogin < 24) { // Session valid for 24 hours
          setIsAuthenticated(true);
        } else {
          await AsyncStorage.removeItem('adminSession');
          setIsAuthenticated(false);
          router.replace('/admin/login');
        }
      } else {
        setIsAuthenticated(false);
        router.replace('/admin/login');
      }
    } catch (error) {
      setIsAuthenticated(false);
      router.replace('/admin/login');
    }
  };

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="products/index" />
      <Stack.Screen name="products/add" />
      <Stack.Screen name="products/edit/[id]" />
      <Stack.Screen name="orders/index" />
      <Stack.Screen name="orders/[id]" />
    </Stack>
  );
}