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
    // Ignore LogBox warnings
    LogBox.ignoreLogs([
      'The action \'POP_TO_TOP\' was not handled by any navigator',
      'POP_TO_TOP'
    ]);
    
    // Override console methods to filter out POP_TO_TOP messages
    const originalWarn = console.warn;
    const originalError = console.error;
   
    console.warn = (...args) => {
      const message = args.join(' ').toString();
      if (message.includes('POP_TO_TOP')) {
        return;
      }
      originalWarn(...args);
    };
   
    console.error = (...args) => {
      const message = args.join(' ').toString();
      if (message.includes('POP_TO_TOP')) {
        return;
      }
      originalError(...args);
    };
  
    // Also override console.log in case it's being logged there
    const originalLog = console.log;
    console.log = (...args) => {
      const message = args.join(' ').toString();
      if (message.includes('POP_TO_TOP')) {
        return;
      }
      originalLog(...args);
    };
  }, []);
  
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
          <Stack.Screen name="(tabs)" />
        </Stack>
        <StatusBar style="auto" />
      </AppProvider>
    </ErrorBoundary>
  );

}