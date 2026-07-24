'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, BellOff, Info, Share } from 'lucide-react';

// Helper to convert base64 to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type NotificationSetting = 'granted' | 'denied' | 'default';

export default function NotificationToggle() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationSetting | 'loading'>('loading');
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [isStandaloneMode, setIsStandaloneMode] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect iOS and Standalone status
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;

    setIsIOSDevice(isIOS);
    setIsStandaloneMode(isStandalone);

    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setPermission('denied');
      return;
    }

    setPermission(Notification.permission as NotificationSetting);

    // Get current subscription if available
    navigator.serviceWorker.ready.then((registration) => {
      registration.pushManager.getSubscription().then((sub) => {
        setSubscription(sub);
      });
    }).catch(err => {
      console.warn("Service Worker not ready yet", err);
    });
  }, []);

  const handleToggleNotifications = async () => {
    if (!user) return;
    setLoading(true);
    setMessage(null);

    try {
      const registration = await navigator.serviceWorker.ready;

      if (subscription) {
        // Toggle Off - Unsubscribe
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        setSubscription(null);

        // Delete from database
        const res = await fetch('/api/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint, user_id: user.id }),
        });

        if (res.ok) {
          setMessage({ text: 'Notifications disabled successfully.', type: 'info' });
        } else {
          console.error('Failed to delete subscription on backend');
        }
      } else {
        // Toggle On - Subscribe
        const reqPermission = await Notification.requestPermission();
        setPermission(reqPermission as NotificationSetting);

        if (reqPermission !== 'granted') {
          setMessage({ text: 'Permission to send notifications was denied.', type: 'error' });
          setLoading(false);
          return;
        }

        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          throw new Error('VAPID public key environment variable is not defined.');
        }

        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

        const newSub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        });

        setSubscription(newSub);

        // Save to database
        const res = await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: newSub,
            user_id: user.id,
          }),
        });

        if (res.ok) {
          setMessage({ text: 'Notifications enabled successfully! You will receive daily 10 PM reminders.', type: 'success' });
        } else {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to save subscription.');
        }
      }
    } catch (err: any) {
      console.error('Error toggling notifications:', err);
      setMessage({ text: err.message || 'Failed to toggle notifications.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (permission === 'loading') {
    return <div className="h-14 w-full bg-zinc-900/60 border border-zinc-800 animate-pulse rounded-xl"></div>;
  }

  // If iOS device and not running standalone, show the instruction prompt instead of standard button
  if (isIOSDevice && !isStandaloneMode) {
    return (
      <div className="p-4 rounded-xl border border-teal-500/20 bg-teal-500/5 text-zinc-350 text-sm space-y-3">
        <div className="flex items-start space-x-2.5">
          <Info className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-teal-400">Enable iOS Reminders</h4>
            <p className="mt-1 leading-relaxed text-zinc-400">
              To enable push notifications on iOS, please install the app:
            </p>
            <ol className="mt-2 list-decimal list-inside space-y-2 text-zinc-450">
              <li>Open Safari and navigate to this tracker.</li>
              <li>
                Tap the 
                <span className="inline-flex items-center bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-teal-400 text-xs font-semibold mx-1 leading-none align-middle">
                  <Share className="w-3.5 h-3.5 mr-1" /> Share
                </span> 
                icon.
              </li>
              <li>
                Select 
                <span className="text-teal-400 font-semibold mx-1">Add to Home Screen</span>.
              </li>
              <li>Open the installed app from your home screen to enable reminders!</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 w-full">
      <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30">
        <div className="space-y-1 pr-4">
          <h4 className="text-sm font-semibold text-zinc-200">Daily Reminders</h4>
          <p className="text-xs text-zinc-400 leading-normal">
            Get a reminder at 10 PM if you haven't filled out your tracker today.
          </p>
        </div>
        <button
          onClick={handleToggleNotifications}
          disabled={loading}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-all duration-200 cursor-pointer shrink-0 ${
            subscription
              ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-750'
              : 'bg-teal-500/10 hover:bg-teal-500/20 text-teal-450 border-teal-500/20 shadow-sm shadow-teal-500/5'
          }`}
        >
          {subscription ? (
            <>
              <BellOff className="w-3.5 h-3.5" />
              <span>Disable</span>
            </>
          ) : (
            <>
              <Bell className="w-3.5 h-3.5 animate-pulse" />
              <span>Enable</span>
            </>
          )}
        </button>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-xs border ${
            message.type === 'success'
              ? 'bg-teal-500/10 border-teal-500/20 text-teal-400'
              : message.type === 'error'
              ? 'bg-red-500/10 border-red-500/20 text-red-400'
              : 'bg-zinc-900/40 border-zinc-800 text-zinc-400'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
