
import { addActivity } from '../../services/activityStorage';
import { useCallback, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Modal,
    TextInput,
    Alert,
    StatusBar,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Purchase } from '../../types/purchase';
import {
    cancelAllPurchaseNotifications,
} from '../../services/notifications/notificationService';

const COLORS = {
    background: '#101114',
    card: '#242426',
    gold: '#D6B66C',
    goldLight: '#FFF4D6',
    text: '#F7F4EC',
    secondary: '#B5B1A7',
    muted: '#85827B',
    red: '#E47777',
    track: '#49443A',
};

const STORAGE_KEY = 'buylater_purchases';

function formatPrice(price: number): string {
    return `ETB ${price.toLocaleString()}`;
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
        </View>
    );
}

export default function PurchaseDetailsScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [purchase, setPurchase] = useState<Purchase | null>(null);
    const [loading, setLoading] = useState(true);
    const [menuVisible, setMenuVisible] = useState(false);
    const [savingsModalVisible, setSavingsModalVisible] = useState(false);
    const [imageModalVisible, setImageModalVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [savingsInput, setSavingsInput] = useState('');

    const loadPurchase = useCallback(async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            const purchases: Purchase[] = stored ? JSON.parse(stored) : [];
            const found = purchases.find((item) => item.id === id);

            setPurchase(found ?? null);
        } catch (error) {
            console.error('Error loading purchase:', error);
            Alert.alert('Error', 'Could not load purchase details.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useFocusEffect(
        useCallback(() => {
            loadPurchase();
        }, [loadPurchase])
    );

    const handleCancelPurchase = () => {
        if (!purchase) return;

        Alert.alert(
            'Cancel Purchase',
            `Are you sure you want to cancel "${purchase.name}"?`,
            [
                { text: 'Keep Purchase', style: 'cancel' },
                {
                    text: 'Cancel Purchase',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const stored = await AsyncStorage.getItem(STORAGE_KEY);
                            const purchases: Purchase[] = stored
                                ? JSON.parse(stored)
                                : [];

                            const updatedPurchases = purchases.map((item) =>
                                item.id === purchase.id
                                    ? {
                                        ...item,
                                        status: 'Cancelled' as const,
                                        reminderNotificationIds: [],
                                        overdueNotificationId: undefined,
                                        notificationsScheduled: false,
                                    }
                                    : item
                            );

                            await AsyncStorage.setItem(
                                STORAGE_KEY,
                                JSON.stringify(updatedPurchases)
                            );

                            // Record the cancellation in Recent Activity
                            try {
                                await addActivity({
                                    type: 'Purchase cancelled',
                                    purchaseId: purchase.id,
                                    purchaseName: purchase.name,
                                });
                            } catch (activityError) {
                                console.error(
                                    'Could not record cancellation activity:',
                                    activityError
                                );
                            }

                            await cancelAllPurchaseNotifications(
                                purchase.reminderNotificationIds ?? [],
                                purchase.overdueNotificationId
                            );

                            Alert.alert(
                                'Purchase Cancelled',
                                'The purchase has been moved to your Cancelled archive.'
                            );

                            router.replace('/(tabs)/plans');
                        } catch (error) {
                            console.error('Error cancelling purchase:', error);
                            Alert.alert(
                                'Error',
                                'Could not cancel this purchase.'
                            );
                        }
                    },
                },
            ]
        );
    };

    const handleUpdateSavings = async () => {
        if (!purchase) return;

        const amount = Number(savingsInput);

        if (
            savingsInput.trim() === '' ||
            !Number.isFinite(amount) ||
            amount <= 0
        ) {
            Alert.alert('Invalid Amount', 'Enter a valid amount greater than zero.');
            return;
        }

        if (amount > purchase.estimatedPrice - purchase.savedAmount) {
            Alert.alert(
                'Invalid Amount',
                'The amount cannot be greater than the remaining amount.'
            );
            return;
        }

        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            const purchases: Purchase[] = stored ? JSON.parse(stored) : [];

            const updatedPurchases = purchases.map((item) =>
                item.id === purchase.id
                    ? {
                        ...item,
                        savedAmount: item.savedAmount + amount,
                    }
                    : item
            );

            await AsyncStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(updatedPurchases)
            );

            // Record the amount added in Recent Activity
            try {
                await addActivity({
                    type: 'Savings updated',
                    purchaseId: purchase.id,
                    purchaseName: purchase.name,
                    amount: amount,
                });
            } catch (activityError) {
                console.error(
                    'Could not record savings activity:',
                    activityError
                );
            }

            setSavingsModalVisible(false);
            setSavingsInput('');
            await loadPurchase();

            Alert.alert('Success', 'Your savings have been updated.');
        } catch (error) {
            console.error('Error updating savings:', error);
            Alert.alert('Error', 'Could not update your savings.');
        }
    };

    const handleOpenImage = (uri: string) => {
        setSelectedImage(uri);
        setImageModalVisible(true);
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <StatusBar barStyle="light-content" />
                <ActivityIndicator size="large" color={COLORS.gold} />
            </SafeAreaView>
        );
    }

    if (!purchase) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <StatusBar barStyle="light-content" />
                <Text style={styles.notFoundText}>Purchase not found.</Text>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const remainingAmount = Math.max(
        purchase.estimatedPrice - purchase.savedAmount,
        0
    );

    const progress = purchase.estimatedPrice > 0
        ? Math.min(
            (purchase.savedAmount / purchase.estimatedPrice) * 100,
            100
        )
        : 0;

    const statusStyles = {
        Active: {
            badge: styles.activeBadge,
            text: styles.activeBadgeText,
        },
        Overdue: {
            badge: styles.overdueBadge,
            text: styles.overdueBadgeText,
        },
        Purchased: {
            badge: styles.purchasedBadge,
            text: styles.purchasedBadgeText,
        },
        Cancelled: {
            badge: styles.cancelledBadge,
            text: styles.cancelledBadgeText,
        },
    };

    const currentStatusStyle = statusStyles[purchase.status];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="light-content" />

            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backText}>‹  Back to My Plans</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.menuButton}
                    onPress={() => setMenuVisible(!menuVisible)}
                >
                    <Text style={styles.menuButtonText}>•••</Text>
                </TouchableOpacity>
            </View>

            {menuVisible && (
                <View style={styles.actionMenu}>
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => {
                            setMenuVisible(false);
                            router.push({
                                pathname: '/purchase/add',
                                params: { id: purchase.id },
                            });
                        }}
                    >
                        <Text style={styles.menuItemText}>Edit Purchase</Text>
                    </TouchableOpacity>

                    {(purchase.status === 'Active' ||
                        purchase.status === 'Overdue') && (
                        <>
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => {
                                    setMenuVisible(false);
                                    router.push({
                                        pathname: '/purchase/postpone',
                                        params: { id: purchase.id },
                                    });
                                }}
                            >
                                <Text style={styles.menuItemText}>
                                    Postpone Purchase
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => {
                                    setMenuVisible(false);
                                    setSavingsInput('');
                                    setSavingsModalVisible(true);
                                }}
                            >
                                <Text style={styles.menuItemText}>
                                    Update Savings
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => {
                                    setMenuVisible(false);
                                    router.push({
                                        pathname: '/purchase/complete',
                                        params: { id: purchase.id },
                                    });
                                }}
                            >
                                <Text style={styles.menuItemText}>
                                    Mark as Purchased
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => {
                                    setMenuVisible(false);
                                    handleCancelPurchase();
                                }}
                            >
                                <Text style={styles.cancelMenuText}>
                                    Cancel Purchase
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            )}

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.headerSection}>
                    <Text style={styles.title}>{purchase.name}</Text>

                    <Text style={styles.price}>
                        {formatPrice(purchase.estimatedPrice)}
                    </Text>

                    <View style={[styles.statusBadge, currentStatusStyle.badge]}>
                        <Text
                            style={[
                                styles.statusBadgeText,
                                currentStatusStyle.text,
                            ]}
                        >
                            {purchase.status}
                        </Text>
                    </View>
                </View>

                {purchase.images && purchase.images.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Product Images</Text>

                        <View style={styles.imageGrid}>
                            {purchase.images.map((uri, index) => (
                                <TouchableOpacity
                                    key={`${uri}-${index}`}
                                    onPress={() => handleOpenImage(uri)}
                                >
                                    <Image
                                        source={{ uri }}
                                        style={styles.productImage}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Purchase Information</Text>

                    <View style={styles.infoCard}>
                        <InfoRow
                            label="Priority"
                            value={purchase.priority}
                        />

                        <InfoRow
                            label="Planned Date"
                            value={new Date(
                                purchase.plannedDate
                            ).toLocaleDateString()}
                        />

                        <InfoRow
                            label="Created On"
                            value={new Date(
                                purchase.createdAt
                            ).toLocaleDateString()}
                        />

                        {purchase.status === 'Purchased' && (
                            <>
                                {purchase.actualPrice !== undefined && (
                                    <>
                                        <InfoRow
                                            label="Actual Price"
                                            value={formatPrice(purchase.actualPrice)}
                                        />

                                        <View style={styles.comparisonCard}>
                                            <Text style={styles.comparisonTitle}>
                                                Spending Comparison
                                            </Text>

                                            <Text
                                                style={[
                                                    styles.comparisonValue,
                                                    purchase.actualPrice >
                                                    purchase.estimatedPrice
                                                        ? styles.spentMore
                                                        : purchase.actualPrice <
                                                            purchase.estimatedPrice
                                                            ? styles.spentLess
                                                            : styles.spentEqual,
                                                ]}
                                            >
                                                {purchase.actualPrice >
                                                purchase.estimatedPrice
                                                    ? `${formatPrice(
                                                        purchase.actualPrice -
                                                        purchase.estimatedPrice
                                                    )} more than estimated`
                                                    : purchase.actualPrice <
                                                        purchase.estimatedPrice
                                                        ? `${formatPrice(
                                                            purchase.estimatedPrice -
                                                            purchase.actualPrice
                                                        )} less than estimated`
                                                        : 'Exactly as estimated'}
                                            </Text>
                                        </View>
                                    </>
                                )}

                                {purchase.purchasedAt && (
                                    <InfoRow
                                        label="Purchase Date"
                                        value={new Date(
                                            `${purchase.purchasedAt}T00:00:00`
                                        ).toLocaleDateString()}
                                    />
                                )}
                            </>
                        )}
                    </View>
                </View>

                {(purchase.status === 'Active' ||
                    purchase.status === 'Overdue' ||
                    purchase.status === 'Purchased') && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Savings Progress</Text>

                        <View style={styles.savingsCard}>
                            <View style={styles.progressHeader}>
                                <Text style={styles.progressLabel}>
                                    Amount Saved
                                </Text>

                                <Text style={styles.progressPercentage}>
                                    {progress.toFixed(0)}%
                                </Text>
                            </View>

                            <View style={styles.progressTrack}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        { width: `${progress}%` },
                                    ]}
                                />
                            </View>

                            <View style={styles.savingsDetails}>
                                <View>
                                    <Text style={styles.savingsAmount}>
                                        {formatPrice(purchase.savedAmount)}
                                    </Text>
                                    <Text style={styles.savingsCaption}>
                                        Saved
                                    </Text>
                                </View>

                                <View style={styles.remainingContainer}>
                                    <Text style={styles.remainingAmount}>
                                        {formatPrice(remainingAmount)}
                                    </Text>
                                    <Text style={styles.savingsCaption}>
                                        Remaining
                                    </Text>
                                </View>
                            </View>

                            <Text style={styles.targetText}>
                                Target: {formatPrice(purchase.estimatedPrice)}
                            </Text>
                        </View>
                    </View>
                )}
            </ScrollView>

            <Modal
                visible={savingsModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setSavingsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Update Savings</Text>

                        <Text style={styles.modalDescription}>
                            Enter the amount you want to add to your savings.
                        </Text>

                        <TextInput
                            style={styles.modalInput}
                            placeholder="Enter amount"
                            placeholderTextColor={COLORS.muted}
                            keyboardType="decimal-pad"
                            value={savingsInput}
                            onChangeText={setSavingsInput}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => {
                                    setSavingsModalVisible(false);
                                    setSavingsInput('');
                                }}
                            >
                                <Text style={styles.cancelButtonText}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={handleUpdateSavings}
                            >
                                <Text style={styles.saveButtonText}>
                                    Save
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={imageModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setImageModalVisible(false)}
            >
                <View style={styles.imageModalOverlay}>
                    <TouchableOpacity
                        style={styles.closeImageButton}
                        onPress={() => setImageModalVisible(false)}
                    >
                        <Text style={styles.closeImageText}>✕</Text>
                    </TouchableOpacity>

                    {selectedImage && (
                        <Image
                            source={{ uri: selectedImage }}
                            style={styles.enlargedImage}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notFoundText: {
        color: COLORS.text,
        fontSize: 16,
        marginBottom: 20,
    },
    backButton: {
        backgroundColor: COLORS.gold,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 10,
    },
    backButtonText: {
        color: COLORS.background,
        fontWeight: 'bold',
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    backText: {
        color: COLORS.gold,
        fontSize: 15,
        fontWeight: '600',
    },
    menuButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: COLORS.card,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuButtonText: {
        color: COLORS.text,
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    actionMenu: {
        position: 'absolute',
        top: 65,
        right: 20,
        zIndex: 10,
        elevation: 10,
        width: 205,
        backgroundColor: COLORS.card,
        borderRadius: 14,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: '#393939',
    },
    menuItem: {
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    menuItemText: {
        color: COLORS.text,
        fontSize: 14,
    },
    cancelMenuText: {
        color: COLORS.red,
        fontSize: 14,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    headerSection: {
        paddingTop: 14,
        paddingBottom: 20,
    },
    title: {
        color: COLORS.text,
        fontSize: 27,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    price: {
        color: COLORS.gold,
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 14,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
    },
    statusBadgeText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    activeBadge: {
        backgroundColor: '#3A3221',
    },
    activeBadgeText: {
        color: COLORS.gold,
    },
    overdueBadge: {
        backgroundColor: '#442929',
    },
    overdueBadgeText: {
        color: COLORS.red,
    },
    purchasedBadge: {
        backgroundColor: '#243C30',
    },
    purchasedBadgeText: {
        color: '#7BBE8A',
    },
    cancelledBadge: {
        backgroundColor: '#353535',
    },
    cancelledBadgeText: {
        color: COLORS.secondary,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        color: COLORS.text,
        fontSize: 17,
        fontWeight: 'bold',
        marginBottom: 13,
    },
    imageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    productImage: {
        width: 105,
        height: 105,
        borderRadius: 12,
        backgroundColor: COLORS.card,
    },
    infoCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 16,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#383838',
    },
    infoLabel: {
        color: COLORS.secondary,
        fontSize: 13,
    },
    infoValue: {
        color: COLORS.text,
        fontSize: 13,
        fontWeight: '600',
    },
    comparisonCard: {
        backgroundColor: '#18191C',
        borderRadius: 12,
        padding: 14,
        marginTop: 12,
        marginBottom: 8,
    },
    comparisonTitle: {
        color: COLORS.secondary,
        fontSize: 12,
        marginBottom: 8,
    },
    comparisonValue: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    spentMore: {
        color: COLORS.red,
    },
    spentLess: {
        color: '#7BBE8A',
    },
    spentEqual: {
        color: COLORS.gold,
    },
    savingsCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 18,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    progressLabel: {
        color: COLORS.secondary,
        fontSize: 13,
    },
    progressPercentage: {
        color: COLORS.gold,
        fontSize: 16,
        fontWeight: 'bold',
    },
    progressTrack: {
        height: 9,
        backgroundColor: COLORS.track,
        borderRadius: 10,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: COLORS.gold,
        borderRadius: 10,
    },
    savingsDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 18,
    },
    savingsAmount: {
        color: COLORS.goldLight,
        fontSize: 17,
        fontWeight: 'bold',
    },
    remainingContainer: {
        alignItems: 'flex-end',
    },
    remainingAmount: {
        color: COLORS.text,
        fontSize: 17,
        fontWeight: 'bold',
    },
    savingsCaption: {
        color: COLORS.muted,
        fontSize: 12,
        marginTop: 5,
    },
    targetText: {
        color: COLORS.muted,
        fontSize: 12,
        marginTop: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalCard: {
        width: '100%',
        backgroundColor: COLORS.card,
        borderRadius: 18,
        padding: 22,
    },
    modalTitle: {
        color: COLORS.text,
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    modalDescription: {
        color: COLORS.secondary,
        fontSize: 13,
        lineHeight: 20,
        marginBottom: 18,
    },
    modalInput: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: '#49443A',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 13,
        color: COLORS.text,
        fontSize: 15,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 20,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: 10,
        backgroundColor: '#383838',
        alignItems: 'center',
    },
    cancelButtonText: {
        color: COLORS.text,
        fontWeight: '600',
    },
    saveButton: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: 10,
        backgroundColor: COLORS.gold,
        alignItems: 'center',
    },
    saveButtonText: {
        color: COLORS.background,
        fontWeight: 'bold',
    },
    imageModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeImageButton: {
        position: 'absolute',
        top: 55,
        right: 25,
        zIndex: 2,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.card,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeImageText: {
        color: COLORS.text,
        fontSize: 18,
    },
    enlargedImage: {
        width: '100%',
        height: '75%',
    },
});
