// Push Notifications Manager

class NotificationManager {
  constructor() {
    this.vapidPublicKey = null; // Will be set from server
    this.init();
  }

  async init() {
    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      console.log('Service workers not supported');
      return;
    }

    // Check if push notifications are supported
    if (!('PushManager' in window)) {
      console.log('Push notifications not supported');
      return;
    }

    // Register service worker
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered');

      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        console.log('Notification permission granted');
        await this.subscribeUser(registration);
      } else {
        console.log('Notification permission denied');
      }
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  async subscribeUser(registration) {
    try {
      const keyResponse = await fetch('/api/notifications/vapid-public-key');
      const keyData = await keyResponse.json();
      const vapidPublicKey = keyData.publicKey;

      if (!vapidPublicKey || vapidPublicKey === 'YOUR_VAPID_PUBLIC_KEY') {
        console.log('VAPID key not configured, skipping subscription');
        return;
      }

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
      });

      // Send subscription to server
      await fetch('/api/notifications/save-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscription)
      });

      console.log('User subscribed to push notifications');
    } catch (error) {
      console.error('Failed to subscribe user:', error);
    }
  }

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new NotificationManager();
});
