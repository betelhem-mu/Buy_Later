
import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';

import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    View,
    Pressable,
} from 'react-native';

import {
    getPurchases,
    savePurchases,
} from '../../services/purchaseStorage';

import type { Purchase, PurchaseStatus } from '../../types/purchase';

type PlanFilter = 'All' | 'Active' | 'Purchased' | 'Cancelled';

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
    green: '#A9D0AE',
};

export default function PlansScreen() {
    const router = useRouter();

    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [activeFilter, setActiveFilter] =
        useState<PlanFilter>('All');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const formatDate = (dateString: string) => {
        const date = new Date(`${dateString.slice(0, 10)}T00:00:00`);
        return date.toLocaleDateString();
    };

    const loadPurchases = useCallback(async () => {
        try {
            setError(false);

            const savedPurchases = await getPurchases();
            const today = new Date();

            const currentYearMonth =
                `${today.getFullYear()}-${String(
                    today.getMonth() + 1
                ).padStart(2, '0')}`;

            const updatedPurchases = savedPurchases.map((purchase) => {
                const plannedYearMonth = purchase.plannedDate.slice(0, 7);

                if (
                    purchase.status === 'Active' &&
                    plannedYearMonth < currentYearMonth
                ) {
                    return {
                        ...purchase,
                        status: 'Overdue' as PurchaseStatus,
                    };
                }

                return purchase;
            });

            setPurchases(updatedPurchases);

            const hasChanges = updatedPurchases.some(
                (purchase, index) =>
                    purchase.status !== savedPurchases[index].status
            );

            if (hasChanges) {
                await savePurchases(updatedPurchases);
            }
        } catch (error) {
            console.error('Error loading purchases:', error);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            loadPurchases();
        }, [loadPurchases])
    );

    const filteredPurchases = purchases.filter((purchase) => {
        if (activeFilter === 'All') {
            return true;
        }

        if (activeFilter === 'Active') {
            return (
                purchase.status === 'Active' ||
                purchase.status === 'Overdue'
            );
        }

        return purchase.status === activeFilter;
    });

    const formatPrice = (price: number) => {
        return `ETB ${price.toLocaleString()}`;
    };

    const getProgress = (purchase: Purchase) => {
        if (purchase.estimatedPrice <= 0) {
            return 0;
        }

        return Math.min(
            (purchase.savedAmount / purchase.estimatedPrice) * 100,
            100
        );
    };

    const openPurchaseDetails = (purchaseId: string) => {
        router.push({
            pathname: '/purchase/[id]',
            params: { id: purchaseId },
        });
    };

    const getPriceDifference = (purchase: Purchase) => {
        if (purchase.actualPrice === undefined) {
            return null;
        }

        const difference =
            purchase.actualPrice - purchase.estimatedPrice;

        if (difference > 0) {
            return {
                text: `${formatPrice(difference)} over estimate`,
                color: COLORS.red,
            };
        }

        if (difference < 0) {
            return {
                text: `${formatPrice(Math.abs(difference))} under estimate`,
                color: COLORS.green,
            };
        }

        return {
            text: 'Purchased at estimated price',
            color: COLORS.green,
        };
    };

    const getStatusStyle = (status: PurchaseStatus) => {
        switch (status) {
            case 'Overdue':
                return styles.overdueBadge;

            case 'Purchased':
                return styles.purchasedBadge;

            case 'Cancelled':
                return styles.cancelledBadge;

            default:
                return styles.activeBadge;
        }
    };

    const renderPurchase = (purchase: Purchase) => {
        const progress = getProgress(purchase);
        const priceDifference = getPriceDifference(purchase);

        return (
            <Pressable
                key={purchase.id}
                style={styles.purchaseCard}
                onPress={() => openPurchaseDetails(purchase.id)}
            >
                <View style={styles.purchaseTop}>
                    {purchase.images.length > 0 ? (
                        <Image
                            source={{ uri: purchase.images[0] }}
                            style={styles.productImage}
                        />
                    ) : (
                        <View style={styles.imagePlaceholder}>
                            <Text style={styles.placeholderText}>
                                No Image
                            </Text>
                        </View>
                    )}

                    <View style={styles.purchaseInfo}>
                        <Text style={styles.purchaseName}>
                            {purchase.name}
                        </Text>

                        <Text style={styles.purchasePrice}>
                            {formatPrice(purchase.estimatedPrice)}
                        </Text>

                        <View style={styles.badges}>
                            <Text
                                style={[
                                    styles.priorityBadge,
                                    purchase.priority === 'High' &&
                                        styles.highPriority,
                                    purchase.priority === 'Medium' &&
                                        styles.mediumPriority,
                                    purchase.priority === 'Low' &&
                                        styles.lowPriority,
                                ]}
                            >
                                {purchase.priority}
                            </Text>

                            <Text
                                style={[
                                    styles.statusBadge,
                                    getStatusStyle(purchase.status),
                                ]}
                            >
                                {purchase.status}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.dateRow}>
                    <Text style={styles.detailLabel}>
                        Planned Date
                    </Text>

                    <Text style={styles.detailValue}>
                        {formatDate(purchase.plannedDate)}
                    </Text>
                </View>

                {purchase.status === 'Purchased' && (
                    <View style={styles.purchasedInformation}>
                        <View style={styles.informationRow}>
                            <Text style={styles.detailLabel}>
                                Purchase Date
                            </Text>

                            <Text style={styles.detailValue}>
                                {purchase.purchasedAt
                                    ? formatDate(purchase.purchasedAt)
                                    : 'Not recorded'}
                            </Text>
                        </View>

                        <View style={styles.informationRow}>
                            <Text style={styles.detailLabel}>
                                Actual Price
                            </Text>

                            <Text style={styles.actualPrice}>
                                {purchase.actualPrice !== undefined
                                    ? formatPrice(purchase.actualPrice)
                                    : 'Not recorded'}
                            </Text>
                        </View>

                        {priceDifference && (
                            <Text
                                style={[
                                    styles.priceDifference,
                                    { color: priceDifference.color },
                                ]}
                            >
                                {priceDifference.text}
                            </Text>
                        )}
                    </View>
                )}

                <View style={styles.savingsHeader}>
                    <Text style={styles.detailLabel}>
                        Savings Progress
                    </Text>

                    <Text style={styles.progressText}>
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

                <View style={styles.savingsFooter}>
                    <Text style={styles.detailLabel}>
                        Saved: {formatPrice(purchase.savedAmount)}
                    </Text>

                    <Text style={styles.detailLabel}>
                        Remaining: {formatPrice(
                            Math.max(
                                purchase.estimatedPrice -
                                    purchase.savedAmount,
                                0
                            )
                        )}
                    </Text>
                </View>

                {purchase.images.length > 1 && (
                    <Text style={styles.imageCount}>
                        {purchase.images.length} product images
                    </Text>
                )}

                <Text style={styles.tapHint}>
                    Tap to view details →
                </Text>
            </Pressable>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>My Plans</Text>

                <Text style={styles.subtitle}>
                    Keep track of the things you plan to buy.
                </Text>
            </View>

            {/* FILTER BUTTONS */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterScroll}
                contentContainerStyle={styles.filterContainer}
            >
                {(['All', 'Active', 'Purchased', 'Cancelled'] as const).map(
                    (filter) => (
                        <Pressable
                            key={filter}
                            style={[
                                styles.filterButton,
                                activeFilter === filter &&
                                    styles.selectedFilter,
                            ]}
                            onPress={() => setActiveFilter(filter)}
                        >
                            <Text
                                style={[
                                    styles.filterText,
                                    activeFilter === filter &&
                                        styles.selectedFilterText,
                                ]}
                            >
                                {filter}
                            </Text>
                        </Pressable>
                    )
                )}
            </ScrollView>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator
                        size="large"
                        color={COLORS.gold}
                    />

                    <Text style={styles.loadingText}>
                        Loading your purchases...
                    </Text>
                </View>
            ) : error ? (
                <View style={styles.centerContainer}>
                    <Text style={styles.emptyTitle}>
                        Could not load purchases
                    </Text>

                    <Pressable
                        style={styles.retryButton}
                        onPress={() => {
                            setLoading(true);
                            loadPurchases();
                        }}
                    >
                        <Text style={styles.retryText}>
                            Try Again
                        </Text>
                    </Pressable>
                </View>
            ) : filteredPurchases.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Text style={styles.emptyTitle}>
                        {activeFilter === 'All'
                            ? 'No purchases yet'
                            : `No ${activeFilter.toLowerCase()} purchases yet`}
                    </Text>

                    <Text style={styles.emptySubtitle}>
                        Your saved purchases will appear here.
                    </Text>
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                >
                    <Text style={styles.resultCount}>
                        {filteredPurchases.length}{' '}
                        {filteredPurchases.length === 1
                            ? 'purchase'
                            : 'purchases'}
                    </Text>

                    {filteredPurchases.map(renderPurchase)}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        paddingTop: 55,
    },

    header: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },

    title: {
        fontSize: 27,
        fontWeight: 'bold',
        color: COLORS.text,
    },

    subtitle: {
        fontSize: 14,
        color: COLORS.secondary,
        marginTop: 7,
    },

    // FIXED FILTER CONTAINER
    filterScroll: {
        height: 54,
        flexGrow: 0,
        flexShrink: 0,
        marginBottom: 15,
    },

    filterContainer: {
        paddingHorizontal: 20,
        alignItems: 'center',
        height: 54,
        gap: 10,
    },

    // FIXED FILTER BUTTON
    filterButton: {
        height: 42,
        minWidth: 82,
        paddingHorizontal: 18,
        borderRadius: 22,
        backgroundColor: COLORS.card,
        alignItems: 'center',
        justifyContent: 'center',
    },

    selectedFilter: {
        backgroundColor: COLORS.gold,
    },

    // FIXED FILTER TEXT
    filterText: {
        color: COLORS.secondary,
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '600',
        includeFontPadding: false,
        textAlignVertical: 'center',
        textAlign: 'center',
    },

    selectedFilterText: {
        color: '#101114',
    },

    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 30,
    },

    resultCount: {
        color: COLORS.secondary,
        fontSize: 13,
        marginBottom: 15,
    },

    purchaseCard: {
        backgroundColor: COLORS.card,
        borderRadius: 17,
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#333335',
    },

    purchaseTop: {
        flexDirection: 'row',
        gap: 13,
    },

    productImage: {
        width: 90,
        height: 90,
        borderRadius: 12,
        backgroundColor: COLORS.background,
    },

    imagePlaceholder: {
        width: 90,
        height: 90,
        borderRadius: 12,
        backgroundColor: '#343436',
        alignItems: 'center',
        justifyContent: 'center',
    },

    placeholderText: {
        fontSize: 11,
        color: COLORS.muted,
    },

    purchaseInfo: {
        flex: 1,
        justifyContent: 'center',
    },

    purchaseName: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 6,
    },

    purchasePrice: {
        color: COLORS.gold,
        fontSize: 15,
        fontWeight: 'bold',
        marginBottom: 8,
    },

    badges: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },

    priorityBadge: {
        fontSize: 10,
        fontWeight: 'bold',
        paddingVertical: 5,
        paddingHorizontal: 8,
        borderRadius: 6,
        overflow: 'hidden',
        includeFontPadding: false,
    },

    highPriority: {
        backgroundColor: '#583333',
        color: '#F0AAAA',
    },

    mediumPriority: {
        backgroundColor: '#51472E',
        color: COLORS.goldLight,
    },

    lowPriority: {
        backgroundColor: '#343F36',
        color: '#A9D0AE',
    },

    statusBadge: {
        fontSize: 10,
        fontWeight: 'bold',
        paddingVertical: 5,
        paddingHorizontal: 8,
        borderRadius: 6,
        overflow: 'hidden',
        includeFontPadding: false,
    },

    activeBadge: {
        backgroundColor: '#343F36',
        color: COLORS.green,
    },

    overdueBadge: {
        backgroundColor: '#583333',
        color: COLORS.red,
    },

    purchasedBadge: {
        backgroundColor: '#343F36',
        color: COLORS.green,
    },

    cancelledBadge: {
        backgroundColor: '#583333',
        color: COLORS.red,
    },

    dateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 18,
        marginBottom: 15,
    },

    detailLabel: {
        color: COLORS.secondary,
        fontSize: 12,
    },

    detailValue: {
        color: COLORS.text,
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'right',
    },

    purchasedInformation: {
        backgroundColor: COLORS.background,
        borderRadius: 10,
        padding: 12,
        marginBottom: 17,
        gap: 12,
    },

    informationRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
    },

    actualPrice: {
        color: COLORS.gold,
        fontSize: 13,
        fontWeight: 'bold',
    },

    priceDifference: {
        fontSize: 11,
        fontWeight: '600',
    },

    savingsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },

    progressText: {
        color: COLORS.gold,
        fontSize: 12,
        fontWeight: 'bold',
    },

    progressTrack: {
        height: 7,
        borderRadius: 5,
        backgroundColor: COLORS.track,
        overflow: 'hidden',
    },

    progressFill: {
        height: '100%',
        borderRadius: 5,
        backgroundColor: COLORS.gold,
    },

    savingsFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 9,
        gap: 10,
    },

    imageCount: {
        color: COLORS.muted,
        fontSize: 11,
        marginTop: 12,
    },

    tapHint: {
        color: COLORS.gold,
        fontSize: 11,
        textAlign: 'right',
        marginTop: 12,
    },

    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 25,
    },

    loadingText: {
        color: COLORS.secondary,
        marginTop: 12,
        fontSize: 13,
    },

    emptyTitle: {
        color: COLORS.text,
        fontSize: 17,
        fontWeight: 'bold',
        textAlign: 'center',
    },

    emptySubtitle: {
        color: COLORS.secondary,
        fontSize: 13,
        marginTop: 8,
        textAlign: 'center',
    },

    retryButton: {
        backgroundColor: COLORS.gold,
        paddingVertical: 11,
        paddingHorizontal: 22,
        borderRadius: 10,
        marginTop: 15,
    },

    retryText: {
        color: COLORS.background,
        fontWeight: 'bold',
    },
});
