import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Control how notifications appear while the app is open
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

// Ask the user for notification permission
export async function requestNotificationPermission(): Promise<boolean> {
    const { status: existingStatus } =
        await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        return false;
    }

    // Set up the Android notification channel
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('purchase-reminders', {
            name: 'Purchase Reminders',
            importance: Notifications.AndroidImportance.HIGH,
            sound: 'default',
        });
    }

    return true;
}

// Schedule one purchase reminder
export async function schedulePurchaseReminder(
    purchaseId: string,
    purchaseName: string,
    reminderDate: Date
): Promise<string | null> {
    try {
        const hasPermission = await requestNotificationPermission();

        if (!hasPermission) {
            return null;
        }

        // Do not schedule notifications for past dates
        if (reminderDate.getTime() <= Date.now()) {
            return null;
        }

        const notificationId =
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: 'BuyLater Reminder',
                    body: `Remember your planned purchase: ${purchaseName}`,
                    sound: 'default',
                    data: {
                        purchaseId,
                    },
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: reminderDate,
                    channelId: 'purchase-reminders',
                },
            });

        return notificationId;
    } catch (error) {
        console.error('Error scheduling purchase reminder:', error);
        return null;
    }
}

// Cancel one scheduled notification
export async function cancelPurchaseReminder(
    notificationId: string
): Promise<void> {
    try {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
        console.error('Error cancelling purchase reminder:', error);
    }
}

// Cancel all reminders belonging to one purchase
export async function cancelAllPurchaseReminders(
    notificationIds: string[]
): Promise<void> {
    try {
        await Promise.all(
            notificationIds.map((id) =>
                Notifications.cancelScheduledNotificationAsync(id)
            )
        );
    } catch (error) {
        console.error('Error cancelling purchase reminders:', error);
    }
}

// Schedule reminders every 10 days until the planned month ends
export async function schedulePurchaseReminders(
    purchaseId: string,
    purchaseName: string,
    createdAt: string,
    plannedDate: string
): Promise<string[]> {
    try {
        const hasPermission = await requestNotificationPermission();

        if (!hasPermission) {
            return [];
        }

        const creationDate = new Date(createdAt);

        const [year, month, day] = plannedDate
             .slice(0, 10)
             .split('-')
             .map(Number);

        const plannedMonthEnd = new Date(year, month, 0);
        plannedMonthEnd.setHours(9, 0, 0, 0);

        if (
            Number.isNaN(creationDate.getTime()) ||
            !year ||
            !month ||
            !day ||
            month > 12 ||
            day > 31
        ) {
            return [];
        }

        const reminderDate = new Date(creationDate);

        // First reminder is 10 days after creation
        reminderDate.setDate(reminderDate.getDate() + 10);
        reminderDate.setHours(9, 0, 0, 0);

        const notificationIds: string[] = [];

        // Continue scheduling every 10 days
        while (reminderDate <= plannedMonthEnd) {
            const notificationId = await schedulePurchaseReminder(
                purchaseId,
                purchaseName,
                new Date(reminderDate)
            );

            if (notificationId) {
                notificationIds.push(notificationId);
            }

            reminderDate.setDate(reminderDate.getDate() + 10);
        }

        return notificationIds;
    } catch (error) {
        console.error('Error scheduling purchase reminders:', error);
        return [];
    }
}

// Schedule an overdue notification for the first day of the next month
export async function scheduleOverdueNotification(
    purchaseId: string,
    purchaseName: string,
    plannedDate: string
): Promise<string | null> {
    try {
        const hasPermission = await requestNotificationPermission();

        if (!hasPermission) {
            return null;
        }

       const [year, month, day] = plannedDate
           .slice(0, 10)
           .split('-')
           .map(Number);
        if (
            !year ||
            !month ||
            !day ||
            month > 12 ||
            day > 31
        ) {
            return null;
        }

        // First day of the month after the planned month
        const overdueDate = new Date(year, month, 1);

        // Notification time: 9:00 AM
        overdueDate.setHours(9, 0, 0, 0);

        // Do not schedule a notification for a past date
        if (overdueDate.getTime() <= Date.now()) {
            return null;
        }

        const notificationId =
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: 'Purchase Overdue',
                    body: `${purchaseName} is now overdue. Would you like to reschedule it?`,
                    sound: 'default',
                    data: {
                        purchaseId,
                        notificationType: 'overdue',
                    },
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: overdueDate,
                    channelId: 'purchase-reminders',
                },
            });

        return notificationId;
    } catch (error) {
        console.error('Error scheduling overdue notification:', error);
        return null;
    }
}

// Schedule all notifications for one purchase
export async function scheduleAllPurchaseNotifications(
    purchaseId: string,
    purchaseName: string,
    createdAt: string,
    plannedDate: string
): Promise<{
    reminderNotificationIds: string[];
    overdueNotificationId: string | undefined;
}> {
    const reminderNotificationIds = await schedulePurchaseReminders(
        purchaseId,
        purchaseName,
        createdAt,
        plannedDate
    );

    const overdueNotificationId =
        await scheduleOverdueNotification(
            purchaseId,
            purchaseName,
            plannedDate
        );

    return {
        reminderNotificationIds,
        overdueNotificationId: overdueNotificationId ?? undefined,
    };
}

// Cancel all notifications for one purchase
export async function cancelAllPurchaseNotifications(
    reminderNotificationIds: string[] = [],
    overdueNotificationId?: string
): Promise<void> {
    await cancelAllPurchaseReminders(reminderNotificationIds);

    if (overdueNotificationId) {
        await cancelPurchaseReminder(overdueNotificationId);
    }
}