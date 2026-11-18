import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

// Sample upcoming purchases
const upcomingPurchases = [
    {
        name: 'Wireless Headphones',
        category: 'Electronics',
        price: '3,500',
        date: 'November 22',
        priority: 'High',
        emoji: '🎧',
    },
    {
        name: 'Running Shoes',
        category: 'Fashion',
        price: '4,000',
        date: 'November 28',
        priority: 'Medium',
        emoji: '👟',
    },
];

// Sample overdue purchases
const overduePurchases = [
    {
        name: 'Laptop',
        price: '45,000',
        date: 'November 10',
        emoji: '💻',
    },
];

// Sample recent activities
const recentActivities = [
    {
        id: '1',
        icon: '➕',
        title: 'New purchase added',
        description: 'Wireless Headphones',
        time: 'Today',
    },
    {
        id: '2',
        icon: '💰',
        title: 'Saving updated',
        description: 'You added 500 to your savings',
        time: 'Yesterday',
    },
    {
        id: '3',
        icon: '📅',
        title: 'Purchase postponed',
        description: 'Running Shoes',
        time: '2 days ago',
    },
];

export default function HomeScreen() {
    // Temporary sample user name
    const userName = 'Alex';

    // Get the current hour
    const currentHour = new Date().getHours();

    // Display greeting according to the time
    const greeting =
        currentHour < 12
            ? 'Good morning'
            : currentHour < 18
                ? 'Good afternoon'
                : 'Good evening';

    // Sample monthly purchase information
    const monthlyLimit = 20000;
    const plannedSpending = 12500;
    const remaining = monthlyLimit - plannedSpending;
    const progress = monthlyLimit > 0
        ? plannedSpending / monthlyLimit
        : 0;

    // Summary card information
    const summaryCards = [
        {
            icon: '🛍️',
            number: '8',
            label: 'Planned Purchases',
        },
        {
            icon: '💰',
            number: '25,000',
            label: 'Estimated Cost',
        },
        {
            icon: '🐷',
            number: '7,500',
            label: 'Total Saved',
        },
        {
            icon: '📊',
            number: remaining.toLocaleString(),
            label: 'Remaining Limit',
        },
    ];

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >

            {/* Part 1: Welcome section */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>
                        {greeting}, {userName}! 👋
                    </Text>

                    <Text style={styles.subtitle}>
                        Plan your purchases wisely.
                    </Text>
                </View>

                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {userName.charAt(0).toUpperCase()}
                    </Text>
                </View>
            </View>

            {/* Part 2: Summary cards */}
            <Text style={styles.sectionTitle}>Your Overview</Text>

            <View style={styles.summaryGrid}>
                {summaryCards.map((item) => (
                    <View key={item.label} style={styles.summaryCard}>
                        <Text style={styles.cardIcon}>{item.icon}</Text>

                        <Text style={styles.cardNumber}>{item.number}</Text>

                        <Text style={styles.cardLabel}>{item.label}</Text>
                    </View>
                ))}
            </View>

            {/* Part 3: Monthly purchase limit */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                    Monthly Purchase Limit
                </Text>

                <View style={styles.limitCard}>
                    <View style={styles.limitHeader}>
                        <Text style={styles.limitLabel}>
                            Planned Spending
                        </Text>

                        <Text style={styles.limitValue}>
                            {plannedSpending.toLocaleString()} / {monthlyLimit.toLocaleString()}
                        </Text>
                    </View>

                    <View style={styles.progressBackground}>
                        <View
                            style={[
                                styles.progressFill,
                                {
                                    width: `${Math.min(Math.max(progress, 0), 1) * 100}%`,
                                },
                            ]}
                        />
                    </View>

                    <View style={styles.limitFooter}>
                        <Text style={styles.remainingText}>
                            {remaining.toLocaleString()} remaining this month
                        </Text>

                        <Text style={styles.percentageText}>
                            {Math.round(progress * 100)}% used
                        </Text>
                    </View>
                </View>
            </View>

            {/* Part 4: Overdue purchases */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        Overdue Purchases
                    </Text>

                    <Text style={styles.overdueCount}>
                        {overduePurchases.length} overdue
                    </Text>
                </View>

                {overduePurchases.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyEmoji}>🎉</Text>

                        <Text style={styles.emptyTitle}>
                            No overdue purchases!
                        </Text>

                        <Text style={styles.emptyDescription}>
                            You're keeping your purchase plans on track.
                        </Text>
                    </View>
                ) : (
                    overduePurchases.map((item) => (
                        <View key={item.name} style={styles.overdueCard}>
                            <Text style={styles.productEmoji}>{item.emoji}</Text>

                            <View style={styles.productInfo}>
                                <Text style={styles.productName}>{item.name}</Text>

                                <Text style={styles.productDetails}>
                                    Planned: {item.date}
                                </Text>

                                <Text style={styles.productPrice}>
                                    {item.price}
                                </Text>
                            </View>

                            <View style={styles.overdueBadge}>
                                <Text style={styles.overdueBadgeText}>
                                    Overdue
                                </Text>
                            </View>
                        </View>
                    ))
                )}
            </View>

            {/* Part 5: Upcoming purchases */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        Upcoming Purchases
                    </Text>

                    <Text style={styles.upcomingCount}>
                        {upcomingPurchases.length} upcoming
                    </Text>
                </View>

                {upcomingPurchases.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyEmoji}>🛍️</Text>

                        <Text style={styles.emptyTitle}>
                            No upcoming purchases
                        </Text>

                        <Text style={styles.emptyDescription}>
                            Add a purchase plan to see it here.
                        </Text>
                    </View>
                ) : (
                    upcomingPurchases.map((item) => (
                        <View key={item.name} style={styles.purchaseCard}>
                            <Text style={styles.productEmoji}>{item.emoji}</Text>

                            <View style={styles.productInfo}>
                                <Text style={styles.productName}>{item.name}</Text>

                                <Text style={styles.productDetails}>
                                    {item.category} · {item.date}
                                </Text>

                                <Text style={styles.productPrice}>
                                    {item.price}
                                </Text>
                            </View>

                            <View
                                style={[
                                    styles.priorityBadge,
                                    item.priority === 'High'
                                        ? styles.highPriority
                                        : styles.mediumPriority,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.priorityBadgeText,
                                        item.priority === 'High'
                                            ? styles.highPriorityText
                                            : styles.mediumPriorityText,
                                    ]}
                                >
                                    {item.priority}
                                </Text>
                            </View>
                        </View>
                    ))
                )}
            </View>

            {/* Part 6: Recent activity */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                    Recent Activity
                </Text>

                {recentActivities.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyEmoji}>📋</Text>

                        <Text style={styles.emptyTitle}>
                            No recent activity
                        </Text>

                        <Text style={styles.emptyDescription}>
                            Your purchase activities will appear here.
                        </Text>
                    </View>
                ) : (
                    recentActivities.map((activity) => (
                        <View key={activity.id} style={styles.activityCard}>
                            <Text style={styles.activityIcon}>
                                {activity.icon}
                            </Text>

                            <View style={styles.productInfo}>
                                <Text style={styles.productName}>
                                    {activity.title}
                                </Text>

                                <Text style={styles.productDetails}>
                                    {activity.description}
                                </Text>
                            </View>

                            <Text style={styles.activityTime}>
                                {activity.time}
                            </Text>
                        </View>
                    ))
                )}
            </View>

            {/* Part 7: Add new purchase button */}
            <Pressable
                style={styles.addButton}
                onPress={() => router.push('/purchase/add')}
            >
                <Text style={styles.addButtonText}>
                    + Add New Purchase
                </Text>
            </Pressable>

        </ScrollView>
    );
}

// Home screen styles
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F8FC',
    },

    content: {
        padding: 20,
        paddingTop: 55,
        paddingBottom: 35,
    },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 28,
    },

    greeting: {
        fontSize: 25,
        fontWeight: 'bold',
        color: '#17233D',
    },

    subtitle: {
        fontSize: 14,
        color: '#7B8497',
        marginTop: 6,
    },

    avatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: '#DCEBFF',
        justifyContent: 'center',
        alignItems: 'center',
    },

    avatarText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2878D0',
    },

    section: {
        marginTop: 25,
    },

    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#17233D',
        marginBottom: 14,
    },

    summaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
    },

    summaryCard: {
        width: '48%',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#EEF0F5',
    },

    cardIcon: {
        fontSize: 23,
        marginBottom: 12,
    },

    cardNumber: {
        fontSize: 21,
        fontWeight: 'bold',
        color: '#17233D',
    },

    cardLabel: {
        fontSize: 12,
        color: '#7B8497',
        marginTop: 5,
    },

    limitCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: '#EEF0F5',
    },

    limitHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
    },

    limitLabel: {
        fontSize: 13,
        color: '#7B8497',
    },

    limitValue: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#17233D',
    },

    progressBackground: {
        height: 10,
        backgroundColor: '#E9EEF5',
        borderRadius: 10,
        marginTop: 15,
        overflow: 'hidden',
    },

    progressFill: {
        height: '100%',
        backgroundColor: '#3287DF',
        borderRadius: 10,
    },

    limitFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
    },

    remainingText: {
        color: '#23865B',
        fontSize: 12,
    },

    percentageText: {
        color: '#7B8497',
        fontSize: 12,
        fontWeight: 'bold',
    },

    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    overdueCount: {
        color: '#D97757',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 14,
    },

    upcomingCount: {
        color: '#3287DF',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 14,
    },

    overdueCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF7F3',
        borderRadius: 15,
        padding: 14,
        borderWidth: 1,
        borderColor: '#F9E2D8',
    },

    purchaseCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 15,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#EEF0F5',
    },

    productEmoji: {
        fontSize: 30,
        marginRight: 13,
    },

    productInfo: {
        flex: 1,
    },

    productName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#17233D',
    },

    productDetails: {
        fontSize: 12,
        color: '#7B8497',
        marginTop: 5,
    },

    productPrice: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#3287DF',
        marginTop: 6,
    },

    overdueBadge: {
        backgroundColor: '#FCE4DA',
        paddingHorizontal: 9,
        paddingVertical: 6,
        borderRadius: 8,
    },

    overdueBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#C35E3E',
    },

    priorityBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },

    highPriority: {
        backgroundColor: '#FCE4E4',
    },

    mediumPriority: {
        backgroundColor: '#FFF1D6',
    },

    priorityBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
    },

    highPriorityText: {
        color: '#D35454',
    },

    mediumPriorityText: {
        color: '#B7791F',
    },

    emptyCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 15,
        padding: 22,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#EEF0F5',
    },

    emptyEmoji: {
        fontSize: 30,
        marginBottom: 10,
    },

    emptyTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#17233D',
    },

    emptyDescription: {
        fontSize: 12,
        color: '#7B8497',
        marginTop: 6,
        textAlign: 'center',
    },

    activityCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 14,
        borderRadius: 14,
        marginBottom: 9,
    },

    activityIcon: {
        fontSize: 22,
        marginRight: 13,
    },

    activityTime: {
        fontSize: 10,
        color: '#9AA2B1',
        marginLeft: 8,
    },

    addButton: {
        backgroundColor: '#2878D0',
        padding: 17,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 28,
    },

    addButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: 'bold',
    },
});
