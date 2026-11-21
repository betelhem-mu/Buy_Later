
import { useState } from 'react';
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../contexts/AuthContext';
import { loginUser, registerUser } from '../../services/authService';

const COLORS = {
    background: '#101114',
    card: '#242426',
    gold: '#D6B66C',
    goldLight: '#FFF4D6',
    text: '#F7F4EC',
    secondary: '#B5B1A7',
    muted: '#85827B',
    border: '#38383A',
    red: '#E47777',
};

export default function AuthScreen() {
    const { refreshAuth } = useAuth();

    const [isLogin, setIsLogin] = useState(true);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!password) {
            Alert.alert(
                'Missing Information',
                'Please enter your password.'
            );
            return;
        }

        if (!isLogin) {
            if (!name.trim() || !email.trim()) {
                Alert.alert(
                    'Missing Information',
                    'Please enter your full name and email address.'
                );
                return;
            }

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
                Alert.alert(
                    'Invalid Email',
                    'Please enter a valid email address.'
                );
                return;
            }

            if (password.length < 8) {
                Alert.alert(
                    'Weak Password',
                    'Your password must contain at least 8 characters.'
                );
                return;
            }

            if (password !== confirmPassword) {
                Alert.alert(
                    'Password Mismatch',
                    'Your passwords do not match.'
                );
                return;
            }
        }

        setLoading(true);

        try {
            await new Promise<void>((resolve) => setTimeout(resolve, 50));

            if (isLogin) {
                await loginUser(password);
            } else {
                await registerUser(name, email, password);
            }

            await refreshAuth();

            setName('');
            setEmail('');
            setPassword('');
            setConfirmPassword('');
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Something went wrong. Please try again.';

            Alert.alert(
                isLogin ? 'Login Failed' : 'Registration Failed',
                message
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <StatusBar barStyle="light-content" />

            <KeyboardAvoidingView
                style={styles.keyboardContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* APP BRAND */}

                    <View style={styles.brandContainer}>
                        <Image
                            source={require('../../../assets/images/buylater-logo.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />

                        <Text style={styles.appName}>BuyLater</Text>

                        <Text style={styles.tagline}>
                            Plan today. Purchase tomorrow.
                        </Text>
                    </View>

                    {/* FORM HEADING */}

                    <View style={styles.headingContainer}>
                        <Text style={styles.heading}>
                            {isLogin ? 'Welcome to BuyLater' : 'Create Account'}
                        </Text>

                        <Text style={styles.subtitle}>
                            {isLogin
                                ? 'Enter your password to continue.'
                                : 'Create your account to start planning ahead.'}
                        </Text>
                    </View>

                    {/* FORM CARD */}

                    <View style={styles.formCard}>
                        {!isLogin && (
                            <>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Full Name</Text>

                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter your full name"
                                        placeholderTextColor={COLORS.muted}
                                        value={name}
                                        onChangeText={setName}
                                        autoCapitalize="words"
                                        editable={!loading}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Email Address</Text>

                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter your email"
                                        placeholderTextColor={COLORS.muted}
                                        value={email}
                                        onChangeText={setEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        editable={!loading}
                                    />
                                </View>
                            </>
                        )}

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Password</Text>

                            <View style={styles.passwordContainer}>
                                <TextInput
                                    style={styles.passwordInput}
                                    placeholder="Enter your password"
                                    placeholderTextColor={COLORS.muted}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    editable={!loading}
                                />

                                <TouchableOpacity
                                    onPress={() => setShowPassword(!showPassword)}
                                    disabled={loading}
                                >
                                    <Text style={styles.showPassword}>
                                        {showPassword ? 'Hide' : 'Show'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {!isLogin && (
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Confirm Password</Text>

                                <View style={styles.passwordContainer}>
                                    <TextInput
                                        style={styles.passwordInput}
                                        placeholder="Confirm your password"
                                        placeholderTextColor={COLORS.muted}
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        secureTextEntry={!showConfirmPassword}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        editable={!loading}
                                    />

                                    <TouchableOpacity
                                        onPress={() =>
                                            setShowConfirmPassword(!showConfirmPassword)
                                        }
                                        disabled={loading}
                                    >
                                        <Text style={styles.showPassword}>
                                            {showConfirmPassword ? 'Hide' : 'Show'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* SUBMIT BUTTON */}

                        <TouchableOpacity
                            style={[
                                styles.submitButton,
                                loading && styles.disabledButton,
                            ]}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            <Text style={styles.submitButtonText}>
                                {loading
                                    ? isLogin
                                        ? 'Checking password...'
                                        : 'Creating account...'
                                    : isLogin
                                        ? 'Log In'
                                        : 'Create Account'}
                            </Text>
                        </TouchableOpacity>

                        {/* SWITCH LOGIN / REGISTER */}

                        <View style={styles.switchContainer}>
                            <Text style={styles.switchText}>
                                {isLogin
                                    ? "Don't have an account?"
                                    : 'Already have an account?'}
                            </Text>

                            <TouchableOpacity
                                onPress={() => {
                                    setIsLogin(!isLogin);
                                    setPassword('');
                                    setConfirmPassword('');
                                }}
                                disabled={loading}
                            >
                                <Text style={styles.switchAction}>
                                    {isLogin ? 'Register' : 'Log In'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Text style={styles.footer}>
                        Your purchases. Your plans. Your progress.
                    </Text>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    keyboardContainer: {
        flex: 1,
    },
    content: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 35,
        paddingBottom: 30,
        justifyContent: 'center',
    },
    brandContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logo: {
        width: 85,
        height: 85,
    },
    appName: {
        fontSize: 27,
        fontWeight: 'bold',
        color: COLORS.gold,
        marginTop: 12,
    },
    tagline: {
        fontSize: 13,
        color: COLORS.secondary,
        marginTop: 6,
    },
    headingContainer: {
        marginBottom: 22,
    },
    heading: {
        fontSize: 25,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    subtitle: {
        fontSize: 13,
        color: COLORS.secondary,
        marginTop: 8,
        lineHeight: 20,
    },
    formCard: {
        backgroundColor: COLORS.card,
        borderRadius: 18,
        padding: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 9,
    },
    input: {
        height: 52,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 10,
        paddingHorizontal: 14,
        color: COLORS.text,
        backgroundColor: COLORS.background,
        fontSize: 14,
    },
    passwordContainer: {
        height: 52,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 10,
        paddingHorizontal: 14,
        backgroundColor: COLORS.background,
    },
    passwordInput: {
        flex: 1,
        height: '100%',
        color: COLORS.text,
        fontSize: 14,
    },
    showPassword: {
        color: COLORS.gold,
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    submitButton: {
        height: 52,
        backgroundColor: COLORS.gold,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 5,
    },
    disabledButton: {
        opacity: 0.6,
    },
    submitButtonText: {
        color: COLORS.background,
        fontSize: 15,
        fontWeight: 'bold',
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 22,
        flexWrap: 'wrap',
    },
    switchText: {
        color: COLORS.secondary,
        fontSize: 12,
        marginRight: 5,
    },
    switchAction: {
        color: COLORS.gold,
        fontSize: 13,
        fontWeight: 'bold',
    },
    footer: {
        textAlign: 'center',
        color: COLORS.muted,
        fontSize: 11,
        marginTop: 30,
    },
});
