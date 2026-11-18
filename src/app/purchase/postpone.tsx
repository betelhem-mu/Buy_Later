
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    SafeAreaView,
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

import type { Purchase } from '../../types/purchase';

const COLORS = {
    background: '#101114',
    card: '#242426',
    gold: '#D6B66C',
    text: '#F7F4EC',
    secondary: '#B5B1A7',
};

export default function PostponePurchaseScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    const [purchase, setPurchase] = useState<Purchase | null>(null);
    const [newDate, setNewDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Load the selected purchase
    const loadPurchase = useCallback(async () => {
        try {
            const purchases = await getPurchases();
            const found = purchases.find((item) => item.id === id);

            if (found) {
                setPurchase(found);
                setNewDate(new Date(found.plannedDate));
            } else {
                setPurchase(null);
            }
        } catch (error) {
            console.error('Error loading purchase:', error);
            Alert.alert('Error', 'Could not load this purchase.');
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

    // Save the new planned date
    const handleSave = async () => {
        if (!purchase) return;

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

        try {
            const purchases = await getPurchases();

            const updatedPurchases = purchases.map((item) => {
                if (item.id !== purchase.id) {
                    return item;
                }

                return {
                    ...item,
                    plannedDate: selectedDate.toISOString(),
                    status:
                        item.status === 'Overdue'
                            ? 'Active'
                            : item.status,
                };
            });

            await savePurchases(updatedPurchases);

            Alert.alert(
                'Purchase Rescheduled',
                'Your new planned date has been saved.',
                [
                    {
                        text: 'OK',
                        onPress: () => router.back(),
                    },
                ]
            );
        } catch (error) {
            console.error('Error postponing purchase:', error);

            Alert.alert(
                'Error',
                'Could not reschedule this purchase.'
            );
        } finally {
            setSaving(false);
        }
    };

    // Loading screen
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

    // Purchase not found
    if (!purchase) {
        return (
            <View style={styles.center}>
                <Text style={styles.title}>
                    Purchase not found
                </Text>

                <Pressable onPress={() => router.back()}>
                    <Text style={styles.backText}>
                        Go Back
                    </Text>
                </Pressable>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Pressable onPress={() => router.back()}>
                    <Text style={styles.backText}>
                        ‹  Back
                    </Text>
                </Pressable>

                <Text style={styles.title}>
                    Postpone Purchase
                </Text>

                <Text style={styles.description}>
                    Choose a new date for your planned purchase.
                </Text>

                {/* Purchase Information */}
                <View style={styles.purchaseCard}>
                    <Text style={styles.purchaseName}>
                        {purchase.name}
                    </Text>

                    <Text style={styles.purchasePrice}>
                        ETB {purchase.estimatedPrice.toLocaleString()}
                    </Text>

                    <Text style={styles.secondaryText}>
                        Current planned date
                    </Text>

                    <Text style={styles.currentDate}>
                        {new Date(
                            purchase.plannedDate
                        ).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        })}
                    </Text>
                </View>

                {/* New Planned Date */}
                <Text style={styles.label}>
                    New Planned Date
                </Text>

                <Pressable
                    style={styles.dateButton}
                    onPress={() => setShowDatePicker(true)}
                >
                    <Text style={styles.dateButtonText}>
                        {newDate.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        })}
                    </Text>

                    <Text style={styles.calendarIcon}>
                        ▦
                    </Text>
                </Pressable>

                {/* Date Picker */}
                {showDatePicker && (
                    <DateTimePicker
                        value={newDate}
                        mode="date"
                        display="default"
                        minimumDate={new Date()}
                        onChange={handleDateChange}
                    />
                )}

                {/* Save Button */}
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

                {/* Cancel Button */}
                <Pressable
                    style={styles.cancelButton}
                    onPress={() => router.back()}
                    disabled={saving}
                >
                    <Text style={styles.cancelButtonText}>
                        Cancel
                    </Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    content: {
        flex: 1,
        padding: 20,
        paddingTop: 25,
    },

    center: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
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
        marginTop: 10,
        marginBottom: 25,
    },

    purchaseCard: {
        backgroundColor: COLORS.card,
        borderRadius: 15,
        padding: 18,
        marginBottom: 28,
    },

    purchaseName: {
        color: COLORS.text,
        fontSize: 19,
        fontWeight: 'bold',
        marginBottom: 7,
    },

    purchasePrice: {
        color: COLORS.gold,
        fontSize: 17,
        fontWeight: 'bold',
        marginBottom: 22,
    },

    secondaryText: {
        color: COLORS.secondary,
        fontSize: 13,
    },

    currentDate: {
        color: COLORS.text,
        fontSize: 15,
        marginTop: 6,
    },

    label: {
        color: COLORS.text,
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 10,
    },

    dateButton: {
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.gold,
        borderRadius: 12,
        padding: 17,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    dateButtonText: {
        color: COLORS.text,
        fontSize: 15,
    },

    calendarIcon: {
        color: COLORS.gold,
        fontSize: 22,
    },

    saveButton: {
        backgroundColor: COLORS.gold,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 35,
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
        padding: 15,
        alignItems: 'center',
        marginTop: 5,
    },

    cancelButtonText: {
        color: COLORS.secondary,
        fontSize: 14,
    },
});
