import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Home, ShoppingBag, Briefcase, Landmark, History as HistoryIcon, Shield, Activity } from 'lucide-react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { WalletProvider, useWallet } from './src/context/WalletContext';
import HomeScreen from './src/screens/HomeScreen';
import MarketScreen from './src/screens/MarketScreen';
import PortfolioScreen from './src/screens/PortfolioScreen';
import AuctionsScreen from './src/screens/AuctionsScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import AdminScreen from './src/screens/AdminScreen';
import ErrorBoundary from './src/components/ErrorBoundary';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  const { isAdmin, isConnected } = useWallet();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: any }) => ({
        headerShown: true,
        tabBarActiveTintColor: isDarkMode ? '#818cf8' : '#4f46e5',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
          borderTopColor: isDarkMode ? '#1e293b' : '#e2e8f0',
        },
        headerStyle: {
          backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
        },
        headerTitleStyle: {
          color: isDarkMode ? '#f8fafc' : '#1e293b',
        },
        tabBarIcon: ({ color, size }: { color: string; size: number }) => {
          if (route.name === 'Home') return <Home color={color} size={size} />;
          if (route.name === 'Market') return <ShoppingBag color={color} size={size} />;
          if (route.name === 'Portfolio') return <Briefcase color={color} size={size} />;
          if (route.name === 'Activity') return <Activity color={color} size={size} />;
          if (route.name === 'Admin') return <Shield color={color} size={size} />;
          return null;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="Market" component={MarketScreen} options={{ title: 'Market' }} />
      <Tab.Screen name="Portfolio" component={PortfolioScreen} options={{ title: 'Portfolio' }} />
      <Tab.Screen name="Activity" component={HistoryScreen} options={{ title: 'Activity' }} />
      {isConnected && isAdmin && (
        <Tab.Screen name="Admin" component={AdminScreen} options={{ title: 'Admin' }} />
      )}
    </Tab.Navigator>
  );
}

function Navigation() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  return (
    <NavigationContainer theme={isDarkMode ? DarkTheme : DefaultTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        <Stack.Screen 
          name="Auctions" 
          component={AuctionsScreen} 
          options={{ 
            headerShown: true,
            title: 'Auctions',
            headerStyle: {
              backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
            },
            headerTitleStyle: {
              color: isDarkMode ? '#f8fafc' : '#1e293b',
            },
            headerTintColor: isDarkMode ? '#818cf8' : '#4f46e5',
          }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <ErrorBoundary>
      <WalletProvider>
        <SafeAreaProvider>
          <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
          <Navigation />
        </SafeAreaProvider>
      </WalletProvider>
    </ErrorBoundary>
  );
}

export default App;
