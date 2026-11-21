import AsyncStorage from '@react-native-async-storage/async-storage';
import { PurchaseActivity } from '../types/activity';

const ACTIVITIES_KEY = 'buylater_activities';

// Retrieve all activity records
export const getActivities = async (): Promise<PurchaseActivity[]> => {
    try {
        const jsonValue = await AsyncStorage.getItem(ACTIVITIES_KEY);

        if (jsonValue === null) {
            return [];
        }

        return JSON.parse(jsonValue) as PurchaseActivity[];
    } catch (error) {
        console.error('Error loading activities:', error);
        throw error;
    }
};

// Save a new activity record
export const addActivity = async (
    activity: Omit<PurchaseActivity, 'id' | 'createdAt'>
): Promise<void> => {
    try {
        const activities = await getActivities();

        const newActivity: PurchaseActivity = {
            ...activity,
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            createdAt: new Date().toISOString(),
        };

        await AsyncStorage.setItem(
            ACTIVITIES_KEY,
            JSON.stringify([newActivity, ...activities])
        );
    } catch (error) {
        console.error('Error saving activity:', error);
        throw error;
    }
};