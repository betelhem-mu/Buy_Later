
import { useState, useCallback } from 'react';
import {
    useLocalSearchParams,
    useRouter,
    useFocusEffect,
} from 'expo-router';

import {
    ActivityIndicator,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { getPurchases } from '../../services/purchaseStorage';
import type { Purchase } from '../../types/purchase';

const COLORS = {
    background: '#101114',
    card: '#242426',
    gold: '#D6B66C',
    goldLight: '#FFF4D6',
    text: '#F7F4EC',
    secondary: '#B5B1A7',
    muted: '#85827B',
    red: '#E47777',
    track: '#49443A',
};

export default function PurchaseDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    const [purchase, setPurchase] = useState<Purchase | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Reload purchase whenever this screen becomes active
    const loadPurchase = useCallback(async () => {
        try {
            const purchases = await getPurchases();

            const foundPurchase = purchases.find(
                (item) => item.id === id
            );

            setPurchase(foundPurchase ?? null);
        } catch (error) {
            console.error('Error loading purchase details:', error);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            loadPurchase();
        }, [loadPurchase])
    );

    const formatPrice = (price: number) =>
        `ETB ${price.toLocaleString()}`;

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.gold} />
                <Text style={styles.secondaryText}>Loading purchase...</Text>
            </View>
        );
    }

    if (!purchase) {
        return (
            <View style={styles.center}>
                <Text style={styles.title}>Purchase not found</Text>

                <Pressable
                    onPress={() => router.back()}
                    style={styles.button}
                >
                    <Text style={styles.buttonText}>Go Back</Text>
                </Pressable>
            </View>
        );
    }

    const progress =
        purchase.estimatedPrice > 0
            ? Math.min(
                (purchase.savedAmount / purchase.estimatedPrice) * 100,
                100
            )
            : 0;

    const remaining = Math.max(
        purchase.estimatedPrice - purchase.savedAmount,
        0
    );

    return (
        <View style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
            >
                <Pressable onPress={() => router.back()}>
                    <Text style={styles.backText}>
                        ‹  Back to My Plans
                    </Text>
                </Pressable>

                <Text style={styles.title}>{purchase.name}</Text>

                <Text style={styles.price}>
                    {formatPrice(purchase.estimatedPrice)}
                </Text>

                {/* Edit Purchase Button */}
                <Pressable
                    style={styles.editButton}
                    onPress={() =>
                        router.push({
                            pathname: '/purchase/add',
                            params: { id: purchase.id },
                        })
                    }
                >
                    <Text style={styles.editButtonText}>
                        ✎  Edit Purchase
                    </Text>
                </Pressable>

                {/* Postpone Purchase Button */}
                <Pressable
                    style={styles.postponeButton}
                    onPress={() =>
                        router.push({
                            pathname: '/purchase/postpone',
                            params: { id: purchase.id },
                        })
                    }
                >
                    <Text style={styles.postponeButtonText}>
                        ◷  Postpone Purchase
                    </Text>
                </Pressable>

                {/* Product Images */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        Product Images
                    </Text>

                    {purchase.images.length > 0 ? (
                        <View style={styles.imageGrid}>
                            {purchase.images.map((image, index) => (
                                <Pressable
                                    key={`${image}-${index}`}
                                    onPress={() => setSelectedImage(image)}
                                >
                                    <Image
                                        source={{ uri: image }}
                                        style={styles.productImage}
                                    />
                                </Pressable>
                            ))}
                        </View>
                    ) : (
                        <Text style={styles.secondaryText}>
                            No product images added.
                        </Text>
                    )}

                    <Text style={styles.imageHint}>
                        Tap an image to view it larger.
                    </Text>
                </View>

                {/* Purchase Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        Purchase Information
                    </Text>

                    <InfoRow
                        label="Priority"
                        value={purchase.priority}
                    />

                    <InfoRow
                        label="Status"
                        value={purchase.status}
                    />

                    <InfoRow
                        label="Planned Date"
                        value={new Date(
                            purchase.plannedDate
                        ).toLocaleDateString()}
                    />

                    <InfoRow
                        label="Created On"
                        value={new Date(
                            purchase.createdAt
                        ).toLocaleDateString()}
                    />
                </View>

                {/* Savings Progress */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        Savings Progress
                    </Text>

                    <View style={styles.progressHeader}>
                        <Text style={styles.secondaryText}>
                            Progress
                        </Text>

                        <Text style={styles.progressText}>
                            {progress.toFixed(0)}%
                        </Text>
                    </View>

                    <View style={styles.progressTrack}>
                        <View
                            style={[
                                styles.progressFill,
                                { width: `${progress}%` },
                            ]}
                        />
                    </View>

                    <InfoRow
                        label="Amount Saved"
                        value={formatPrice(purchase.savedAmount)}
                    />

                    <InfoRow
                        label="Remaining Amount"
                        value={formatPrice(remaining)}
                    />
                </View>
            </ScrollView>

            {/* Enlarged Image Modal */}
            <Modal
                visible={selectedImage !== null}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedImage(null)}
            >
                <View style={styles.modalBackground}>
                    <Pressable
                        style={styles.closeButton}
                        onPress={() => setSelectedImage(null)}
                    >
                        <Text style={styles.closeText}>
                            Close ✕
                        </Text>
                    </Pressable>

                    {selectedImage && (
                        <Image
                            source={{ uri: selectedImage }}
                            style={styles.enlargedImage}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>
        </View>
    );
}

function InfoRow({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <View style={styles.infoRow}>
            <Text style={styles.secondaryText}>
                {label}
            </Text>

            <Text style={styles.infoValue}>
                {value}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    content: {
        padding: 20,
        paddingTop: 60,
        paddingBottom: 35,
    },

    center: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },

    backText: {
        color: COLORS.gold,
        fontSize: 15,
        marginBottom: 25,
    },

    title: {
        color: COLORS.text,
        fontSize: 26,
        fontWeight: 'bold',
    },

    price: {
        color: COLORS.gold,
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 8,
        marginBottom: 20,
    },

    editButton: {
        backgroundColor: COLORS.gold,
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 12,
    },

    editButtonText: {
        color: COLORS.background,
        fontSize: 15,
        fontWeight: 'bold',
    },

    postponeButton: {
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.gold,
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 22,
    },

    postponeButtonText: {
        color: COLORS.gold,
        fontSize: 15,
        fontWeight: 'bold',
    },

    section: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 18,
        borderWidth: 1,
        borderColor: '#333335',
    },

    sectionTitle: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 16,
    },

    imageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },

    productImage: {
        width: 95,
        height: 95,
        borderRadius: 10,
        backgroundColor: COLORS.background,
    },

    imageHint: {
        color: COLORS.muted,
        fontSize: 11,
        marginTop: 12,
    },

    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
        gap: 10,
    },

    secondaryText: {
        color: COLORS.secondary,
        fontSize: 13,
    },

    infoValue: {
        color: COLORS.text,
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'right',
    },

    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 9,
    },

    progressText: {
        color: COLORS.gold,
        fontWeight: 'bold',
    },

    progressTrack: {
        height: 8,
        backgroundColor: COLORS.track,
        borderRadius: 5,
        overflow: 'hidden',
        marginBottom: 18,
    },

    progressFill: {
        height: '100%',
        backgroundColor: COLORS.gold,
        borderRadius: 5,
    },

    button: {
        backgroundColor: COLORS.gold,
        padding: 12,
        borderRadius: 10,
        marginTop: 15,
    },

    buttonText: {
        color: COLORS.background,
        fontWeight: 'bold',
    },

    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 15,
    },

    closeButton: {
        position: 'absolute',
        top: 55,
        right: 20,
        zIndex: 1,
        padding: 12,
    },

    closeText: {
        color: COLORS.text,
        fontSize: 16,
    },

    enlargedImage: {
        width: '100%',
        height: '75%',
    },
});
