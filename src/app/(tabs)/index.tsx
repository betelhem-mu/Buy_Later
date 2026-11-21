
import {
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    getPurchases,
    savePurchases,
} from '../../services/purchaseStorage';
import { getMonthlyLimit } from '../../services/monthlyLimitStorage';
import { getActivities } from '../../services/activityStorage';
import type { Purchase } from '../../types/purchase';
import type { PurchaseActivity } from '../../types/activity';
import { useAuth } from '../../contexts/AuthContext';

const COLORS = {
    background: '#101114',
    card: '#242426',
    cardLight: '#303033',
    gold: '#D6B66C',
    goldLight: '#FFF4D6',
    goldDark: '#49391F',
    white: '#F7F4EC',
    grey: '#B5B1A7',
    muted: '#85827B',
    track: '#49443A',
    danger: '#E47777',
};

const formatMoney = (amount: number) =>
    `ETB ${amount.toLocaleString('en-US')}`;

const formatActivityDate = (dateString: string) => {
    const activityDate = new Date(dateString);
    const today = new Date();

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (activityDate.toDateString() === today.toDateString()) {
        return 'Today';
    }

    if (activityDate.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    }

    return activityDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};

const formatActivityAmount = (activity: PurchaseActivity) => {
    if (activity.amount === undefined) {
        return null;
    }

    const amount = formatMoney(activity.amount);

    if (activity.type === 'Savings updated') {
        return `+ ${amount}`;
    }

    return amount;
};

export default function HomeScreen() {
    const { user } = useAuth();

    const userName = user?.name?.trim() || 'User';

    const [savings, setSavings] = useState({
        saved: 0,
        goal: 0,
    });

    const [overduePurchases, setOverduePurchases] = useState<Purchase[]>([]);

    const [upcomingPurchases, setUpcomingPurchases] = useState<Purchase[]>([]);

    const [plannedPurchaseCount, setPlannedPurchaseCount] = useState(0);

    const [monthlyLimit, setMonthlyLimit] = useState<number | null>(null);

    const [monthlyPlannedSpending, setMonthlyPlannedSpending] = useState(0);

    const [activities, setActivities] = useState<PurchaseActivity[]>([]);

    useFocusEffect(
        useCallback(() => {
            let isActive = true;

            const loadHomeData = async () => {
                try {
                    const purchases = await getPurchases();

                    const today = new Date();

                    const todayKey =
                        `${today.getFullYear()}-${String(
                            today.getMonth() + 1
                        ).padStart(2, '0')}-${String(
                            today.getDate()
                        ).padStart(2, '0')}`;

                    const currentYearMonth = todayKey.slice(0, 7);

                    const savedLimit = await getMonthlyLimit(currentYearMonth);

                    // Automatically update overdue purchases
                    const updatedPurchases = purchases.map((purchase) => {
                        const plannedYearMonth =
                            purchase.plannedDate.slice(0, 7);

                        if (
                            purchase.status === 'Active' &&
                            plannedYearMonth < currentYearMonth
                        ) {
                            return {
                                ...purchase,
                                status: 'Overdue' as const,
                            };
                        }

                        return purchase;
                    });

                    // Save automatic overdue updates
                    const hasChanges = updatedPurchases.some(
                        (purchase, index) =>
                            purchase.status !== purchases[index].status
                    );

                    if (hasChanges) {
                        await savePurchases(updatedPurchases);
                    }

                    // Get Active and Overdue purchases
                    const activePurchases = updatedPurchases.filter(
                        (purchase) =>
                            purchase.status === 'Active' ||
                            purchase.status === 'Overdue'
                    );

                    // Calculate total savings
                    const totalSaved = activePurchases.reduce(
                        (total, purchase) =>
                            total + purchase.savedAmount,
                        0
                    );

                    // Calculate total savings goal
                    const totalGoal = activePurchases.reduce(
                        (total, purchase) =>
                            total + purchase.estimatedPrice,
                        0
                    );

                    // Get overdue purchases
                    const overdueItems = updatedPurchases.filter(
                        (purchase) => purchase.status === 'Overdue'
                    );

                    // Get purchases planned for the current month
                    const currentMonthPurchases = updatedPurchases.filter(
                        (purchase) =>
                            purchase.plannedDate.slice(0, 7) === currentYearMonth &&
                            (purchase.status === 'Active' ||
                                purchase.status === 'Overdue')
                    );

                    // Calculate current month's planned spending
                    const plannedSpending = currentMonthPurchases.reduce(
                        (total, purchase) =>
                            total + purchase.estimatedPrice,
                        0
                    );

                    // Get upcoming Active purchases
                    const upcomingItems = updatedPurchases
                        .filter(
                            (purchase) =>
                                purchase.status === 'Active' &&
                                purchase.plannedDate >= todayKey
                        )
                        .sort((a, b) =>
                            a.plannedDate.localeCompare(b.plannedDate)
                        );

                    if (isActive) {
                        setSavings({
                            saved: totalSaved,
                            goal: totalGoal,
                        });

                        setOverduePurchases(overdueItems);

                        setUpcomingPurchases(upcomingItems);

                        setPlannedPurchaseCount(activePurchases.length);

                        setMonthlyLimit(savedLimit);

                        setMonthlyPlannedSpending(plannedSpending);
                    }

                    // Load real recent activities
                    try {
                        const loadedActivities = await getActivities();

                        if (isActive) {
                            setActivities(loadedActivities);
                        }
                    } catch (error) {
                        console.error(
                            'Error loading recent activities:',
                            error
                        );
                    }
                } catch (error) {
                    console.error(
                        'Error loading Home data:',
                        error
                    );
                }
            };

            loadHomeData();

            return () => {
                isActive = false;
            };
        }, [])
    );

    const currentDate = new Date();

    const formattedDate = currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });

    const savingsPercentage =
        savings.goal > 0
            ? Math.min(
                (savings.saved / savings.goal) * 100,
                100
            )
            : 0;

    const spendingPercentage =
        monthlyLimit !== null && monthlyLimit > 0
            ? Math.min(
                (monthlyPlannedSpending / monthlyLimit) * 100,
                100
            )
            : monthlyPlannedSpending > 0
                ? 100
                : 0;

    const remainingLimit =
        monthlyLimit !== null
            ? monthlyLimit - monthlyPlannedSpending
            : null;

    const remainingToSave = Math.max(
        savings.goal - savings.saved,
        0
    );

    const statistics = [
        {
            id: 'plans',
            icon: '▣',
            value: String(plannedPurchaseCount),
            label: 'Planned purchases',
        },
        {
            id: 'remaining',
            icon: '◈',
            value: formatMoney(remainingToSave),
            label: 'Remaining to save',
        },
    ];

    const openPurchaseDetails = (purchaseId: string) => {
        router.push({
            pathname: '/purchase/[id]',
            params: { id: purchaseId },
        });
    };

    const recentActivities = activities.slice(0, 5);

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <StatusBar barStyle="light-content" />

            <View style={styles.container}>
                <ScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* HEADER */}
                    <View style={styles.header}>
                        <View style={styles.headerText}>
                            <Text style={styles.dateText}>
                                {formattedDate.toUpperCase()}
                            </Text>

                            <Text style={styles.greeting}>
                                Hello, {userName}!
                            </Text>

                            <Text style={styles.tagline}>
                                Plan Today. Buy When You're Ready.
                            </Text>
                        </View>

                        <Pressable
                            style={styles.profileAvatar}
                            onPress={() => router.push('/(tabs)/profile')}
                        >
                            <Text style={styles.avatarText}>
                                {userName.charAt(0).toUpperCase()}
                            </Text>
                        </Pressable>
                    </View>

                    {/* SAVINGS OVERVIEW */}
                    <View style={styles.savingsCard}>
                        <Text style={styles.savingsLabel}>
                            YOUR SAVINGS OVERVIEW
                        </Text>

                        <Text style={styles.savingsAmount}>
                            {formatMoney(savings.saved)}
                        </Text>

                        <Text style={styles.savingsDescription}>
                            Total amount saved
                        </Text>

                        <View style={styles.savingsProgressTrack}>
                            <View
                                style={[
                                    styles.savingsProgressFill,
                                    { width: `${savingsPercentage}%` },
                                ]}
                            />
                        </View>

                        <View style={styles.progressLabels}>
                            <Text style={styles.savingsProgressText}>
                                {Math.round(savingsPercentage)}% progress
                            </Text>

                            <Text style={styles.savingsGoalText}>
                                {formatMoney(savings.goal)} goal
                            </Text>
                        </View>

                        <Text style={styles.savingsDescription}>
                            {formatMoney(remainingToSave)} remaining to save
                        </Text>
                    </View>

                    {/* QUICK STATISTICS */}
                    <View style={styles.statisticsContainer}>
                        {statistics.map((item) => (
                            <View key={item.id} style={styles.statCard}>
                                <Text style={styles.statIcon}>
                                    {item.icon}
                                </Text>

                                <Text style={styles.statValue}>
                                    {item.value}
                                </Text>

                                <Text style={styles.statLabel}>
                                    {item.label}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* MONTHLY PURCHASE LIMIT */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View>
                                <Text style={styles.sectionTitle}>
                                    Monthly purchase limit
                                </Text>

                                <Text style={styles.sectionSubtitle}>
                                    Keep your planned spending under control
                                </Text>
                            </View>

                            {monthlyLimit !== null && (
                                <Text style={styles.goldAmount}>
                                    {formatMoney(monthlyLimit)}
                                </Text>
                            )}
                        </View>

                        <View style={styles.limitCard}>
                            {monthlyLimit === null ? (
                                <Text style={styles.emptyText}>
                                    You haven't set a purchase limit for this month yet.
                                    Set one in the Planner.
                                </Text>
                            ) : (
                                <>
                                    <View style={styles.limitAmounts}>
                                        <View>
                                            <Text style={styles.smallLabel}>
                                                Planned spending
                                            </Text>

                                            <Text style={styles.limitValue}>
                                                {formatMoney(monthlyPlannedSpending)}
                                            </Text>
                                        </View>

                                        <View style={styles.remainingContainer}>
                                            <Text style={styles.smallLabel}>
                                                {remainingLimit !== null && remainingLimit < 0
                                                    ? 'Over limit'
                                                    : 'Remaining'}
                                            </Text>

                                            <Text
                                                style={[
                                                    styles.remainingValue,
                                                    remainingLimit !== null &&
                                                        remainingLimit < 0 && {
                                                            color: COLORS.danger,
                                                        },
                                                ]}
                                            >
                                                {formatMoney(
                                                    Math.abs(remainingLimit ?? 0)
                                                )}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.limitProgressTrack}>
                                        <View
                                            style={[
                                                styles.limitProgressFill,
                                                { width: `${spendingPercentage}%` },
                                            ]}
                                        />
                                    </View>

                                    <Text style={styles.limitFooter}>
                                        {Math.round(spendingPercentage)}% of your monthly limit used
                                    </Text>
                                </>
                            )}
                        </View>
                    </View>

                    {/* OVERDUE PURCHASES */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View>
                                <Text style={styles.sectionTitle}>
                                    Overdue purchases
                                </Text>

                                <Text style={styles.sectionSubtitle}>
                                    Purchases that need your attention
                                </Text>
                            </View>

                            {overduePurchases.length > 0 && (
                                <View style={styles.overdueBadge}>
                                    <Text style={styles.overdueBadgeText}>
                                        {overduePurchases.length} overdue
                                    </Text>
                                </View>
                            )}
                        </View>

                        {overduePurchases.length > 0 ? (
                            overduePurchases.map((item) => (
                                <Pressable
                                    key={item.id}
                                    style={styles.overdueCard}
                                    onPress={() => openPurchaseDetails(item.id)}
                                >
                                    <View style={styles.overdueIcon}>
                                        <Text style={styles.overdueIconText}>
                                            !
                                        </Text>
                                    </View>

                                    <View style={styles.purchaseInfo}>
                                        <Text style={styles.purchaseName}>
                                            {item.name}
                                        </Text>

                                        <Text style={styles.purchaseDate}>
                                            Planned for {new Date(
                                                `${item.plannedDate}T00:00:00`
                                            ).toLocaleDateString('en-US', {
                                                month: 'long',
                                                day: 'numeric',
                                                year: 'numeric',
                                            })}
                                        </Text>

                                        <Text style={styles.purchasePrice}>
                                            {formatMoney(item.estimatedPrice)}
                                        </Text>
                                    </View>

                                    <View style={styles.overdueStatus}>
                                        <Text style={styles.overdueStatusText}>
                                            Overdue
                                        </Text>
                                    </View>
                                </Pressable>
                            ))
                        ) : (
                            <View style={styles.emptyCard}>
                                <Text style={styles.emptyText}>
                                    No overdue purchases. You're on track!
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* UPCOMING PURCHASES */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View>
                                <Text style={styles.sectionTitle}>
                                    Upcoming purchases
                                </Text>

                                <Text style={styles.sectionSubtitle}>
                                    Your next planned purchases
                                </Text>
                            </View>

                            <Pressable
                                onPress={() => router.push('/(tabs)/plans')}
                            >
                                <Text style={styles.viewAllText}>
                                    View all →
                                </Text>
                            </Pressable>
                        </View>

                        {upcomingPurchases.length > 0 ? (
                            upcomingPurchases.map((item) => {
                                const progress =
                                    item.estimatedPrice > 0
                                        ? Math.min(
                                            (item.savedAmount / item.estimatedPrice) * 100,
                                            100
                                        )
                                        : 0;

                                return (
                                    <Pressable
                                        key={item.id}
                                        style={styles.upcomingCard}
                                        onPress={() => openPurchaseDetails(item.id)}
                                    >
                                        <View style={styles.productImagePlaceholder}>
                                            <Text style={styles.productIcon}>
                                                ◇
                                            </Text>
                                        </View>

                                        <View style={styles.upcomingInfo}>
                                            <Text style={styles.purchaseName}>
                                                {item.name}
                                            </Text>

                                            <Text style={styles.purchaseDate}>
                                                {new Date(
                                                    `${item.plannedDate}T00:00:00`
                                                ).toLocaleDateString('en-US', {
                                                    month: 'long',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                })}
                                            </Text>

                                            <Text style={styles.purchasePrice}>
                                                {formatMoney(item.estimatedPrice)}
                                            </Text>

                                            <View style={styles.purchaseProgressTrack}>
                                                <View
                                                    style={[
                                                        styles.purchaseProgressFill,
                                                        { width: `${progress}%` },
                                                    ]}
                                                />
                                            </View>

                                            <Text style={styles.savedText}>
                                                {formatMoney(item.savedAmount)} saved · {Math.round(progress)}%
                                            </Text>
                                        </View>

                                        <View style={styles.priorityContainer}>
                                            <Text
                                                style={[
                                                    styles.priorityText,
                                                    item.priority === 'High'
                                                        ? styles.highPriority
                                                        : item.priority === 'Medium'
                                                            ? styles.mediumPriority
                                                            : styles.lowPriority,
                                                ]}
                                            >
                                                {item.priority}
                                            </Text>
                                        </View>
                                    </Pressable>
                                );
                            })
                        ) : (
                            <View style={styles.emptyCard}>
                                <Text style={styles.emptyText}>
                                    No upcoming purchases yet. Plan a purchase to see it here.
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* RECENT ACTIVITY */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View>
                                <Text style={styles.sectionTitle}>
                                    Recent activity
                                </Text>

                                <Text style={styles.sectionSubtitle}>
                                    Your latest updates
                                </Text>
                            </View>

                            {activities.length > 0 && (
                                <Pressable
                                    onPress={() => router.push('/activity-history')}
                                    hitSlop={10}
                                >
                                    <Text style={styles.viewAllText}>
                                        View all →
                                    </Text>
                                </Pressable>
                            )}
                        </View>

                        <View style={styles.activityCard}>
                            {recentActivities.length > 0 ? (
                                recentActivities.map((activity, index) => {
                                    const activityAmount =
                                        formatActivityAmount(activity);

                                    return (
                                        <View
                                            key={activity.id}
                                            style={[
                                                styles.activityItem,
                                                index !== recentActivities.length - 1 &&
                                                    styles.activityBorder,
                                            ]}
                                        >
                                            <View style={styles.activityIcon}>
                                                <Text style={styles.activityIconText}>
                                                    ✓
                                                </Text>
                                            </View>

                                            <View style={styles.activityInfo}>
                                                <Text style={styles.activityTitle}>
                                                    {activity.type}
                                                </Text>

                                                <Text style={styles.activityDescription}>
                                                    {activity.purchaseName}
                                                </Text>
                                            </View>

                                            <View style={styles.activityRight}>
                                                {activityAmount !== null && (
                                                    <Text style={styles.activityAmount}>
                                                        {activityAmount}
                                                    </Text>
                                                )}

                                                <Text style={styles.activityDate}>
                                                    {formatActivityDate(activity.createdAt)}
                                                </Text>
                                            </View>
                                        </View>
                                    );
                                })
                            ) : (
                                <View style={styles.activityEmpty}>
                                    <Text style={styles.emptyText}>
                                        Your recent activity will appear here.
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </ScrollView>

                {/* FIXED BOTTOM BUTTON */}
                <View style={styles.bottomContainer}>
                    <Pressable
                        style={styles.addButton}
                        onPress={() => router.push('/purchase/add')}
                    >
                        <Text style={styles.addButtonIcon}>+</Text>

                        <Text style={styles.addButtonText}>
                            Plan a Purchase
                        </Text>
                    </Pressable>

                    <Text style={styles.bottomMessage}>
                        Make thoughtful purchases, one plan at a time.
                    </Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    scrollView: {
        flex: 1,
    },

    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 28,
        paddingBottom: 20,
    },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 26,
    },

    headerText: {
        flex: 1,
        paddingRight: 12,
    },

    dateText: {
        color: COLORS.muted,
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 1,
        marginBottom: 8,
    },

    greeting: {
        color: COLORS.white,
        fontSize: 27,
        fontWeight: '700',
        marginBottom: 5,
    },

    tagline: {
        color: COLORS.grey,
        fontSize: 12,
    },

    profileAvatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: '#292720',
        borderWidth: 1,
        borderColor: COLORS.gold,
        alignItems: 'center',
        justifyContent: 'center',
    },

    avatarText: {
        color: COLORS.gold,
        fontSize: 19,
        fontWeight: '700',
    },

    savingsCard: {
        backgroundColor: COLORS.gold,
        borderRadius: 20,
        padding: 22,
        marginBottom: 18,
    },

    savingsLabel: {
        color: COLORS.goldDark,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 12,
    },

    savingsAmount: {
        color: '#211A10',
        fontSize: 32,
        fontWeight: '800',
    },

    savingsDescription: {
        color: COLORS.goldDark,
        fontSize: 12,
        marginTop: 4,
    },

    savingsProgressTrack: {
        height: 9,
        backgroundColor: '#A88A4B',
        borderRadius: 10,
        overflow: 'hidden',
        marginTop: 22,
    },

    savingsProgressFill: {
        height: '100%',
        backgroundColor: COLORS.goldLight,
        borderRadius: 10,
    },

    progressLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },

    savingsProgressText: {
        color: COLORS.goldDark,
        fontSize: 11,
        fontWeight: '600',
    },

    savingsGoalText: {
        color: '#332817',
        fontSize: 11,
        fontWeight: '600',
    },

    statisticsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 28,
    },

    statCard: {
        flex: 1,
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 16,
        minHeight: 120,
    },

    statIcon: {
        color: COLORS.gold,
        fontSize: 22,
        marginBottom: 10,
    },

    statValue: {
        color: COLORS.white,
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 5,
    },

    statLabel: {
        color: COLORS.grey,
        fontSize: 11,
    },

    section: {
        marginBottom: 27,
    },

    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },

    sectionTitle: {
        color: COLORS.white,
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 5,
    },

    sectionSubtitle: {
        color: COLORS.muted,
        fontSize: 11,
    },

    goldAmount: {
        color: COLORS.gold,
        fontSize: 12,
        fontWeight: '700',
    },

    limitCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 17,
    },

    limitAmounts: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 17,
    },

    smallLabel: {
        color: COLORS.grey,
        fontSize: 11,
        marginBottom: 6,
    },

    limitValue: {
        color: COLORS.white,
        fontSize: 19,
        fontWeight: '700',
    },

    remainingContainer: {
        alignItems: 'flex-end',
    },

    remainingValue: {
        color: COLORS.gold,
        fontSize: 19,
        fontWeight: '700',
    },

    limitProgressTrack: {
        height: 7,
        backgroundColor: COLORS.track,
        borderRadius: 10,
        overflow: 'hidden',
    },

    limitProgressFill: {
        height: '100%',
        backgroundColor: COLORS.gold,
        borderRadius: 10,
    },

    limitFooter: {
        color: COLORS.muted,
        fontSize: 10,
        marginTop: 9,
    },

    overdueBadge: {
        backgroundColor: '#492B2B',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
    },

    overdueBadgeText: {
        color: '#F19A9A',
        fontSize: 10,
        fontWeight: '600',
    },

    overdueCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderRadius: 15,
        padding: 14,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.danger,
    },

    overdueIcon: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#492B2B',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },

    overdueIconText: {
        color: '#F19A9A',
        fontSize: 20,
        fontWeight: '700',
    },

    overdueStatus: {
        backgroundColor: '#492B2B',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 5,
    },

    overdueStatusText: {
        color: '#F19A9A',
        fontSize: 9,
        fontWeight: '700',
    },

    emptyCard: {
        backgroundColor: COLORS.card,
        padding: 18,
        borderRadius: 14,
    },

    emptyText: {
        color: COLORS.grey,
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 20,
    },

    purchaseInfo: {
        flex: 1,
    },

    purchaseName: {
        color: COLORS.white,
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 5,
    },

    purchaseDate: {
        color: COLORS.muted,
        fontSize: 10,
        marginBottom: 6,
    },

    purchasePrice: {
        color: COLORS.gold,
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 8,
    },

    viewAllText: {
        color: COLORS.gold,
        fontSize: 11,
        fontWeight: '600',
    },

    upcomingCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        alignItems: 'center',
    },

    productImagePlaceholder: {
        width: 76,
        height: 88,
        backgroundColor: COLORS.cardLight,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },

    productIcon: {
        color: COLORS.gold,
        fontSize: 30,
    },

    upcomingInfo: {
        flex: 1,
    },

    purchaseProgressTrack: {
        height: 5,
        backgroundColor: COLORS.track,
        borderRadius: 10,
        overflow: 'hidden',
        marginTop: 2,
    },

    purchaseProgressFill: {
        height: '100%',
        backgroundColor: COLORS.gold,
        borderRadius: 10,
    },

    savedText: {
        color: COLORS.grey,
        fontSize: 9,
        marginTop: 6,
    },

    priorityContainer: {
        alignSelf: 'flex-start',
        marginLeft: 6,
    },

    priorityText: {
        fontSize: 9,
        fontWeight: '700',
        paddingHorizontal: 7,
        paddingVertical: 5,
        borderRadius: 7,
        overflow: 'hidden',
    },

    highPriority: {
        color: '#F0A0A0',
        backgroundColor: '#492B2B',
    },

    mediumPriority: {
        color: COLORS.gold,
        backgroundColor: '#49402D',
    },

    lowPriority: {
        color: '#9BC9A5',
        backgroundColor: '#293D30',
    },

    activityCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        paddingHorizontal: 14,
    },

    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
    },

    activityBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#38383A',
    },

    activityIcon: {
        width: 34,
        height: 34,
        borderRadius: 12,
        backgroundColor: '#37342C',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 11,
    },

    activityIconText: {
        color: COLORS.gold,
        fontSize: 15,
        fontWeight: '700',
    },

    activityInfo: {
        flex: 1,
    },

    activityTitle: {
        color: COLORS.white,
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 4,
    },

    activityDescription: {
        color: COLORS.grey,
        fontSize: 10,
    },

    activityRight: {
        alignItems: 'flex-end',
    },

    activityAmount: {
        color: COLORS.gold,
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 5,
    },

    activityDate: {
        color: COLORS.muted,
        fontSize: 9,
    },

    activityEmpty: {
        paddingVertical: 20,
    },

    bottomContainer: {
        backgroundColor: COLORS.background,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 8,
        borderTopWidth: 1,
        borderTopColor: '#29292B',
        alignItems: 'flex-start',
    },

    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'flex-start',
        backgroundColor: COLORS.gold,
        borderRadius: 12,
        paddingVertical: 9,
        paddingHorizontal: 15,
    },

    addButtonIcon: {
        color: '#211A10',
        fontSize: 18,
        fontWeight: '700',
        marginRight: 7,
    },

    addButtonText: {
        color: '#211A10',
        fontSize: 12,
        fontWeight: '700',
    },

    bottomMessage: {
        color: COLORS.muted,
        textAlign: 'center',
        fontSize: 10,
        marginTop: 9,
    },
});
