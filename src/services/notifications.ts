import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6C63FF',
      });

      await Notifications.setNotificationChannelAsync('calendar', {
        name: 'Calendar Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6C63FF',
      });
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    // Save FCM token to Firestore
    await updateDoc(doc(db, 'users', userId), { fcmToken: token });

    return token;
  } catch (error) {
    console.warn('Failed to register for push notifications:', error);
    return null;
  }
}

export async function scheduleEventReminder(
  eventId: string,
  title: string,
  eventDate: Date,
): Promise<string | null> {
  try {
    const reminderTime = new Date(eventDate.getTime() - 60 * 60 * 1000); // 1 hour before
    if (reminderTime <= new Date()) return null;

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Upcoming Event',
        body: `"${title}" starts in 1 hour`,
        data: { eventId },
        sound: true,
      },
      trigger: {
        date: reminderTime,
        channelId: 'calendar',
      },
    });

    return notificationId;
  } catch (error) {
    console.warn('Failed to schedule event reminder:', error);
    return null;
  }
}

export async function cancelNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.warn('Failed to cancel notification:', error);
  }
}

export async function sendLocalNotification(title: string, body: string, data?: Record<string, unknown>): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: true },
    trigger: null,
  });
}
