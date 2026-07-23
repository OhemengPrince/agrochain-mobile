import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../types';
import { stackHeaderOptions } from './navigatorTheme';
import SplashScreen from '../screens/auth/SplashScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import CreateAccountScreen from '../screens/auth/CreateAccountScreen';
import OtpVerifyScreen from '../screens/auth/OtpVerifyScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import RoleSelectionScreen from '../screens/auth/RoleSelectionScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CreateAccount" component={CreateAccountScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="OtpVerify"
        component={OtpVerifyScreen}
        options={{ ...stackHeaderOptions, title: 'Verify OTP' }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ ...stackHeaderOptions, title: 'Forgot Password' }}
      />
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{ ...stackHeaderOptions, title: 'Reset Password' }}
      />
      <Stack.Screen
        name="RoleSelection"
        component={RoleSelectionScreen}
        options={{ ...stackHeaderOptions, title: 'Complete Your Profile', headerBackVisible: false }}
      />
    </Stack.Navigator>
  );
}
