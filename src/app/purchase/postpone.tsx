
import { useCallback, useState } from 'react';

import {
    ActivityIndicator,
    Alert,
    Pressable,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import DateTimePicker from '@react-native-community/datetimepicker';

import {
    useLocalSearchParams,
    useRouter,
    useFocusEffect,
} from 'expo-router';

import {
    getPurchases,
    savePurchases,
} from '../../services/purchaseStorage';

import {
    scheduleAllPurchaseNotifications,
    cancelAllPurchaseNotifications,
} from '../../services/notifications/notificationService';

import type { Purchase } from '../../types/purchase';

const COLORS = {
    background: '#101114',
    card: '#242426',
    gold: '#D6B66C',
    goldLight: '#FFF4D6',
    text: '#F7F4EC',
    secondary: '#B5B1A7',
    muted: '#85827B',
    track: '#49443A',
};

export default function PostponePurchaseScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    const [purchase, setPurchase] = useState<Purchase | null>(null);
    const [newDate, setNewDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Convert stored date into a local calendar date
    const parseLocalDate = (dateString: string) => {
        const [year, month, day] = dateString
            .slice(0, 10)
            .split('-')
            .map(Number);

        return new Date(year, month - 1, day);
    };

    // Format date for display
    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    // Load the selected purchase
    const loadPurchase = useCallback(async () => {
        try {
            const purchases = await getPurchases();

            const found = purchases.find(
                item => item.id === id
            );

            if (found) {
                setPurchase(found);
                setNewDate(parseLocalDate(found.plannedDate));
            } else {
                setPurchase(null);
            }
        } catch (error) {
            console.error('Error loading purchase:', error);

            Alert.alert(
                'Error',
                'Could not load this purchase.'
            );
        } finally {
            setLoading(false);
        }
    }, [id]);

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            loadPurchase();
        }, [loadPurchase])
    );

    // Handle date selection
    const handleDateChange = (
        event: { type: string },
        selectedDate?: Date
    ) => {
        setShowDatePicker(false);

        if (event.type === 'set' && selectedDate) {
            setNewDate(selectedDate);
        }
    };

    // Save the new planned date and reschedule notifications
    const handleSave = async () => {
        if (!purchase || saving) {
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const selectedDate = new Date(newDate);
        selectedDate.setHours(0, 0, 0, 0);

        if (selectedDate <= today) {
            Alert.alert(
                'Choose a future date',
                'Please select a date after today.'
            );
            return;
        }

        setSaving(true);

        let newReminderIds: string[] = [];
        let newOverdueId: string | undefined;

        try {
            const purchases = await getPurchases();

            const currentPurchase = purchases.find(
                item => item.id === purchase.id
            );

            if (!currentPurchase) {
                Alert.alert(
                    'Purchase Not Found',
                    'This purchase could not be found.'
                );
                return;
            }

            // Store the selected calendar date at 9 AM
            const plannedDateForStorage = new Date(selectedDate);
            plannedDateForStorage.setHours(9, 0, 0, 0);

            const updatedPlannedDate =
                plannedDateForStorage.toISOString();

            // Schedule notifications for the new planned date
            const scheduledNotifications =
                await scheduleAllPurchaseNotifications(
                    currentPurchase.id,
                    currentPurchase.name,
                    currentPurchase.createdAt,
                    updatedPlannedDate
                );

            newReminderIds =
                scheduledNotifications.reminderNotificationIds;

            newOverdueId =
                scheduledNotifications.overdueNotificationId;

            // Update the purchase while preserving its other information
            const updatedPurchases = purchases.map(item => {
                if (item.id !== currentPurchase.id) {
                    return item;
                }

                return {
                    ...item,
                    plannedDate: updatedPlannedDate,
                    status:
                        item.status === 'Overdue'
                            ? 'Active' as const
                            : item.status,
                    reminderNotificationIds: newReminderIds,
                    overdueNotificationId: newOverdueId,
                    notificationsScheduled:
                        newReminderIds.length > 0 ||
                        newOverdueId !== undefined,
                };
            });

            await savePurchases(updatedPurchases);

            // Cancel old notifications after saving the new data
            await cancelAllPurchaseNotifications(
                currentPurchase.reminderNotificationIds ?? [],
                currentPurchase.overdueNotificationId
            );

            Alert.alert(
                'Purchase Rescheduled',
                'Your new planned date has been saved and your reminders have been updated.',
                [
                    {
                        text: 'OK',
                        onPress: () => router.back(),
                    },
                ]
            );
        } catch (error) {
            console.error('Error postponing purchase:', error);

            // Clean up newly scheduled notifications if saving failed
            await cancelAllPurchaseNotifications(
                newReminderIds,
                newOverdueId
            );

            Alert.alert(
                'Error',
                'Could not reschedule this purchase. Please try again.'
            );
        } finally {
            setSaving(false);
        }
    };

    // Loading screen
    if (loading) {
        return (
            <SafeAreaView style={styles.center}>
                <StatusBar barStyle="light-content" />

                <ActivityIndicator
                    size="large"
                    color={COLORS.gold}
                />

                <Text style={styles.secondaryText}>
                    Loading purchase...
                </Text>
            </SafeAreaView>
        );
    }

    // Purchase not found
    if (!purchase) {
        return (
            <SafeAreaView style={styles.center}>
                <StatusBar barStyle="light-content" />

                <Text style={styles.title}>
                    Purchase not found
                </Text>

                <Pressable
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Text style={styles.backText}>
                        Go Back
                    </Text>
                </Pressable>
            </SafeAreaView>
        );
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
            >
                <Pressable
                    onPress={() => router.back()}
                    disabled={saving}
                >
                    <Text style={styles.backText}>
                        ‹  Back to Purchase
                    </Text>
                </Pressable>

                <View style={styles.header}>
                    <Text style={styles.title}>
                        Postpone Purchase
                    </Text>

                    <Text style={styles.description}>
                        Choose a new date for your planned purchase.
                    </Text>
                </View>

                {/* CURRENT PURCHASE */}
                <View style={styles.purchaseCard}>
                    <Text style={styles.sectionLabel}>
                        CURRENT PURCHASE
                    </Text>

                    <Text style={styles.purchaseName}>
                        {purchase.name}
                    </Text>

                    <Text style={styles.purchasePrice}>
                        ETB {purchase.estimatedPrice.toLocaleString()}
                    </Text>

                    <View style={styles.divider} />

                    <Text style={styles.currentDateLabel}>
                        Current Planned Date
                    </Text>

                    <Text style={styles.currentDate}>
                        {formatDate(parseLocalDate(purchase.plannedDate))}
                    </Text>

                    {purchase.status === 'Overdue' && (
                        <View style={styles.overdueBadge}>
                            <Text style={styles.overdueText}>
                                Overdue
                            </Text>
                        </View>
                    )}
                </View>

                {/* NEW PLANNED DATE */}
                <View style={styles.dateCard}>
                    <Text style={styles.sectionTitle}>
                        Choose a New Date
                    </Text>

                    <Text style={styles.helper}>
                        Select when you would like to plan this purchase.
                    </Text>

                    <Pressable
                        style={styles.dateButton}
                        onPress={() => setShowDatePicker(true)}
                        disabled={saving}
                    >
                        <View>
                            <Text style={styles.dateLabel}>
                                New Planned Date
                            </Text>

                            <Text style={styles.dateButtonText}>
                                {formatDate(newDate)}
                            </Text>
                        </View>

                        <View style={styles.calendarIconContainer}>
                            <Text style={styles.calendarIcon}>
                                ▦
                            </Text>
                        </View>
                    </Pressable>

                    {showDatePicker && (
                        <DateTimePicker
                            value={newDate}
                            mode="date"
                            display="default"
                            minimumDate={tomorrow}
                            onChange={handleDateChange}
                        />
                    )}
                </View>

                {/* SAVE BUTTON */}
                <Pressable
                    style={[
                        styles.saveButton,
                        saving && styles.disabledButton,
                    ]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator
                            color={COLORS.background}
                        />
                    ) : (
                        <Text style={styles.saveButtonText}>
                            Save New Date
                        </Text>
                    )}
                </Pressable>

                <Pressable
                    style={styles.cancelButton}
                    onPress={() => router.back()}
                    disabled={saving}
                >
                    <Text style={styles.cancelButtonText}>
                        Cancel
                    </Text>
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    content: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 40,
    },

    center: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        gap: 12,
    },

    backText: {
        color: COLORS.gold,
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 25,
    },

    backButton: {
        backgroundColor: COLORS.card,
        paddingHorizontal: 22,
        paddingVertical: 12,
        borderRadius: 10,
        marginTop: 15,
    },

    header: {
        marginBottom: 25,
    },

    title: {
        color: COLORS.text,
        fontSize: 27,
        fontWeight: 'bold',
    },

    description: {
        color: COLORS.secondary,
        fontSize: 14,
        marginTop: 8,
        lineHeight: 21,
    },

    purchaseCard: {
        backgroundColor: COLORS.card,
        borderRadius: 17,
        padding: 19,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#383838',
    },

    sectionLabel: {
        color: COLORS.muted,
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1.5,
        marginBottom: 13,
    },

    purchaseName: {
        color: COLORS.text,
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 7,
    },

    purchasePrice: {
        color: COLORS.gold,
        fontSize: 20,
        fontWeight: 'bold',
    },

    divider: {
        height: 1,
        backgroundColor: COLORS.track,
        marginVertical: 18,
    },

    currentDateLabel: {
        color: COLORS.secondary,
        fontSize: 12,
        marginBottom: 6,
    },

    currentDate: {
        color: COLORS.text,
        fontSize: 15,
        fontWeight: '600',
    },

    overdueBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#583333',
        borderRadius: 7,
        paddingVertical: 6,
        paddingHorizontal: 10,
        marginTop: 14,
    },

    overdueText: {
        color: '#F0AAAA',
        fontSize: 11,
        fontWeight: 'bold',
    },

    dateCard: {
        backgroundColor: COLORS.card,
        borderRadius: 17,
        padding: 19,
        marginBottom: 25,
        borderWidth: 1,
        borderColor: '#383838',
    },

    sectionTitle: {
        color: COLORS.text,
        fontSize: 17,
        fontWeight: 'bold',
        marginBottom: 8,
    },

    helper: {
        color: COLORS.muted,
        fontSize: 12,
        lineHeight: 18,
        marginBottom: 17,
    },

    dateButton: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.track,
        borderRadius: 12,
        padding: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    dateLabel: {
        color: COLORS.muted,
        fontSize: 11,
        marginBottom: 6,
    },

    dateButtonText: {
        color: COLORS.text,
        fontSize: 15,
        fontWeight: '600',
    },

    calendarIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 11,
        backgroundColor: '#393322',
        alignItems: 'center',
        justifyContent: 'center',
    },

    calendarIcon: {
        color: COLORS.gold,
        fontSize: 22,
    },

    saveButton: {
        backgroundColor: COLORS.gold,
        minHeight: 53,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },

    saveButtonText: {
        color: COLORS.background,
        fontSize: 15,
        fontWeight: 'bold',
    },

    disabledButton: {
        opacity: 0.6,
    },

    cancelButton: {
        padding: 16,
        alignItems: 'center',
        marginTop: 5,
    },

    cancelButtonText: {
        color: COLORS.secondary,
        fontSize: 14,
        fontWeight: '600',
    },

    secondaryText: {
        color: COLORS.secondary,
        fontSize: 13,
    },
});
