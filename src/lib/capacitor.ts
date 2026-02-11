import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { PushNotifications } from '@capacitor/push-notifications';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform();

export async function initializeApp() {
  if (!isNative) {
    return;
  }

  try {
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: '#0ea5e9' });
  } catch (e) {
    console.warn('StatusBar not available', e);
  }

  try {
    await SplashScreen.hide();
  } catch (e) {
    console.warn('SplashScreen not available', e);
  }

  App.addListener('backButton', ({ canGoBack }) => {
    if (!canGoBack) {
      App.exitApp();
    } else {
      window.history.back();
    }
  });

  App.addListener('appStateChange', ({ isActive }) => {
    console.log('App state changed. Is active:', isActive);
  });

  App.addListener('appUrlOpen', (data) => {
    console.log('App opened with URL:', data.url);
    const slug = data.url.split('.app').pop();
    if (slug) {
      window.location.href = slug;
    }
  });
}

export async function requestPushNotificationPermissions() {
  if (!isNative) {
    console.log('Push notifications only available on native platforms');
    return null;
  }

  let permStatus = await PushNotifications.checkPermissions();

  if (permStatus.receive === 'prompt') {
    permStatus = await PushNotifications.requestPermissions();
  }

  if (permStatus.receive !== 'granted') {
    console.warn('Push notification permission not granted');
    return null;
  }

  await PushNotifications.register();

  return new Promise((resolve) => {
    PushNotifications.addListener('registration', (token) => {
      console.log('Push registration success, token:', token.value);
      resolve(token.value);
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error:', error);
      resolve(null);
    });
  });
}

export function setupPushNotifications(
  onNotification: (notification: any) => void
) {
  if (!isNative) {
    return;
  }

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push notification received:', notification);
    onNotification(notification);
  });

  PushNotifications.addListener(
    'pushNotificationActionPerformed',
    (notification) => {
      console.log('Push notification action performed:', notification);
      onNotification(notification.notification);
    }
  );
}

export async function shareContent(
  title: string,
  text: string,
  url?: string
) {
  if (!navigator.share) {
    return false;
  }

  try {
    await navigator.share({
      title,
      text,
      url: url || window.location.href
    });
    return true;
  } catch (err) {
    console.error('Share failed:', err);
    return false;
  }
}
