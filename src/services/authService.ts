
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as bcrypt from 'bcryptjs';

import { User } from '../types/user';

bcrypt.setRandomFallback((length) => {
    return Array.from(Crypto.getRandomBytes(length));
});

const USER_KEY = 'buylater_user';
const SESSION_KEY = 'buylater_logged_in';
const PASSWORD_HASH_KEY = 'buylater_password_hash';

// Register a new local account
export async function registerUser(
    name: string,
    email: string,
    password: string
): Promise<User> {
    const existingUser = await AsyncStorage.getItem(USER_KEY);

    if (existingUser !== null) {
        throw new Error('An account already exists on this device.');
    }

    const user: User = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
    };

    const hashStartTime = Date.now();

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    console.log(
        `Registration password hashing took ${Date.now() - hashStartTime} ms`
    );

    await SecureStore.setItemAsync(
        PASSWORD_HASH_KEY,
        passwordHash
    );

    await AsyncStorage.setItem(
        USER_KEY,
        JSON.stringify(user)
    );

    await AsyncStorage.setItem(SESSION_KEY, 'true');

    return user;
}

// Log in using only the saved account password
export async function loginUser(
    password: string
): Promise<User> {
    const savedUser = await AsyncStorage.getItem(USER_KEY);

    if (savedUser === null) {
        throw new Error('No account found. Please register first.');
    }

    const user = JSON.parse(savedUser) as User;

    const savedPasswordHash =
        await SecureStore.getItemAsync(PASSWORD_HASH_KEY);

    if (savedPasswordHash === null) {
        throw new Error('Account password information is missing.');
    }

    const compareStartTime = Date.now();

    const passwordMatches = await bcrypt.compare(
        password,
        savedPasswordHash
    );

    console.log(
        `Login password checking took ${Date.now() - compareStartTime} ms`
    );

    if (!passwordMatches) {
        throw new Error('Incorrect password. Please try again.');
    }

    await AsyncStorage.setItem(SESSION_KEY, 'true');

    return user;
}

// Get the currently logged-in user
export async function getLoggedInUser(): Promise<User | null> {
    const isLoggedIn = await AsyncStorage.getItem(SESSION_KEY);

    if (isLoggedIn !== 'true') {
        return null;
    }

    const savedUser = await AsyncStorage.getItem(USER_KEY);

    if (savedUser === null) {
        return null;
    }

    return JSON.parse(savedUser) as User;
}

// Log out without deleting the registered account
export async function logoutUser(): Promise<void> {
    await AsyncStorage.removeItem(SESSION_KEY);
}

// Update the user's profile information
export async function updateUserProfile(
    updatedUser: User
): Promise<void> {
    await AsyncStorage.setItem(
        USER_KEY,
        JSON.stringify(updatedUser)
    );
}

// Change the user's password
export async function changeUserPassword(
    currentPassword: string,
    newPassword: string
): Promise<void> {
    const savedPasswordHash =
        await SecureStore.getItemAsync(PASSWORD_HASH_KEY);

    if (savedPasswordHash === null) {
        throw new Error('Account password information is missing.');
    }

    const passwordMatches = await bcrypt.compare(
        currentPassword,
        savedPasswordHash
    );

    if (!passwordMatches) {
        throw new Error('Your current password is incorrect.');
    }

    const salt = await bcrypt.genSalt(10);

    const newPasswordHash = await bcrypt.hash(
        newPassword,
        salt
    );

    await SecureStore.setItemAsync(
        PASSWORD_HASH_KEY,
        newPasswordHash
    );
}
