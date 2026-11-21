
import { useCallback, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
    getPurchases,
    savePurchases,
} from '../../services/purchaseStorage';

import {
    requestNotificationPermission,
    scheduleAllPurchaseNotifications,
    cancelAllPurchaseNotifications,
} from '../../services/notifications/notificationService';

import { useAuth } from '../../contexts/AuthContext';

import {
    updateUserProfile,
    changeUserPassword,
} from '../../services/authService';

const COLORS = {
    background: '#101114',
    card: '#242426',
    gold: '#D6B66C',
    text: '#F7F4EC',
    secondary: '#B5B1A7',
    muted: '#85827B',
    border: '#38383A',
    red: '#E47777',
};

const NOTIFICATIONS_KEY = 'buylater_notifications_enabled';

export default function ProfileScreen() {
    const router = useRouter();

    const { user, logout, refreshAuth } = useAuth();

    const [notificationsEnabled, setNotificationsEnabled] =
        useState(true);

    const [updatingNotifications, setUpdatingNotifications] =
        useState(false);

    const [editModalVisible, setEditModalVisible] =
        useState(false);

    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');

    const [savingProfile, setSavingProfile] = useState(false);

    const [passwordModalVisible, setPasswordModalVisible] =
        useState(false);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    const [savingPassword, setSavingPassword] = useState(false);

    useFocusEffect(
        useCallback(() => {
            let isActive = true;

            const loadSettings = async () => {
                try {
                    const savedPreference =
                        await AsyncStorage.getItem(NOTIFICATIONS_KEY);

                    if (isActive) {
                        setNotificationsEnabled(
                            savedPreference === null
                                ? true
                                : savedPreference === 'true'
                        );
                    }
                } catch (error) {
                    console.error(
                        'Error loading notification settings:',
                        error
                    );
                }
            };

            loadSettings();

            return () => {
                isActive = false;
            };
        }, [])
    );

    const openEditProfile = () => {
        setEditName(user?.name ?? '');
        setEditEmail(user?.email ?? '');
        setEditModalVisible(true);
    };

    const handleSaveProfile = async () => {
        if (!editName.trim() || !editEmail.trim()) {
            Alert.alert(
                'Missing Information',
                'Please enter your name and email address.'
            );
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmail.trim())) {
            Alert.alert(
                'Invalid Email',
                'Please enter a valid email address.'
            );
            return;
        }

        if (!user) {
            Alert.alert(
                'Error',
                'Your account information could not be found.'
            );
            return;
        }

        setSavingProfile(true);

        try {
            await updateUserProfile({
                ...user,
                name: editName.trim(),
                email: editEmail.trim().toLowerCase(),
            });

            await refreshAuth();

            setEditModalVisible(false);

            Alert.alert(
                'Profile Updated',
                'Your profile information has been updated successfully.'
            );
        } catch (error) {
            console.error('Error updating profile:', error);

            Alert.alert(
                'Update Failed',
                'Could not update your profile. Please try again.'
            );
        } finally {
            setSavingProfile(false);
        }
    };

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmNewPassword) {
            Alert.alert(
                'Missing Information',
                'Please complete all password fields.'
            );
            return;
        }

        if (newPassword.length < 8) {
            Alert.alert(
                'Weak Password',
                'Your new password must contain at least 8 characters.'
            );
            return;
        }

        if (newPassword !== confirmNewPassword) {
            Alert.alert(
                'Password Mismatch',
                'Your new passwords do not match.'
            );
            return;
        }

        if (currentPassword === newPassword) {
            Alert.alert(
                'Invalid Password',
                'Your new password must be different from your current password.'
            );
            return;
        }

        setSavingPassword(true);

        try {
            await changeUserPassword(
                currentPassword,
                newPassword
            );

            setPasswordModalVisible(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');

            Alert.alert(
                'Password Changed',
                'Your password has been updated successfully.'
            );
        } catch (error) {
            console.error('Error changing password:', error);

            Alert.alert(
                'Password Change Failed',
                error instanceof Error
                    ? error.message
                    : 'Could not change your password. Please try again.'
            );
        } finally {
            setSavingPassword(false);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'Log Out?',
            'Are you sure you want to log out of your BuyLater account?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Yes, Log Out',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await logout();
                            router.replace('/(auth)');
                        } catch (error) {
                            console.error('Error logging out:', error);

                            Alert.alert(
                                'Logout Failed',
                                'Could not log out. Please try again.'
                            );
                        }
                    },
                },
            ]
        );
    };

    const handleNotificationToggle = async (enabled: boolean) => {
        if (updatingNotifications) {
            return;
        }

        setUpdatingNotifications(true);

        try {
            const purchases = await getPurchases();

            if (enabled) {
                const hasPermission =
                    await requestNotificationPermission();

                if (!hasPermission) {
                    Alert.alert(
                        'Permission Required',
                        'Please allow notifications in your phone settings to receive purchase reminders.'
                    );
                    return;
                }

                const updatedPurchases = await Promise.all(
                    purchases.map(async (purchase) => {
                        if (
                            purchase.status !== 'Active' &&
                            purchase.status !== 'Overdue'
                        ) {
                            return purchase;
                        }

                        const scheduled =
                            await scheduleAllPurchaseNotifications(
                                purchase.id,
                                purchase.name,
                                purchase.createdAt,
                                purchase.plannedDate
                            );

                        return {
                            ...purchase,
                            reminderNotificationIds:
                                scheduled.reminderNotificationIds,
                            overdueNotificationId:
                                scheduled.overdueNotificationId,
                            notificationsScheduled:
                                scheduled.reminderNotificationIds.length > 0 ||
                                !!scheduled.overdueNotificationId,
                        };
                    })
                );

                await savePurchases(updatedPurchases);

                await AsyncStorage.setItem(
                    NOTIFICATIONS_KEY,
                    'true'
                );

                setNotificationsEnabled(true);

                Alert.alert(
                    'Notifications Enabled',
                    'Purchase reminders have been enabled.'
                );
            } else {
                const updatedPurchases = purchases.map((purchase) => ({
                    ...purchase,
                    reminderNotificationIds: [],
                    overdueNotificationId: undefined,
                    notificationsScheduled: false,
                }));

                await Promise.all(
                    purchases.map((purchase) =>
                        cancelAllPurchaseNotifications(
                            purchase.reminderNotificationIds ?? [],
                            purchase.overdueNotificationId
                        )
                    )
                );

                await savePurchases(updatedPurchases);

                await AsyncStorage.setItem(
                    NOTIFICATIONS_KEY,
                    'false'
                );

                setNotificationsEnabled(false);

                Alert.alert(
                    'Notifications Disabled',
                    'Scheduled purchase reminders have been cancelled.'
                );
            }
        } catch (error) {
            console.error(
                'Error updating notification settings:',
                error
            );

            Alert.alert(
                'Error',
                'Could not update your notification settings. Please try again.'
            );
        } finally {
            setUpdatingNotifications(false);
        }
    };

    const closePasswordModal = () => {
        if (savingPassword) {
            return;
        }

        setPasswordModalVisible(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="light-content" />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
            >
                <Text style={styles.title}>Profile & Settings</Text>

                <Text style={styles.subtitle}>
                    Manage your account and preferences.
                </Text>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        PROFILE INFORMATION
                    </Text>

                    <View style={styles.profileCard}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {user?.name?.trim().charAt(0).toUpperCase() || 'B'}
                            </Text>
                        </View>

                        <View style={styles.profileInfo}>
                            <Text style={styles.profileName}>
                                {user?.name || 'Your Name'}
                            </Text>

                            <Text style={styles.profileEmail}>
                                {user?.email || 'yourname@example.com'}
                            </Text>

                            <Text style={styles.profileNote}>
                                Personal BuyLater account
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        NOTIFICATIONS
                    </Text>

                    <View style={styles.settingCard}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingTitle}>
                                Purchase Reminders
                            </Text>

                            <Text style={styles.settingDescription}>
                                Receive reminders about your planned purchases
                                and overdue purchases.
                            </Text>

                            <Text style={styles.settingStatus}>
                                {updatingNotifications
                                    ? 'Updating...'
                                    : notificationsEnabled
                                      ? 'Notifications are enabled'
                                      : 'Notifications are disabled'}
                            </Text>
                        </View>

                        <Switch
                            value={notificationsEnabled}
                            onValueChange={handleNotificationToggle}
                            disabled={updatingNotifications}
                            trackColor={{
                                false: '#49443A',
                                true: COLORS.gold,
                            }}
                            thumbColor={
                                notificationsEnabled
                                    ? COLORS.text
                                    : COLORS.muted
                            }
                        />
                    </View>

                    <Text style={styles.helperText}>
                        When disabled, scheduled purchase reminders will
                        be cancelled. You can enable them again anytime.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        ACCOUNT
                    </Text>

                    <View style={styles.accountCard}>
                        <TouchableOpacity
                            style={styles.accountButton}
                            onPress={openEditProfile}
                        >
                            <View style={styles.accountButtonInfo}>
                                <Text style={styles.accountButtonTitle}>
                                    Edit Profile
                                </Text>

                                <Text style={styles.accountButtonDescription}>
                                    Change your name and email address.
                                </Text>
                            </View>

                            <Text style={styles.accountArrow}>›</Text>
                        </TouchableOpacity>

                        <View style={styles.accountDivider} />

                        <TouchableOpacity
                            style={styles.accountButton}
                            onPress={() => setPasswordModalVisible(true)}
                        >
                            <View style={styles.accountButtonInfo}>
                                <Text style={styles.accountButtonTitle}>
                                    Change Password
                                </Text>

                                <Text style={styles.accountButtonDescription}>
                                    Update your account password.
                                </Text>
                            </View>

                            <Text style={styles.accountArrow}>›</Text>
                        </TouchableOpacity>

                        <View style={styles.accountDivider} />

                        <TouchableOpacity
                            style={styles.accountButton}
                            onPress={handleLogout}
                        >
                            <View style={styles.accountButtonInfo}>
                                <Text style={styles.logoutTitle}>
                                    Log Out
                                </Text>

                                <Text style={styles.accountButtonDescription}>
                                    Log out of your BuyLater account.
                                </Text>
                            </View>

                            <Text style={styles.logoutArrow}>›</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            <Modal
                visible={editModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setEditModalVisible(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>
                            Edit Profile
                        </Text>

                        <Text style={styles.modalSubtitle}>
                            Update your account information.
                        </Text>

                        <Text style={styles.inputLabel}>
                            Full Name
                        </Text>

                        <TextInput
                            style={styles.input}
                            value={editName}
                            onChangeText={setEditName}
                            placeholder="Enter your name"
                            placeholderTextColor={COLORS.muted}
                            autoCapitalize="words"
                            editable={!savingProfile}
                        />

                        <Text style={styles.inputLabel}>
                            Email Address
                        </Text>

                        <TextInput
                            style={styles.input}
                            value={editEmail}
                            onChangeText={setEditEmail}
                            placeholder="Enter your email"
                            placeholderTextColor={COLORS.muted}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!savingProfile}
                        />

                        <TouchableOpacity
                            style={[
                                styles.saveButton,
                                savingProfile && styles.disabledButton,
                            ]}
                            onPress={handleSaveProfile}
                            disabled={savingProfile}
                        >
                            <Text style={styles.saveButtonText}>
                                {savingProfile ? 'Saving...' : 'Save Changes'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => setEditModalVisible(false)}
                            disabled={savingProfile}
                        >
                            <Text style={styles.cancelButtonText}>
                                Cancel
                            </Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <Modal
                visible={passwordModalVisible}
                transparent
                animationType="slide"
                onRequestClose={closePasswordModal}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>
                            Change Password
                        </Text>

                        <Text style={styles.modalSubtitle}>
                            Enter your current password and choose a new one.
                        </Text>

                        <Text style={styles.inputLabel}>
                            Current Password
                        </Text>

                        <TextInput
                            style={styles.input}
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            placeholder="Enter current password"
                            placeholderTextColor={COLORS.muted}
                            secureTextEntry
                            autoCapitalize="none"
                            editable={!savingPassword}
                        />

                        <Text style={styles.inputLabel}>
                            New Password
                        </Text>

                        <TextInput
                            style={styles.input}
                            value={newPassword}
                            onChangeText={setNewPassword}
                            placeholder="Enter new password"
                            placeholderTextColor={COLORS.muted}
                            secureTextEntry
                            autoCapitalize="none"
                            editable={!savingPassword}
                        />

                        <Text style={styles.inputLabel}>
                            Confirm New Password
                        </Text>

                        <TextInput
                            style={styles.input}
                            value={confirmNewPassword}
                            onChangeText={setConfirmNewPassword}
                            placeholder="Confirm new password"
                            placeholderTextColor={COLORS.muted}
                            secureTextEntry
                            autoCapitalize="none"
                            editable={!savingPassword}
                        />

                        <TouchableOpacity
                            style={[
                                styles.saveButton,
                                savingPassword && styles.disabledButton,
                            ]}
                            onPress={handleChangePassword}
                            disabled={savingPassword}
                        >
                            <Text style={styles.saveButtonText}>
                                {savingPassword
                                    ? 'Updating...'
                                    : 'Update Password'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={closePasswordModal}
                            disabled={savingPassword}
                        >
                            <Text style={styles.cancelButtonText}>
                                Cancel
                            </Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        padding: 20,
        paddingTop: 25,
        paddingBottom: 40,
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.secondary,
        marginTop: 8,
    },
    section: {
        marginTop: 32,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.gold,
        letterSpacing: 1.5,
        marginBottom: 14,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    avatar: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: COLORS.gold,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.background,
    },
    profileInfo: {
        marginLeft: 15,
        flex: 1,
    },
    profileName: {
        fontSize: 17,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    profileEmail: {
        fontSize: 13,
        color: COLORS.secondary,
        marginTop: 5,
    },
    profileNote: {
        fontSize: 11,
        color: COLORS.muted,
        marginTop: 5,
    },
    settingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    settingInfo: {
        flex: 1,
        marginRight: 12,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    settingDescription: {
        fontSize: 13,
        color: COLORS.secondary,
        lineHeight: 20,
        marginTop: 7,
    },
    settingStatus: {
        fontSize: 11,
        color: COLORS.gold,
        marginTop: 10,
    },
    helperText: {
        fontSize: 12,
        color: COLORS.muted,
        lineHeight: 19,
        marginTop: 12,
        marginHorizontal: 4,
    },
    accountCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        paddingHorizontal: 18,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    accountButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
    },
    accountButtonInfo: {
        flex: 1,
    },
    accountButtonTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    accountButtonDescription: {
        fontSize: 12,
        color: COLORS.secondary,
        marginTop: 5,
    },
    accountArrow: {
        fontSize: 27,
        color: COLORS.gold,
        marginLeft: 12,
    },
    accountDivider: {
        height: 1,
        backgroundColor: COLORS.border,
    },
    logoutTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: COLORS.red,
    },
    logoutArrow: {
        fontSize: 27,
        color: COLORS.red,
        marginLeft: 12,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'center',
        padding: 22,
    },
    modalCard: {
        backgroundColor: COLORS.card,
        borderRadius: 20,
        padding: 22,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    modalSubtitle: {
        fontSize: 13,
        color: COLORS.secondary,
        marginTop: 7,
        marginBottom: 24,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 9,
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 10,
        paddingHorizontal: 14,
        color: COLORS.text,
        backgroundColor: COLORS.background,
        fontSize: 14,
        marginBottom: 20,
    },
    saveButton: {
        height: 50,
        backgroundColor: COLORS.gold,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 5,
    },
    disabledButton: {
        opacity: 0.6,
    },
    saveButtonText: {
        color: COLORS.background,
        fontSize: 14,
        fontWeight: 'bold',
    },
    cancelButton: {
        height: 45,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    cancelButtonText: {
        color: COLORS.secondary,
        fontSize: 14,
        fontWeight: '600',
    },
});
