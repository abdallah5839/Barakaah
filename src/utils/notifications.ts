/**
 * Service de notifications pour l'application Barakaah
 * Gère les rappels de Dua (notamment Dua Kumayl le jeudi soir)
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { DuaKumaylReminder } from '../types';

// Configuration des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Identifiant unique pour la notification Dua Kumayl
const KUMAYL_NOTIFICATION_ID = 'dua-kumayl-weekly';

/**
 * Demander les permissions de notification
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
};

/**
 * Vérifier si les permissions sont accordées
 */
export const checkNotificationPermissions = async (): Promise<boolean> => {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
};

/**
 * Planifier le rappel hebdomadaire de Dua Kumayl
 * S'exécute chaque jeudi soir à l'heure configurée
 */
export const scheduleDuaKumaylReminder = async (
  config: DuaKumaylReminder
): Promise<string | null> => {
  if (!config.enabled) {
    await cancelDuaKumaylReminder();
    return null;
  }

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    console.warn('Permissions de notification non accordées');
    return null;
  }

  // Annuler l'ancienne notification avant d'en créer une nouvelle
  await cancelDuaKumaylReminder();

  try {
    // Créer le trigger hebdomadaire pour le jeudi
    // Note: weekday 5 = jeudi (1 = dimanche, 7 = samedi)
    const trigger: Notifications.WeeklyTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 5, // Jeudi
      hour: config.hour,
      minute: config.minute,
    };

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "C'est le moment de Dua Kumayl",
        body: 'La nuit du jeudi est le moment idéal pour réciter cette invocation bénie.',
        data: {
          type: 'dua-kumayl',
          duaId: 'kumayl',
          screen: 'DuaDetail',
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger,
      identifier: KUMAYL_NOTIFICATION_ID,
    });

    console.log('Notification Dua Kumayl planifiée:', notificationId);
    return notificationId;
  } catch (error) {
    console.error('Erreur lors de la planification de la notification:', error);
    return null;
  }
};

/**
 * Annuler le rappel de Dua Kumayl
 */
export const cancelDuaKumaylReminder = async (): Promise<void> => {
  try {
    await Notifications.cancelScheduledNotificationAsync(KUMAYL_NOTIFICATION_ID);
    console.log('Notification Dua Kumayl annulée');
  } catch (error) {
    // Ignorer l'erreur si la notification n'existe pas
    console.log('Pas de notification Dua Kumayl à annuler');
  }
};

/**
 * Vérifier si le rappel Dua Kumayl est planifié
 */
export const isDuaKumaylReminderScheduled = async (): Promise<boolean> => {
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
  return scheduledNotifications.some(
    notification => notification.identifier === KUMAYL_NOTIFICATION_ID
  );
};

/**
 * Obtenir toutes les notifications planifiées
 */
export const getScheduledNotifications = async () => {
  return await Notifications.getAllScheduledNotificationsAsync();
};

/**
 * Envoyer une notification de test
 */
export const sendTestNotification = async (): Promise<void> => {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    console.warn('Permissions de notification non accordées');
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Test de notification',
      body: 'Les notifications Barakaah fonctionnent correctement!',
      data: { type: 'test' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
    },
  });
};

/**
 * Configurer le listener pour les notifications reçues
 * Retourne une fonction de cleanup
 */
export const setupNotificationListener = (
  onNotificationReceived: (notification: Notifications.Notification) => void
): (() => void) => {
  const subscription = Notifications.addNotificationReceivedListener(onNotificationReceived);
  return () => subscription.remove();
};

/**
 * Configurer le listener pour les interactions avec les notifications
 * Retourne une fonction de cleanup
 */
export const setupNotificationResponseListener = (
  onNotificationResponse: (response: Notifications.NotificationResponse) => void
): (() => void) => {
  const subscription = Notifications.addNotificationResponseReceivedListener(onNotificationResponse);
  return () => subscription.remove();
};

/**
 * Obtenir la dernière notification qui a ouvert l'app
 */
export const getLastNotificationResponse = async () => {
  return await Notifications.getLastNotificationResponseAsync();
};

export default {
  requestNotificationPermissions,
  checkNotificationPermissions,
  scheduleDuaKumaylReminder,
  cancelDuaKumaylReminder,
  isDuaKumaylReminderScheduled,
  getScheduledNotifications,
  sendTestNotification,
  setupNotificationListener,
  setupNotificationResponseListener,
  getLastNotificationResponse,
};
