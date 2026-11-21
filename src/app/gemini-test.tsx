
import { useState } from 'react';

import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    ScrollView,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { testGeminiConnection } from '@/services/geminiService';

const REQUEST_TIMEOUT = 90000;

export default function GeminiTestScreen() {
    const [answer, setAnswer] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleTest = async () => {
        if (loading) return;

        setLoading(true);
        setAnswer('');
        setError('');

        let timeoutId: ReturnType<typeof setTimeout> | undefined;

        try {
            const timeoutPromise = new Promise<never>((_, reject) => {
                timeoutId = setTimeout(() => {
                    reject(
                        new Error(
                            'Gemini took longer than 30 seconds to respond. Check your internet connection and try again.'
                        )
                    );
                }, REQUEST_TIMEOUT);
            });

            const result = await Promise.race([
                testGeminiConnection(),
                timeoutPromise,
            ]);

            setAnswer(result);
        } catch (err) {
            console.error('Gemini test error:', err);

            setError(
                err instanceof Error
                    ? err.message
                    : 'Something went wrong. Please try again.'
            );
        } finally {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.title}>
                    Gemini Connection Test
                </Text>

                <Text style={styles.description}>
                    Check whether BuyLater can communicate with Google
                    Gemini using your internet connection.
                </Text>

                <TouchableOpacity
                    style={[
                        styles.button,
                        loading && styles.disabledButton,
                    ]}
                    onPress={handleTest}
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    {loading ? (
                        <View style={styles.loadingButtonContent}>
                            <ActivityIndicator color="#101114" />

                            <Text style={styles.buttonText}>
                                Connecting...
                            </Text>
                        </View>
                    ) : (
                        <Text style={styles.buttonText}>
                            {answer || error
                                ? 'Try Again'
                                : 'Test Gemini Connection'}
                        </Text>
                    )}
                </TouchableOpacity>

                {loading && (
                    <View style={styles.loadingCard}>
                        <ActivityIndicator
                            size="large"
                            color="#D6B66C"
                        />

                        <Text style={styles.loadingTitle}>
                            Waiting for Gemini
                        </Text>

                        <Text style={styles.loadingText}>
                            Gemini is processing your request. This may
                            take a little time depending on your internet
                            connection.
                        </Text>
                    </View>
                )}

                {answer !== '' && (
                    <View style={styles.resultCard}>
                        <Text style={styles.resultTitle}>
                            ✓ Gemini Connected Successfully
                        </Text>

                        <Text style={styles.resultText}>
                            {answer}
                        </Text>
                    </View>
                )}

                {error !== '' && (
                    <View style={styles.errorCard}>
                        <Text style={styles.errorTitle}>
                            Connection Failed
                        </Text>

                        <Text style={styles.errorText}>
                            {error}
                        </Text>

                        <Text style={styles.retryText}>
                            Please check your internet connection and try
                            again.
                        </Text>
                    </View>
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

    content: {
        padding: 24,
        paddingTop: 40,
        paddingBottom: 40,
    },

    title: {
        fontSize: 25,
        fontWeight: 'bold',
        color: '#FFF4D6',
        marginBottom: 12,
    },

    description: {
        fontSize: 15,
        color: '#B5B1A7',
        lineHeight: 23,
        marginBottom: 28,
    },

    button: {
        backgroundColor: '#D6B66C',
        padding: 17,
        borderRadius: 12,
        alignItems: 'center',
    },

    disabledButton: {
        opacity: 0.7,
    },

    buttonText: {
        color: '#101114',
        fontWeight: 'bold',
        fontSize: 16,
    },

    loadingButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },

    loadingCard: {
        backgroundColor: '#242426',
        padding: 22,
        borderRadius: 12,
        marginTop: 25,
        alignItems: 'center',
    },

    loadingTitle: {
        color: '#D6B66C',
        fontSize: 17,
        fontWeight: 'bold',
        marginTop: 15,
        marginBottom: 8,
    },

    loadingText: {
        color: '#B5B1A7',
        fontSize: 14,
        lineHeight: 22,
        textAlign: 'center',
    },

    resultCard: {
        backgroundColor: '#242426',
        padding: 18,
        borderRadius: 12,
        marginTop: 25,
        borderWidth: 1,
        borderColor: '#49443A',
    },

    resultTitle: {
        color: '#D6B66C',
        fontWeight: 'bold',
        fontSize: 17,
        marginBottom: 12,
    },

    resultText: {
        color: '#F7F4EC',
        fontSize: 15,
        lineHeight: 23,
    },

    errorCard: {
        backgroundColor: '#242426',
        padding: 18,
        borderRadius: 12,
        marginTop: 25,
        borderWidth: 1,
        borderColor: '#754444',
    },

    errorTitle: {
        color: '#E47777',
        fontWeight: 'bold',
        fontSize: 17,
        marginBottom: 10,
    },

    errorText: {
        color: '#F7F4EC',
        fontSize: 14,
        lineHeight: 22,
    },

    retryText: {
        color: '#B5B1A7',
        fontSize: 13,
        marginTop: 12,
        lineHeight: 20,
    },
});
