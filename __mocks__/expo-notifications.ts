/**
 * Mock for expo-notifications
 * Used in Jest tests to avoid native module dependencies
 */

export enum AndroidImportance {
  MIN = 1,
  LOW = 2,
  DEFAULT = 3,
  HIGH = 4,
  MAX = 5,
}

export interface NotificationPermissionsStatus {
  status: 'granted' | 'denied' | 'undetermined';
  granted: boolean;
  canAskAgain: boolean;
  expires: 'never' | number;
}

export interface ExpoPushToken {
  type: 'expo';
  data: string;
}

export interface Notification {
  request: {
    identifier: string;
    content: {
      title?: string;
      body?: string;
      data?: any;
    };
  };
}

export interface NotificationResponse {
  notification: Notification;
  actionIdentifier: string;
}

export interface Subscription {
  remove: () => void;
}

let notificationHandler: any = null;
const subscriptions: Set<Subscription> = new Set();

export const setNotificationHandler = jest.fn((handler: any) => {
  notificationHandler = handler;
});

export const getPermissionsAsync = jest.fn(async (): Promise<NotificationPermissionsStatus> => {
  return {
    status: 'undetermined',
    granted: false,
    canAskAgain: true,
    expires: 'never',
  };
});

export const requestPermissionsAsync = jest.fn(async (): Promise<NotificationPermissionsStatus> => {
  return {
    status: 'granted',
    granted: true,
    canAskAgain: false,
    expires: 'never',
  };
});

export const getExpoPushTokenAsync = jest.fn(async (options?: any): Promise<ExpoPushToken> => {
  return {
    type: 'expo',
    data: 'ExponentPushToken[MOCK_TOKEN_123]',
  };
});

export const setNotificationChannelAsync = jest.fn(async (channelId: string, channel: any): Promise<void> => {
  // Mock implementation - no-op
});

export const setBadgeCountAsync = jest.fn(async (count: number): Promise<void> => {
  // Mock implementation - no-op
});

export const addNotificationReceivedListener = jest.fn((listener: (notification: Notification) => void): Subscription => {
  const subscription: Subscription = {
    remove: jest.fn(() => {
      subscriptions.delete(subscription);
    }),
  };
  subscriptions.add(subscription);
  return subscription;
});

export const addNotificationResponseReceivedListener = jest.fn((listener: (response: NotificationResponse) => void): Subscription => {
  const subscription: Subscription = {
    remove: jest.fn(() => {
      subscriptions.delete(subscription);
    }),
  };
  subscriptions.add(subscription);
  return subscription;
});

export const removeNotificationSubscription = jest.fn((subscription: Subscription) => {
  subscription.remove();
});

// Helper for tests to trigger notification received event
export const __triggerNotificationReceived = (notification: Notification) => {
  if (notificationHandler) {
    notificationHandler.handleNotification(notification);
  }
};

// Helper for tests to clear all subscriptions
export const __clearAllSubscriptions = () => {
  subscriptions.clear();
};

export default {
  AndroidImportance,
  setNotificationHandler,
  getPermissionsAsync,
  requestPermissionsAsync,
  getExpoPushTokenAsync,
  setNotificationChannelAsync,
  setBadgeCountAsync,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  removeNotificationSubscription,
  __triggerNotificationReceived,
  __clearAllSubscriptions,
};
