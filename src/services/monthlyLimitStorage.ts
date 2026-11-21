
import AsyncStorage from '@react-native-async-storage/async-storage';

const MONTHLY_LIMITS_KEY = 'buylater_monthly_limits';

// Save the limit for a specific month
export const saveMonthlyLimit = async (
    monthKey: string,
    limit: number
): Promise<void> => {
    try {
        const jsonValue = await AsyncStorage.getItem(
            MONTHLY_LIMITS_KEY
        );

        const monthlyLimits: Record<string, number> =
            jsonValue ? JSON.parse(jsonValue) : {};

        monthlyLimits[monthKey] = limit;

        await AsyncStorage.setItem(
            MONTHLY_LIMITS_KEY,
            JSON.stringify(monthlyLimits)
        );
    } catch (error) {
        console.error('Error saving monthly limit:', error);
        throw error;
    }
};

// Retrieve the limit for a specific month
export const getMonthlyLimit = async (
    monthKey: string
): Promise<number | null> => {
    try {
        const jsonValue = await AsyncStorage.getItem(
            MONTHLY_LIMITS_KEY
        );

        if (jsonValue === null) {
            return null;
        }

        const monthlyLimits: Record<string, number> =
            JSON.parse(jsonValue);

        return monthlyLimits[monthKey] ?? null;
    } catch (error) {
        console.error('Error loading monthly limit:', error);
        throw error;
    }
};
