import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AppProvider } from '@/context/AppContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import { LogBox } from 'react-native';


SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();
  
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ErrorBoundary>
      <AppProvider>
        <Stack screenOptions={{ headerShown: false }}>
          {/* Only the tabs route - everything else is inside tabs now */}
          <Stack.Screen name="(tabs)" />
        </Stack>
        <StatusBar style="auto" />
      </AppProvider>
    </ErrorBoundary>
  );
    useEffect(() => {
  LogBox.ignoreLogs(['The action \'POP_TO_TOP\' was not handled by any navigator']);
  }, []);
  useEffect(() => {
    const originalWarn = console.warn;
    const originalError = console.error;
    
    console.warn = (...args) => {
      if (args[0]?.includes?.('POP_TO_TOP')) {
        return;
      }
      originalWarn(...args);
    };
    
    console.error = (...args) => {
      if (args[0]?.includes?.('POP_TO_TOP')) {
        return;
      }
      originalError(...args);
    };
  }, []);
}