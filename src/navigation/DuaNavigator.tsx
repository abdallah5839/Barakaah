/**
 * Navigateur interne pour le module Dua
 * Gère la navigation entre les écrans Dua sans dépendance externe
 */

import React, { useState, useCallback, createContext, useContext, useEffect } from 'react';
import { View, StyleSheet, BackHandler } from 'react-native';
import {
  DuaScreen,
  DuaCategoryScreen,
  DuaDetailScreen,
} from '../screens';
import type { DuaCategory } from '../types';

// Types de navigation
type DuaRoute =
  | { name: 'DuaMain' }
  | { name: 'DuaCategory'; params: { categoryId: DuaCategory } }
  | { name: 'DuaDetail'; params: { duaId: string } };

// Contexte de navigation Dua
interface DuaNavigationContextType {
  navigate: (route: DuaRoute['name'], params?: any) => void;
  goBack: () => void;
  currentRoute: DuaRoute;
}

const DuaNavigationContext = createContext<DuaNavigationContextType | undefined>(undefined);

export const useDuaNavigation = () => {
  const context = useContext(DuaNavigationContext);
  if (!context) {
    throw new Error('useDuaNavigation must be used within DuaNavigator');
  }
  return context;
};

/**
 * Navigateur pour le module Dua
 */
interface DuaNavigatorProps {
  onGoHome?: () => void;
}

export const DuaNavigator: React.FC<DuaNavigatorProps> = ({ onGoHome }) => {
  const [routeStack, setRouteStack] = useState<DuaRoute[]>([{ name: 'DuaMain' }]);

  const currentRoute = routeStack[routeStack.length - 1];

  // Navigation vers un nouvel écran
  const navigate = useCallback((name: DuaRoute['name'], params?: any) => {
    const newRoute: DuaRoute = params ? { name, params } as DuaRoute : { name } as DuaRoute;
    setRouteStack(prev => [...prev, newRoute]);
  }, []);

  // Retour en arrière
  const goBack = useCallback(() => {
    setRouteStack(prev => {
      if (prev.length > 1) {
        return prev.slice(0, -1);
      }
      return prev;
    });
  }, []);

  // Gestion du bouton retour Android
  useEffect(() => {
    const onBackPress = () => {
      if (routeStack.length > 1) {
        goBack();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [routeStack.length, goBack]);

  // Créer un objet navigation compatible
  const navigation = {
    navigate,
    goBack,
  };

  // Créer un objet route compatible
  const getRoute = (route: DuaRoute) => ({
    params: 'params' in route ? route.params : undefined,
  });

  // Rendu de l'écran actuel
  const renderScreen = () => {
    switch (currentRoute.name) {
      case 'DuaMain':
        return <DuaScreen navigation={navigation} onGoHome={onGoHome} />;
      case 'DuaCategory':
        return (
          <DuaCategoryScreen
            navigation={navigation}
            route={getRoute(currentRoute) as any}
          />
        );
      case 'DuaDetail':
        return (
          <DuaDetailScreen
            navigation={navigation}
            route={getRoute(currentRoute) as any}
          />
        );
      default:
        return <DuaScreen navigation={navigation} />;
    }
  };

  return (
    <DuaNavigationContext.Provider value={{ navigate, goBack, currentRoute }}>
      <View style={styles.container}>
        {renderScreen()}
      </View>
    </DuaNavigationContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default DuaNavigator;
