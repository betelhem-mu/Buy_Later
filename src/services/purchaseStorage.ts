
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Purchase } from '../types/purchase';

const PURCHASES_KEY = 'buylater_purchases';

// Save all purchases to local storage
export const savePurchases = async (
    purchases: Purchase[]
): Promise<void> => {
    try {
        const jsonValue = JSON.stringify(purchases);

        await AsyncStorage.setItem(PURCHASES_KEY, jsonValue);
    } catch (error) {
        console.error('Error saving purchases:', error);
        throw error;
    }
};

// Retrieve all purchases from local storage
export const getPurchases = async (): Promise<Purchase[]> => {
    try {
        const jsonValue = await AsyncStorage.getItem(PURCHASES_KEY);

        if (jsonValue === null) {
            return [];
        }

        return JSON.parse(jsonValue) as Purchase[];
    } catch (error) {
        console.error('Error loading purchases:', error);
        throw error;
    }
};
