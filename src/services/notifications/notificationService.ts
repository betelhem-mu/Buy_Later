
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export async function requestNotificationPermission(): Promise<boolean> {
    try {
        const { status: existingStatus } =
            await Notifications.getPermissionsAsync();

        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } =
                await Notifications.requestPermissionsAsync();

            finalStatus = status;
        }

        return finalStatus === 'granted';
    } catch (error) {
        console.error('Error requesting notification permission:', error);
        throw error;
    }
}

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
                },
            });

        return notificationId;
    } catch (error) {
        console.error('Error scheduling purchase reminder:', error);
        return null;
    }
}

export async function cancelPurchaseReminder(
    notificationId: string
): Promise<void> {
    try {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
        console.error('Error cancelling purchase reminder:', error);
    }
}

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

        const plannedMonthEnd = new Date(year, month, 0);
        plannedMonthEnd.setHours(9, 0, 0, 0);

        const reminderDate = new Date(creationDate);

        reminderDate.setDate(reminderDate.getDate() + 10);
        reminderDate.setHours(9, 0, 0, 0);

        const notificationIds: string[] = [];

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

        const overdueDate = new Date(year, month, 1);
        overdueDate.setHours(9, 0, 0, 0);

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
                },
            });

        return notificationId;
    } catch (error) {
        console.error('Error scheduling overdue notification:', error);
        return null;
    }
}

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

export async function cancelAllPurchaseNotifications(
    reminderNotificationIds: string[] = [],
    overdueNotificationId?: string
): Promise<void> {
    await cancelAllPurchaseReminders(reminderNotificationIds);

    if (overdueNotificationId) {
        await cancelPurchaseReminder(overdueNotificationId);
    }
}
