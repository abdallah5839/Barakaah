/**
 * Navigateur interne pour le module Cercle de Lecture
 * Gère la navigation entre les écrans du module Cercle
 */

import React, { useState, useCallback, createContext, useContext, useEffect } from 'react';
import { View, StyleSheet, BackHandler } from 'react-native';
import {
  CircleScreen,
  CreateCircleScreen,
  CircleCreatedScreen,
  JoinCircleScreen,
  ManageAssignmentsScreen,
  MyReadingScreen,
  CircleEndedScreen,
  JuzReaderScreen,
} from '../screens/Circle';
import type { Circle, CircleMember } from '../types/circle.types';

// Types de navigation
type CircleRoute =
  | { name: 'CircleMain' }
  | { name: 'CreateCircle' }
  | { name: 'CircleCreated'; params: { circle: Circle; membership: CircleMember } }
  | { name: 'JoinCircle' }
  | { name: 'CircleDashboard'; params: { circleId: string } }
  | { name: 'ManageAssignments'; params: { circleId: string } }
  | { name: 'MyReading'; params: { circleId: string } }
  | { name: 'CircleEnded'; params: { circleName: string; completedJuz: number; totalJuz: number; reason: string } }
  | { name: 'JuzReader'; params: { circleId: string; juzNumber: number } };

// Contexte de navigation Cercle
interface CircleNavigationContextType {
  navigate: (route: CircleRoute['name'], params?: any) => void;
  goBack: () => void;
  reset: (routes: Array<{ name: CircleRoute['name']; params?: any }>) => void;
  currentRoute: CircleRoute;
}

const CircleNavigationContext = createContext<CircleNavigationContextType | undefined>(undefined);

export const useCircleNavigation = () => {
  const context = useContext(CircleNavigationContext);
  if (!context) {
    throw new Error('useCircleNavigation must be used within CircleNavigator');
  }
  return context;
};

/**
 * Navigateur pour le module Cercle
 */
export const CircleNavigator: React.FC = () => {
  const [routeStack, setRouteStack] = useState<CircleRoute[]>([{ name: 'CircleMain' }]);

  const currentRoute = routeStack[routeStack.length - 1];

  // Navigation vers un nouvel écran
  const navigate = useCallback((name: CircleRoute['name'], params?: any) => {
    const newRoute: CircleRoute = params ? { name, params } as CircleRoute : { name } as CircleRoute;
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

  // Reset la navigation
  const reset = useCallback((routes: Array<{ name: CircleRoute['name']; params?: any }>) => {
    const newRoutes: CircleRoute[] = routes.map(r =>
      r.params ? { name: r.name, params: r.params } as CircleRoute : { name: r.name } as CircleRoute
    );
    setRouteStack(newRoutes);
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

  // Créer un objet navigation compatible avec React Navigation
  const navigation: any = {
    navigate,
    goBack,
    dispatch: (action: any) => {
      // Gérer CommonActions.reset
      if (action.type === 'RESET') {
        reset(action.payload.routes);
      }
    },
  };

  // Créer un objet route compatible
  const getRoute = (route: CircleRoute) => ({
    params: 'params' in route ? route.params : undefined,
  });

  // Rendu de l'écran actuel
  const renderScreen = () => {
    switch (currentRoute.name) {
      case 'CircleMain':
        return <CircleScreen />;

      case 'CreateCircle':
        return <CreateCircleScreen />;

      case 'CircleCreated':
        return <CircleCreatedScreen />;

      case 'JoinCircle':
        return <JoinCircleScreen />;

      case 'CircleDashboard':
        return <CircleScreen />;

      case 'ManageAssignments':
        return <ManageAssignmentsScreen />;

      case 'MyReading':
        return <MyReadingScreen />;

      case 'CircleEnded':
        return <CircleEndedScreen />;

      case 'JuzReader':
        return <JuzReaderScreen />;

      default:
        return <CircleScreen />;
    }
  };

  return (
    <CircleNavigationContext.Provider value={{ navigate, goBack, reset, currentRoute }}>
      <View style={styles.container}>
        {renderScreen()}
      </View>
    </CircleNavigationContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default CircleNavigator;
