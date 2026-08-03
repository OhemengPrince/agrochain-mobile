import React from 'react';
import { useAuth } from '../hooks/useAuth';
import LoadingOverlay from '../components/LoadingOverlay';
import AuthNavigator from './AuthNavigator';
import FarmerNavigator from './FarmerNavigator';
import OwnerNavigator from './OwnerNavigator';
import BuyerNavigator from './BuyerNavigator';
// GeneralUserNavigator is no longer routed to — GENERAL merged into BUYER.
// File intentionally kept (not deleted) in case it's needed again.

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
    case 'GENERAL':
      // GENERAL role was merged into BUYER — existing GENERAL accounts
      // keep working by routing into the same navigator.
      return <BuyerNavigator />;
    default:
      return <AuthNavigator />;
  }
}
