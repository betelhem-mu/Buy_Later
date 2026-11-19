
import { useState, useCallback } from 'react';

import {
    useLocalSearchParams,
    useRouter,
    useFocusEffect,
} from 'expo-router';

import {
    Alert,
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import DateTimePicker from '@react-native-community/datetimepicker';

import {
    getPurchases,
    savePurchases,
} from '../../services/purchaseStorage';

import {
    cancelAllPurchaseNotifications,
} from '../../services/notifications/notificationService';

import type { Purchase } from '../../types/purchase';

const COLORS = {
    background: '#101114',
    card: '#242426',
    gold: '#D6B66C',
    text: '#F7F4EC',
    secondary: '#B5B1A7',
    muted: '#85827B',
    track: '#49443A',
};

export default function CompletePurchaseScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    const [purchase, setPurchase] = useState<Purchase | null>(null);
    const [loading, setLoading] = useState(true);
    const [actualPrice, setActualPrice] = useState('');
    const [purchaseDate, setPurchaseDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [saving, setSaving] = useState(false);

    const loadPurchase = useCallback(async () => {
        try {
            const purchases = await getPurchases();

            const found = purchases.find(
                item => item.id === id
            );

            setPurchase(found ?? null);
        } catch (error) {
            console.error('Error loading purchase:', error);

            Alert.alert(
                'Error',
                'Could not load purchase details.'
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

    const formatPrice = (price: number) =>
        `ETB ${price.toLocaleString()}`;

    const formatDateForStorage = (date: Date) => {
        const year = date.getFullYear();

        const month = String(date.getMonth() + 1).padStart(2, '0');

        const day = String(date.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    };

    const handleCompletePurchase = async () => {
        if (!purchase || saving) {
            return;
        }

        const trimmedPrice = actualPrice.trim();

        let parsedPrice: number | undefined;

        if (trimmedPrice !== '') {
            parsedPrice = Number(trimmedPrice);

            if (
                !Number.isFinite(parsedPrice) ||
                parsedPrice <= 0
            ) {
                Alert.alert(
                    'Invalid Price',
                    'Enter a valid actual price greater than zero.'
                );

                return;
            }
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const selectedDate = new Date(purchaseDate);
        selectedDate.setHours(0, 0, 0, 0);

        if (selectedDate > today) {
            Alert.alert(
                'Invalid Date',
                'The purchase date cannot be in the future.'
            );

            return;
        }

        setSaving(true);

        try {
            const purchases = await getPurchases();

            const updatedPurchases = purchases.map(item => {
                if (item.id === purchase.id) {
                    return {
                        ...item,

                        status: 'Purchased' as const,

                        actualPrice: parsedPrice,

                        purchasedAt: formatDateForStorage(
                            purchaseDate
                        ),

                        // Clear notification information.
                        reminderNotificationIds: [],

                        overdueNotificationId: undefined,

                        notificationsScheduled: false,
                    };
                }

                return item;
            });

            // Save the purchased status first.
            await savePurchases(updatedPurchases);

            // Cancel all previously scheduled notifications.
            await cancelAllPurchaseNotifications(
                purchase.reminderNotificationIds ?? [],
                purchase.overdueNotificationId
            );

            Alert.alert(
                'Purchase Completed',
                `${purchase.name} has been moved to your purchased items.`,
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            router.replace('/(tabs)/plans');
                        },
                    },
                ]
            );
        } catch (error) {
            console.error('Error completing purchase:', error);

            Alert.alert(
                'Error',
                'Could not complete this purchase. Please try again.'
            );
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator
                    size="large"
                    color={COLORS.gold}
                />

                <Text style={styles.secondaryText}>
                    Loading purchase...
                </Text>
            </View>
        );
    }

    if (!purchase) {
        return (
            <View style={styles.center}>
                <Text style={styles.title}>
                    Purchase not found
                </Text>

                <Pressable
                    style={styles.button}
                    onPress={() => router.back()}
                >
                    <Text style={styles.buttonText}>
                        Go Back
                    </Text>
                </Pressable>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
            >
                <Pressable onPress={() => router.back()}>
                    <Text style={styles.backText}>
                        ‹  Back to Purchase
                    </Text>
                </Pressable>

                <Text style={styles.title}>
                    Mark as Purchased
                </Text>

                <Text style={styles.description}>
                    Record the details of your completed purchase.
                </Text>

                <View style={styles.card}>
                    <Text style={styles.label}>
                        Product
                    </Text>

                    <Text style={styles.productName}>
                        {purchase.name}
                    </Text>

                    <View style={styles.divider} />

                    <Text style={styles.label}>
                        Estimated Price
                    </Text>

                    <Text style={styles.price}>
                        {formatPrice(purchase.estimatedPrice)}
                    </Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.label}>
                        Actual Price (Optional)
                    </Text>

                    <Text style={styles.helper}>
                        Enter how much you actually paid.
                    </Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Enter actual price"
                        placeholderTextColor={COLORS.muted}
                        keyboardType="decimal-pad"
                        value={actualPrice}
                        onChangeText={setActualPrice}
                        editable={!saving}
                    />

                    <Text style={styles.label}>
                        Purchase Date
                    </Text>

                    <Text style={styles.helper}>
                        Select the date you purchased this item.
                    </Text>

                    <Pressable
                        style={styles.dateInput}
                        onPress={() => setShowDatePicker(true)}
                        disabled={saving}
                    >
                        <Text style={styles.dateText}>
                            {purchaseDate.toLocaleDateString()}
                        </Text>

                        <Text style={styles.calendarIcon}>
                            ▦
                        </Text>
                    </Pressable>

                    {showDatePicker && (
                        <DateTimePicker
                            value={purchaseDate}
                            mode="date"
                            display="default"
                            maximumDate={new Date()}
                            onChange={(event, selectedDate) => {
                                setShowDatePicker(false);

                                if (
                                    event.type === 'set' &&
                                    selectedDate
                                ) {
                                    setPurchaseDate(selectedDate);
                                }
                            }}
                        />
                    )}
                </View>

                <View style={styles.noteCard}>
                    <Text style={styles.noteText}>
                        Your images, estimated price, savings, and other
                        purchase details will be preserved.
                    </Text>
                </View>

                <Pressable
                    style={[
                        styles.button,
                        saving && styles.disabledButton,
                    ]}
                    onPress={handleCompletePurchase}
                    disabled={saving}
                >
                    <Text style={styles.buttonText}>
                        {saving
                            ? 'Saving...'
                            : 'Confirm Purchase'}
                    </Text>
                </Pressable>

                <Pressable
                    style={styles.cancelButton}
                    onPress={() => router.back()}
                    disabled={saving}
                >
                    <Text style={styles.cancelText}>
                        Cancel
                    </Text>
                </Pressable>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    content: {
        padding: 20,
        paddingTop: 60,
        paddingBottom: 40,
    },

    center: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },

    backText: {
        color: COLORS.gold,
        fontSize: 15,
        marginBottom: 25,
    },

    title: {
        color: COLORS.text,
        fontSize: 26,
        fontWeight: 'bold',
    },

    description: {
        color: COLORS.secondary,
        fontSize: 14,
        marginTop: 8,
        marginBottom: 25,
    },

    card: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 18,
        marginBottom: 18,
        borderWidth: 1,
        borderColor: '#333335',
    },

    label: {
        color: COLORS.secondary,
        fontSize: 13,
        marginBottom: 8,
    },

    productName: {
        color: COLORS.text,
        fontSize: 19,
        fontWeight: 'bold',
    },

    price: {
        color: COLORS.gold,
        fontSize: 20,
        fontWeight: 'bold',
    },

    divider: {
        height: 1,
        backgroundColor: COLORS.track,
        marginVertical: 18,
    },

    helper: {
        color: COLORS.muted,
        fontSize: 12,
        marginBottom: 10,
    },

    input: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.track,
        borderRadius: 10,
        padding: 14,
        color: COLORS.text,
        fontSize: 15,
        marginBottom: 22,
    },

    dateInput: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.track,
        borderRadius: 10,
        padding: 14,
        marginBottom: 5,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },

    dateText: {
        color: COLORS.text,
        fontSize: 15,
    },

    calendarIcon: {
        color: COLORS.gold,
        fontSize: 20,
    },

    noteCard: {
        backgroundColor: '#29271F',
        borderRadius: 12,
        padding: 15,
        marginBottom: 20,
    },

    noteText: {
        color: COLORS.secondary,
        fontSize: 12,
        lineHeight: 19,
    },

    button: {
        backgroundColor: COLORS.gold,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },

    buttonText: {
        color: COLORS.background,
        fontSize: 15,
        fontWeight: 'bold',
    },

    disabledButton: {
        opacity: 0.6,
    },

    cancelButton: {
        padding: 15,
        alignItems: 'center',
    },

    cancelText: {
        color: COLORS.secondary,
        fontSize: 14,
    },

    secondaryText: {
        color: COLORS.secondary,
        marginTop: 10,
    },
});
