
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
};

export default function PlansScreen() {
    const router = useRouter();

    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [activeFilter, setActiveFilter] =
        useState<PlanFilter>('All');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    // Load purchases whenever this screen becomes active
    const loadPurchases = async () => {
        try {
            setError(false);

            const savedPurchases = await getPurchases();

            // Update overdue purchases
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const updatedPurchases = savedPurchases.map((purchase) => {
                if (
                    purchase.status === 'Active' &&
                    new Date(purchase.plannedDate) < today
                ) {
                    return {
                        ...purchase,
                        status: 'Overdue' as PurchaseStatus,
                    };
                }

                return purchase;
            });

            setPurchases(updatedPurchases);

            // Save automatic overdue updates
            if (
                updatedPurchases.some(
                    (purchase, index) =>
                        purchase.status !== savedPurchases[index].status
                )
            ) {
                await savePurchases(updatedPurchases);
            }
        } catch (error) {
            console.error('Error loading purchases:', error);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            loadPurchases();
        }, [])
    );

    // Filter purchases
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

    const getStatusLabel = (status: PurchaseStatus) => {
        return status === 'Overdue' ? 'Overdue' : status;
    };

    // Open the selected purchase details
    const openPurchaseDetails = (purchaseId: string) => {
        router.push({
            pathname: '/purchase/[id]',
            params: { id: purchaseId },
        });
    };

    const renderPurchase = (purchase: Purchase) => {
        const progress = getProgress(purchase);

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
                                    purchase.status === 'Overdue' &&
                                        styles.overdueBadge,
                                ]}
                            >
                                {getStatusLabel(purchase.status)}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.dateRow}>
                    <Text style={styles.detailLabel}>
                        Planned Date
                    </Text>

                    <Text style={styles.detailValue}>
                        {new Date(
                            purchase.plannedDate
                        ).toLocaleDateString()}
                    </Text>
                </View>

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

            {/* Filters */}
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

            {/* Purchase List */}
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
                        No {activeFilter === 'All' ? '' : activeFilter.toLowerCase() + ' '}purchases yet
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
                        {filteredPurchases.length} purchases
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

    filterScroll: {
        flexGrow: 0,
        marginBottom: 15,
    },

    filterContainer: {
        paddingHorizontal: 20,
        gap: 10,
    },

    filterButton: {
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 20,
        backgroundColor: COLORS.card,
    },

    selectedFilter: {
        backgroundColor: COLORS.gold,
    },

    filterText: {
        color: COLORS.secondary,
        fontSize: 13,
        fontWeight: '600',
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
        backgroundColor: '#343436',
        color: COLORS.secondary,
    },

    overdueBadge: {
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
