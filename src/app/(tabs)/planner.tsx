
import { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    StyleSheet,
    Alert,
    ActivityIndicator,
    ScrollView,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
    getMonthlyLimit,
    saveMonthlyLimit,
} from '../../services/monthlyLimitStorage';

import { getPurchases } from '../../services/purchaseStorage';
import { Purchase } from '../../types/purchase';

const COLORS = {
    background: '#08090B',
    card: '#202124',
    gold: '#D9B45B',
    white: '#FFFFFF',
    grey: '#AAAAAA',
    border: '#383838',
    input: '#17181B',
    warning: '#E6A34A',
};

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

export default function PlannerScreen() {
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const today = new Date();

        return new Date(
            today.getFullYear(),
            today.getMonth(),
            1
        );
    });

    const [selectedDate, setSelectedDate] = useState(() =>
        getDateKey(new Date())
    );

    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [monthlyLimit, setMonthlyLimit] = useState<number | null>(null);
    const [limitInput, setLimitInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const monthKey = [
        selectedMonth.getFullYear(),
        String(selectedMonth.getMonth() + 1).padStart(2, '0'),
    ].join('-');

    const monthName = selectedMonth.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
    });

    const todayKey = getDateKey(new Date());

    // Load purchases and the selected month's limit
    useEffect(() => {
        const loadPlannerData = async () => {
            try {
                setLoading(true);

                const [savedPurchases, savedLimit] = await Promise.all([
                    getPurchases(),
                    getMonthlyLimit(monthKey),
                ]);

                setPurchases(savedPurchases);
                setMonthlyLimit(savedLimit);

                setLimitInput(
                    savedLimit !== null ? String(savedLimit) : ''
                );
            } catch (error) {
                Alert.alert(
                    'Error',
                    'Could not load your planner information.'
                );
            } finally {
                setLoading(false);
            }
        };

        loadPlannerData();
    }, [monthKey]);

    // Get active and overdue purchases for the selected month
    const monthlyPurchases = useMemo(() => {
        return purchases.filter((purchase) => {
            const purchaseMonth = purchase.plannedDate.slice(0, 7);

            return (
                purchaseMonth === monthKey &&
                (
                    purchase.status === 'Active' ||
                    purchase.status === 'Overdue'
                )
            );
        });
    }, [purchases, monthKey]);

    // Sort monthly purchases by planned date
    const sortedMonthlyPurchases = useMemo(() => {
        return [...monthlyPurchases].sort((a, b) =>
            a.plannedDate.localeCompare(b.plannedDate)
        );
    }, [monthlyPurchases]);

    // Create the calendar days
    const calendarDays = useMemo(() => {
        const year = selectedMonth.getFullYear();
        const month = selectedMonth.getMonth();

        const firstDay = new Date(year, month, 1).getDay();
        const numberOfDays = new Date(year, month + 1, 0).getDate();

        const days: (number | null)[] = [];

        for (let i = 0; i < firstDay; i++) {
            days.push(null);
        }

        for (let day = 1; day <= numberOfDays; day++) {
            days.push(day);
        }

        return days;
    }, [selectedMonth]);

    // Get purchases for the selected date
    const selectedDatePurchases = useMemo(() => {
        return monthlyPurchases.filter(
            (purchase) => purchase.plannedDate.slice(0, 10) === selectedDate
        );
    }, [monthlyPurchases, selectedDate]);

    // Monthly summary calculations
    const totalPlannedPurchases = monthlyPurchases.length;

    const totalEstimatedCost = monthlyPurchases.reduce(
        (total, purchase) => total + purchase.estimatedPrice,
        0
    );

    const remainingLimit =
        monthlyLimit !== null
            ? monthlyLimit - totalEstimatedCost
            : null;

    const limitReached =
        monthlyLimit !== null &&
        totalEstimatedCost >= monthlyLimit;

    // Change selected month
    const changeMonth = (direction: number) => {
        setSelectedMonth((currentMonth) => {
            const newMonth = new Date(
                currentMonth.getFullYear(),
                currentMonth.getMonth() + direction,
                1
            );

            setSelectedDate(getDateKey(newMonth));

            return newMonth;
        });
    };

    // Save monthly limit
    const handleSaveLimit = async () => {
        const limit = Number(limitInput);

        if (
            limitInput.trim() === '' ||
            !Number.isFinite(limit) ||
            limit < 0
        ) {
            Alert.alert(
                'Invalid limit',
                'Please enter a valid amount of zero or more.'
            );
            return;
        }

        try {
            setSaving(true);

            await saveMonthlyLimit(monthKey, limit);

            setMonthlyLimit(limit);

            Alert.alert(
                'Saved',
                `Your limit for ${monthName} has been saved.`
            );
        } catch (error) {
            Alert.alert(
                'Error',
                'Could not save the monthly purchase limit.'
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView
            style={styles.safeArea}
            edges={['top', 'left', 'right']}
        >
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.container}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.title}>Monthly Planner</Text>

                <Text style={styles.subtitle}>
                    Organize your purchases by month.
                </Text>

                {/* Month selector */}
                <View style={styles.monthSelector}>
                    <Pressable
                        style={styles.monthButton}
                        onPress={() => changeMonth(-1)}
                    >
                        <Text style={styles.arrow}>‹</Text>
                    </Pressable>

                    <Text style={styles.monthName}>
                        {monthName}
                    </Text>

                    <Pressable
                        style={styles.monthButton}
                        onPress={() => changeMonth(1)}
                    >
                        <Text style={styles.arrow}>›</Text>
                    </Pressable>
                </View>

                {loading ? (
                    <ActivityIndicator
                        size="large"
                        color={COLORS.gold}
                    />
                ) : (
                    <>
                        {/* Monthly calendar */}
                        <View style={styles.calendarCard}>
                            <Text style={styles.sectionTitle}>
                                Calendar
                            </Text>

                            <View style={styles.calendarGrid}>
                                {WEEK_DAYS.map((day) => (
                                    <View
                                        key={day}
                                        style={styles.calendarCell}
                                    >
                                        <Text style={styles.weekDay}>
                                            {day}
                                        </Text>
                                    </View>
                                ))}
                            </View>

                            <View style={styles.calendarGrid}>
                                {calendarDays.map((day, index) => {
                                    if (day === null) {
                                        return (
                                            <View
                                                key={`empty-${index}`}
                                                style={styles.calendarCell}
                                            />
                                        );
                                    }

                                    const dateKey = getDateKey(
                                        new Date(
                                            selectedMonth.getFullYear(),
                                            selectedMonth.getMonth(),
                                            day
                                        )
                                    );

                                    const hasPurchases =
                                        monthlyPurchases.some(
                                            (purchase) =>
                                                purchase.plannedDate.slice(0, 10) === dateKey
                                        );

                                    const isSelected =
                                        selectedDate === dateKey;

                                    const isToday =
                                        todayKey === dateKey;

                                    return (
                                        <Pressable
                                            key={dateKey}
                                            style={styles.calendarCell}
                                            onPress={() =>
                                                setSelectedDate(dateKey)
                                            }
                                        >
                                            <View
                                                style={[
                                                    styles.dayCircle,
                                                    isToday && styles.todayCircle,
                                                    isSelected && styles.selectedDayCircle,
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.dayText,
                                                        isSelected && styles.selectedDayText,
                                                    ]}
                                                >
                                                    {day}
                                                </Text>
                                            </View>

                                            {hasPurchases && (
                                                <View
                                                    style={[
                                                        styles.purchaseDot,
                                                        isSelected && styles.selectedPurchaseDot,
                                                    ]}
                                                />
                                            )}
                                        </Pressable>
                                    );
                                })}
                            </View>

                            <View style={styles.legend}>
                                <View style={styles.legendItem}>
                                    <View style={styles.legendToday} />
                                    <Text style={styles.legendText}>
                                        Today
                                    </Text>
                                </View>

                                <View style={styles.legendItem}>
                                    <View style={styles.legendPurchase} />
                                    <Text style={styles.legendText}>
                                        Planned purchase
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Purchases for selected date */}
                        <View style={styles.datePurchasesCard}>
                            <Text style={styles.sectionTitle}>
                                {new Date(
                                    selectedDate + 'T12:00:00'
                                ).toLocaleDateString('en-US', {
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric',
                                })}
                            </Text>

                            {selectedDatePurchases.length === 0 ? (
                                <Text style={styles.emptyText}>
                                    No planned purchases for this date.
                                </Text>
                            ) : (
                                selectedDatePurchases.map((purchase) => (
                                    <View
                                        key={purchase.id}
                                        style={styles.purchaseItem}
                                    >
                                        <View style={styles.purchaseInfo}>
                                            <Text style={styles.purchaseName}>
                                                {purchase.name}
                                            </Text>

                                            <Text style={styles.purchaseDetails}>
                                                {purchase.priority} Priority
                                                {' • '}
                                                {purchase.status}
                                            </Text>
                                        </View>

                                        <Text style={styles.purchasePrice}>
                                            {purchase.estimatedPrice.toLocaleString()}
                                        </Text>
                                    </View>
                                ))
                            )}
                        </View>

                        {/* Monthly purchase list */}
                        <View style={styles.monthlyListCard}>
                            <View style={styles.listHeader}>
                                <Text style={styles.sectionTitle}>
                                    All Planned Purchases
                                </Text>

                                <View style={styles.countBadge}>
                                    <Text style={styles.countText}>
                                        {sortedMonthlyPurchases.length}
                                    </Text>
                                </View>
                            </View>

                            {sortedMonthlyPurchases.length === 0 ? (
                                <Text style={styles.emptyText}>
                                    No planned purchases for {monthName}.
                                </Text>
                            ) : (
                                sortedMonthlyPurchases.map((purchase) => (
                                    <View
                                        key={purchase.id}
                                        style={styles.monthlyPurchaseItem}
                                    >
                                        <View style={styles.monthlyPurchaseInfo}>
                                            <Text style={styles.purchaseName}>
                                                {purchase.name}
                                            </Text>

                                            <Text style={styles.purchaseDetails}>
                                                {new Date(
                                                    purchase.plannedDate.slice(0, 10) + 'T12:00:00'
                                                ).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                })}
                                            </Text>

                                            <View style={styles.purchaseTags}>
                                                <Text style={styles.priorityTag}>
                                                    {purchase.priority} Priority
                                                </Text>

                                                <Text
                                                    style={[
                                                        styles.statusTag,
                                                        purchase.status === 'Overdue' &&
                                                        styles.overdueTag,
                                                    ]}
                                                >
                                                    {purchase.status}
                                                </Text>
                                            </View>
                                        </View>

                                        <Text style={styles.purchasePrice}>
                                            {purchase.estimatedPrice.toLocaleString()}
                                        </Text>
                                    </View>
                                ))
                            )}
                        </View>

                        {/* Monthly summary */}
                        <View style={styles.summaryCard}>
                            <Text style={styles.sectionTitle}>
                                Monthly Summary
                            </Text>

                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>
                                    Planned Purchases
                                </Text>
                                <Text style={styles.summaryValue}>
                                    {totalPlannedPurchases}
                                </Text>
                            </View>

                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>
                                    Total Estimated Cost
                                </Text>
                                <Text style={styles.summaryValue}>
                                    {totalEstimatedCost.toLocaleString()}
                                </Text>
                            </View>

                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>
                                    Monthly Limit
                                </Text>
                                <Text style={styles.goldValue}>
                                    {monthlyLimit !== null
                                        ? monthlyLimit.toLocaleString()
                                        : 'Not set'}
                                </Text>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>
                                    Remaining Limit
                                </Text>
                                <Text
                                    style={[
                                        styles.summaryValue,
                                        remainingLimit !== null &&
                                        remainingLimit < 0 &&
                                        styles.warningText,
                                    ]}
                                >
                                    {remainingLimit !== null
                                        ? remainingLimit.toLocaleString()
                                        : 'Not available'}
                                </Text>
                            </View>
                        </View>

                        {/* Monthly limit setting */}
                        <View style={styles.limitCard}>
                            <Text style={styles.sectionTitle}>
                                Monthly Purchase Limit
                            </Text>

                            <Text style={styles.inputLabel}>
                                Set your limit for {monthName}
                            </Text>

                            <TextInput
                                style={styles.input}
                                value={limitInput}
                                onChangeText={setLimitInput}
                                placeholder="Enter monthly limit"
                                placeholderTextColor={COLORS.grey}
                                keyboardType="decimal-pad"
                                selectionColor={COLORS.gold}
                            />

                            <Pressable
                                style={[
                                    styles.saveButton,
                                    saving && styles.disabledButton,
                                ]}
                                onPress={handleSaveLimit}
                                disabled={saving}
                            >
                                <Text style={styles.saveButtonText}>
                                    {saving ? 'Saving...' : 'Save Limit'}
                                </Text>
                            </Pressable>
                        </View>

                        {/* Monthly limit warning */}
                        {limitReached && (
                            <View style={styles.warningCard}>
                                <Text style={styles.warningTitle}>
                                    Monthly Limit Reached
                                </Text>

                                <Text style={styles.warningMessage}>
                                    Your planned spending has reached or
                                    exceeded your monthly purchase limit.
                                </Text>
                            </View>
                        )}

                        {!limitReached && monthlyLimit === null && (
                            <Text style={styles.helperText}>
                                Set a monthly limit to track your planned
                                spending.
                            </Text>
                        )}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollView: {
        flex: 1,
    },
    container: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 40,
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: COLORS.gold,
    },
    subtitle: {
        fontSize: 15,
        color: COLORS.grey,
        marginTop: 6,
    },
    monthSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 30,
        marginBottom: 20,
    },
    monthButton: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    arrow: {
        fontSize: 30,
        color: COLORS.gold,
        lineHeight: 34,
    },
    monthName: {
        fontSize: 19,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    calendarCard: {
        backgroundColor: COLORS.card,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.gold,
        marginBottom: 18,
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    calendarCell: {
        width: '14.2857%',
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    weekDay: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.grey,
    },
    dayCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayText: {
        fontSize: 14,
        color: COLORS.white,
    },
    todayCircle: {
        borderWidth: 1,
        borderColor: COLORS.gold,
    },
    selectedDayCircle: {
        backgroundColor: COLORS.gold,
    },
    selectedDayText: {
        color: COLORS.background,
        fontWeight: 'bold',
    },
    purchaseDot: {
        position: 'absolute',
        bottom: 2,
        width: 5,
        height: 5,
        borderRadius: 3,
        backgroundColor: COLORS.gold,
    },
    selectedPurchaseDot: {
        backgroundColor: COLORS.white,
    },
    legend: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        gap: 20,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
    },
    legendToday: {
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: COLORS.gold,
    },
    legendPurchase: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: COLORS.gold,
    },
    legendText: {
        fontSize: 11,
        color: COLORS.grey,
    },
    datePurchasesCard: {
        backgroundColor: COLORS.card,
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 20,
    },
    emptyText: {
        fontSize: 14,
        color: COLORS.grey,
        lineHeight: 21,
    },
    purchaseItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 13,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    purchaseInfo: {
        flex: 1,
        marginRight: 10,
    },
    purchaseName: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.white,
    },
    purchaseDetails: {
        fontSize: 12,
        color: COLORS.grey,
        marginTop: 5,
    },
    purchasePrice: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.gold,
    },
    monthlyListCard: {
        backgroundColor: COLORS.card,
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 20,
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    countBadge: {
        minWidth: 28,
        height: 28,
        paddingHorizontal: 8,
        borderRadius: 14,
        backgroundColor: '#3A3324',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 18,
    },
    countText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: COLORS.gold,
    },
    monthlyPurchaseItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    monthlyPurchaseInfo: {
        flex: 1,
        marginRight: 12,
    },
    purchaseTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        marginTop: 8,
        gap: 8,
    },
    priorityTag: {
        fontSize: 11,
        color: COLORS.grey,
        backgroundColor: COLORS.input,
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 6,
        overflow: 'hidden',
    },
    statusTag: {
        fontSize: 11,
        color: COLORS.gold,
        backgroundColor: '#3A3324',
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 6,
        overflow: 'hidden',
    },
    overdueTag: {
        color: COLORS.warning,
        backgroundColor: '#30251A',
    },
    summaryCard: {
        backgroundColor: COLORS.card,
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 20,
    },
    summaryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    summaryLabel: {
        fontSize: 14,
        color: COLORS.grey,
        flex: 1,
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.white,
    },
    goldValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.gold,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginBottom: 16,
    },
    warningText: {
        color: COLORS.warning,
    },
    limitCard: {
        backgroundColor: COLORS.card,
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        color: COLORS.white,
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 10,
        padding: 14,
        fontSize: 16,
        backgroundColor: COLORS.input,
        color: COLORS.white,
    },
    saveButton: {
        backgroundColor: COLORS.gold,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 15,
    },
    disabledButton: {
        opacity: 0.6,
    },
    saveButtonText: {
        color: COLORS.background,
        fontSize: 16,
        fontWeight: 'bold',
    },
    warningCard: {
        backgroundColor: '#30251A',
        borderWidth: 1,
        borderColor: COLORS.warning,
        padding: 18,
        borderRadius: 14,
        marginBottom: 20,
    },
    warningTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.warning,
        marginBottom: 8,
    },
    warningMessage: {
        fontSize: 14,
        color: COLORS.white,
        lineHeight: 21,
    },
    helperText: {
        fontSize: 13,
        color: COLORS.grey,
        textAlign: 'center',
        marginBottom: 20,
    },
});
