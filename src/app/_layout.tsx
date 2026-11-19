
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  router,
  useRouter,
  useSegments,
} from 'expo-router';

import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';

import { useColorScheme } from 'react-native';
import { useEffect } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { user, loading } = useAuth();

  const segments = useSegments();
  const navigation = useRouter();

  // Protect the app routes based on login status.
  useEffect(() => {
    if (loading) {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      navigation.replace('/(auth)');
    } else if (user && inAuthGroup) {
      navigation.replace('/(tabs)');
    }
  }, [user, loading, segments, navigation]);

  if (loading) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Preserve notification navigation.
  useEffect(() => {
    const subscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;

        const purchaseId = data?.purchaseId;

        if (typeof purchaseId === 'string') {
          router.push(`/purchase/${purchaseId}`);
        }
      });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />

        <RootNavigator />
      </ThemeProvider>
    </AuthProvider>
  );
}
