import React from 'react';
import { useAuth } from '../hooks/useAuth';
import LoadingOverlay from '../components/LoadingOverlay';
import AuthNavigator from './AuthNavigator';
import FarmerNavigator from './FarmerNavigator';
import OwnerNavigator from './OwnerNavigator';
import BuyerNavigator from './BuyerNavigator';

export default function RootNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingOverlay message="Loading AgroChain..." />;
  }

  if (!user) {
    return <AuthNavigator />;
  }

  switch (user.role) {
    case 'FARMER':
      return <FarmerNavigator />;
    case 'EQUIPMENT_OWNER':
      return <OwnerNavigator />;
    case 'BUYER':
      return <BuyerNavigator />;
    default:
      return <AuthNavigator />;
  }
}
