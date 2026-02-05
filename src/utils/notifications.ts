/**
 * Service de notifications pour l'application Barakaah
 * Gère les rappels de prière, Iftar et Dua Kumayl
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import type { DuaKumaylReminder } from '../types';

// ===== CONFIGURATION DU SON ADHAN =====
// Utilise le fichier complet et contrôle la durée de lecture
const ADHAN_SOUND = require('../../assets/sounds/adhan_full.mp3');
const ADHAN_DURATION_MS = 8000; // Jouer seulement 8 secondes (Allahu Akbar)

// Channel Android pour les notifications de prière (avec son Adhan)
const PRAYER_CHANNEL_ID = 'prayer-reminders';
const IFTAR_CHANNEL_ID = 'iftar-reminders';

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

// Identifiants des notifications
const KUMAYL_NOTIFICATION_ID = 'dua-kumayl-weekly';
const PRAYER_NOTIFICATION_PREFIX = 'prayer-reminder-';
const IFTAR_NOTIFICATION_ID = 'iftar-reminder';

/**
 * Initialiser les channels de notification Android
 */
export const initNotificationChannels = async (): Promise<void> => {
  if (Platform.OS === 'android') {
    // Channel pour les rappels de prière
    await Notifications.setNotificationChannelAsync(PRAYER_CHANNEL_ID, {
      name: 'Rappels de prière',
      description: 'Notifications pour les horaires de prière',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'adhan_short.wav', // Fichier dans android/app/src/main/res/raw/
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
    });

    // Channel pour les rappels Iftar
    await Notifications.setNotificationChannelAsync(IFTAR_CHANNEL_ID, {
      name: 'Rappels Iftar',
      description: 'Notifications pour le moment de rompre le jeûne',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'adhan_short.wav',
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
    });

    console.log('📢 Channels de notification Android créés');
  }
};

/**
 * Jouer le son de l'Adhan (premières 8 secondes seulement)
 */
export const playAdhanSound = async (): Promise<void> => {
  try {
    const { sound } = await Audio.Sound.createAsync(ADHAN_SOUND);
    await sound.playAsync();

    // Arrêter après ADHAN_DURATION_MS (8 secondes)
    setTimeout(async () => {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
      } catch (e) {}
    }, ADHAN_DURATION_MS);

    console.log('🔊 Son Adhan démarré');
  } catch (error) {
    console.error('Erreur lecture son Adhan:', error);
  }
};

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

  // Initialiser les channels Android après avoir obtenu les permissions
  if (finalStatus === 'granted') {
    await initNotificationChannels();
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
 * Planifier un rappel de prière
 */
export const schedulePrayerReminder = async (
  prayerName: string,
  prayerTime: Date,
  minutesBefore: number
): Promise<string | null> => {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return null;

  // Calculer l'heure du rappel
  const reminderTime = new Date(prayerTime.getTime() - minutesBefore * 60 * 1000);

  // Si l'heure est déjà passée, ne pas programmer
  if (reminderTime <= new Date()) return null;

  const identifier = `${PRAYER_NOTIFICATION_PREFIX}${prayerName}`;

  // Annuler l'ancienne notification si elle existe
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (e) {}

  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `🕌 ${prayerName} dans ${minutesBefore} minutes`,
        body: `Préparez-vous pour la prière de ${prayerName}`,
        data: { type: 'prayer-reminder', prayer: prayerName },
        sound: Platform.OS === 'ios' ? 'adhan_short.wav' : true,
        ...(Platform.OS === 'android' && { channelId: PRAYER_CHANNEL_ID }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderTime,
      },
      identifier,
    });

    console.log(`📿 Rappel ${prayerName} programmé pour`, reminderTime.toLocaleTimeString());
    return notificationId;
  } catch (error) {
    console.error('Erreur planification rappel prière:', error);
    return null;
  }
};

/**
 * Planifier un rappel Iftar
 */
export const scheduleIftarReminder = async (
  iftarTime: Date,
  minutesBefore: number
): Promise<string | null> => {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return null;

  const reminderTime = new Date(iftarTime.getTime() - minutesBefore * 60 * 1000);

  if (reminderTime <= new Date()) return null;

  // Annuler l'ancienne notification
  try {
    await Notifications.cancelScheduledNotificationAsync(IFTAR_NOTIFICATION_ID);
  } catch (e) {}

  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `🌙 Iftar dans ${minutesBefore} minutes`,
        body: 'Préparez-vous à rompre le jeûne',
        data: { type: 'iftar-reminder' },
        sound: Platform.OS === 'ios' ? 'adhan_short.wav' : true,
        ...(Platform.OS === 'android' && { channelId: IFTAR_CHANNEL_ID }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderTime,
      },
      identifier: IFTAR_NOTIFICATION_ID,
    });

    console.log('🌙 Rappel Iftar programmé pour', reminderTime.toLocaleTimeString());
    return notificationId;
  } catch (error) {
    console.error('Erreur planification rappel Iftar:', error);
    return null;
  }
};

/**
 * Annuler tous les rappels de prière
 */
export const cancelAllPrayerReminders = async (): Promise<void> => {
  const prayers = ['Sobh', 'Dohr', 'Asr', 'Maghrib', 'Icha'];
  for (const prayer of prayers) {
    try {
      await Notifications.cancelScheduledNotificationAsync(`${PRAYER_NOTIFICATION_PREFIX}${prayer}`);
    } catch (e) {}
  }
  console.log('Tous les rappels de prière annulés');
};

/**
 * Annuler le rappel Iftar
 */
export const cancelIftarReminder = async (): Promise<void> => {
  try {
    await Notifications.cancelScheduledNotificationAsync(IFTAR_NOTIFICATION_ID);
    console.log('Rappel Iftar annulé');
  } catch (e) {}
};

/**
 * Planifier le rappel hebdomadaire de Dua Kumayl
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

  await cancelDuaKumaylReminder();

  try {
    const trigger: Notifications.WeeklyTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 5, // Jeudi
      hour: config.hour,
      minute: config.minute,
    };

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "🤲 C'est le moment de Dua Kumayl",
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
 * Envoyer une notification de test avec son Adhan
 */
export const sendTestNotification = async (): Promise<void> => {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    console.warn('Permissions de notification non accordées');
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🕌 Test Barakaah',
      body: 'Les notifications fonctionnent correctement!',
      data: { type: 'test' },
      sound: Platform.OS === 'ios' ? 'adhan_short.wav' : true,
      ...(Platform.OS === 'android' && { channelId: PRAYER_CHANNEL_ID }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
      repeats: false,
    },
  });
};

/**
 * Configurer le listener pour les notifications reçues
 */
export const setupNotificationListener = (
  onNotificationReceived: (notification: Notifications.Notification) => void
): (() => void) => {
  const subscription = Notifications.addNotificationReceivedListener(onNotificationReceived);
  return () => subscription.remove();
};

/**
 * Configurer le listener pour les interactions avec les notifications
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
  initNotificationChannels,
  playAdhanSound,
  requestNotificationPermissions,
  checkNotificationPermissions,
  schedulePrayerReminder,
  scheduleIftarReminder,
  cancelAllPrayerReminders,
  cancelIftarReminder,
  scheduleDuaKumaylReminder,
  cancelDuaKumaylReminder,
  isDuaKumaylReminderScheduled,
  getScheduledNotifications,
  sendTestNotification,
  setupNotificationListener,
  setupNotificationResponseListener,
  getLastNotificationResponse,
};
