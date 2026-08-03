import { useEffect } from 'react';
import { NavigationProp } from '@react-navigation/native';

// Settings screens (Personal Information, Change Password, etc.) render as
// full-screen overlays rather than pushed navigator routes, so the bottom
// tab bar's own route-based visibility logic (getTabBarStyleForRoute) never
// sees them and the tab bar stays visible underneath. This imperatively
// hides/restores the parent Tab.Navigator's tab bar for the lifetime of the
// condition instead.
export function useHideTabBarWhen(navigation: NavigationProp<any>, hidden: boolean) {
  useEffect(() => {
    const parent = navigation.getParent();
    parent?.setOptions({ tabBarStyle: hidden ? { display: 'none' } : undefined });
    return () => {
      parent?.setOptions({ tabBarStyle: undefined });
    };
  }, [navigation, hidden]);
}
