import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { RootStackParamList } from '../types';
import AuthNavigator from './AuthNavigator';
import TabNavigator from './TabNavigator';
import PairLinkScreen from '../screens/auth/PairLinkScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { user, family, loading } = useAuth();

  if (loading) return null;

  // Not authenticated
  if (!user) {
    return <AuthNavigator />;
  }

  // Authenticated but not paired — show pair linking screen
  if (!user.familyId && !family) {
    return <PairLinkScreen />;
  }

  // Fully authenticated and paired
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={TabNavigator} />
    </Stack.Navigator>
  );
}
