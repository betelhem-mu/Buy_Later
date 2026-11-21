
import { useCallback, useState } from 'react';
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

import { getActivities } from '../services/activityStorage';
import type { PurchaseActivity } from '../types/activity';

const formatActivityDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return `Today · ${date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        })}`;
    }

    if (date.toDateString() === yesterday.toDateString()) {
        return `Yesterday · ${date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        })}`;
    }

    return date.toLocaleString([], {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatActivityAmount = (activity: PurchaseActivity) => {
    if (activity.amount === undefined) {
        return null;
    }

    const amount = `ETB ${activity.amount.toLocaleString()}`;

    if (activity.type === 'Savings updated') {
        return `+ ${amount}`;
    }

    if (
        activity.type === 'Purchase planned' ||
        activity.type === 'Purchase completed'
    ) {
        return amount;
    }

    return null;
};

const getActivityIcon = (type: PurchaseActivity['type']) => {
    switch (type) {
        case 'Purchase planned':
            return '＋';
        case 'Savings updated':
            return '↗';
        case 'Purchase completed':
            return '✓';
        case 'Purchase cancelled':
            return '×';
        default:
            return '•';
    }
};

export default function ActivityHistoryScreen() {
    const [activities, setActivities] = useState<PurchaseActivity[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            const loadActivities = async () => {
                try {
                    setLoading(true);
                    const storedActivities = await getActivities();
                    setActivities(storedActivities);
                } catch (error) {
                    console.error('Error loading activity history:', error);
                } finally {
                    setLoading(false);
                }
            };

            loadActivities();
        }, [])
    );

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
           <StatusBar barStyle="light-content" />

            <View style={styles.header}>
                <Pressable
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Text style={styles.backText}>‹</Text>
                </Pressable>

                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Activity History</Text>
                    <Text style={styles.headerSubtitle}>
                        Everything happening with your plans
                    </Text>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {loading ? (
                    <Text style={styles.messageText}>
                        Loading activity...
                    </Text>
                ) : activities.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIcon}>
                            <Text style={styles.emptyIconText}>◷</Text>
                        </View>

                        <Text style={styles.emptyTitle}>
                            No activity yet
                        </Text>

                        <Text style={styles.emptyDescription}>
                            Your purchase plans, savings updates, completed
                            purchases, and other activities will appear here.
                        </Text>
                    </View>
                ) : (
                    <>
                        <Text style={styles.sectionLabel}>
                            ALL ACTIVITIES ({activities.length})
                        </Text>

                        {activities.map((activity, index) => {
                            const amount = formatActivityAmount(activity);

                            return (
                                <View
                                    key={activity.id}
                                    style={styles.activityCard}
                                >
                                    <View style={styles.iconContainer}>
                                        <Text style={styles.activityIcon}>
                                            {getActivityIcon(activity.type)}
                                        </Text>
                                    </View>

                                    <View style={styles.activityDetails}>
                                        <Text style={styles.activityType}>
                                            {activity.type}
                                        </Text>

                                        <Text style={styles.purchaseName}>
                                            {activity.purchaseName}
                                        </Text>

                                        <Text style={styles.activityDate}>
                                            {formatActivityDate(
                                                activity.createdAt
                                            )}
                                        </Text>
                                    </View>

                                    {amount && (
                                        <Text style={styles.activityAmount}>
                                            {amount}
                                        </Text>
                                    )}
                                </View>
                            );
                        })}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#101114',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 22,
        gap: 14,
    },
    backButton: {
        width: 42,
        height: 42,
        borderRadius: 14,
        backgroundColor: '#242426',
        borderWidth: 1,
        borderColor: '#38383A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    backText: {
        color: '#D6B66C',
        fontSize: 32,
        lineHeight: 36,
        marginTop: -4,
    },
    headerTitleContainer: {
        flex: 1,
    },
    headerTitle: {
        color: '#F7F4EC',
        fontSize: 22,
        fontWeight: '700',
    },
    headerSubtitle: {
        color: '#85827B',
        fontSize: 12,
        marginTop: 4,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 35,
    },
    sectionLabel: {
        color: '#85827B',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.2,
        marginBottom: 14,
        marginTop: 5,
    },
    activityCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#242426',
        borderWidth: 1,
        borderColor: '#38383A',
        borderRadius: 16,
        padding: 15,
        marginBottom: 12,
        gap: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 13,
        backgroundColor: '#343027',
        alignItems: 'center',
        justifyContent: 'center',
    },
    activityIcon: {
        color: '#D6B66C',
        fontSize: 22,
        fontWeight: '600',
    },
    activityDetails: {
        flex: 1,
    },
    activityType: {
        color: '#F7F4EC',
        fontSize: 14,
        fontWeight: '600',
    },
    purchaseName: {
        color: '#B5B1A7',
        fontSize: 12,
        marginTop: 4,
    },
    activityDate: {
        color: '#85827B',
        fontSize: 10,
        marginTop: 6,
    },
    activityAmount: {
        color: '#D6B66C',
        fontSize: 12,
        fontWeight: '700',
    },
    messageText: {
        color: '#85827B',
        textAlign: 'center',
        marginTop: 40,
        fontSize: 13,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingHorizontal: 25,
        paddingTop: 85,
    },
    emptyIcon: {
        width: 70,
        height: 70,
        borderRadius: 24,
        backgroundColor: '#242426',
        borderWidth: 1,
        borderColor: '#38383A',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    emptyIconText: {
        color: '#D6B66C',
        fontSize: 34,
    },
    emptyTitle: {
        color: '#F7F4EC',
        fontSize: 18,
        fontWeight: '700',
    },
    emptyDescription: {
        color: '#85827B',
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 21,
        marginTop: 10,
    },
});
