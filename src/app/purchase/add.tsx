
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { File, Directory, Paths } from 'expo-file-system';

import { useEffect, useState } from 'react';

import {
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';

import type { Purchase, PurchasePriority } from '../../types/purchase';
import {
    getPurchases,
    savePurchases,
} from '../../services/purchaseStorage';

const MAX_IMAGES = 5;

export default function AddPurchaseScreen() {
    const { id } = useLocalSearchParams<{ id?: string }>();

    const purchaseId = Array.isArray(id) ? id[0] : id;
    const isEditing = Boolean(purchaseId);

    const [originalPurchase, setOriginalPurchase] =
        useState<Purchase | null>(null);

    const [isLoading, setIsLoading] = useState(isEditing);

    const [purchaseName, setPurchaseName] = useState('');
    const [estimatedPrice, setEstimatedPrice] = useState('');
    const [priority, setPriority] =
        useState<PurchasePriority>('Medium');

    const [plannedDate, setPlannedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [savedAmount, setSavedAmount] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Load existing purchase when editing
    useEffect(() => {
        if (!purchaseId) {
            setIsLoading(false);
            return;
        }

        let isActive = true;

        const loadPurchase = async () => {
            try {
                const purchases = await getPurchases();

                const existingPurchase = purchases.find(
                    (purchase) => purchase.id === purchaseId
                );

                if (!existingPurchase) {
                    Alert.alert(
                        'Purchase Not Found',
                        'This purchase could not be found.',
                        [
                            {
                                text: 'OK',
                                onPress: () => router.back(),
                            },
                        ]
                    );
                    return;
                }

                if (isActive) {
                    setOriginalPurchase(existingPurchase);
                    setPurchaseName(existingPurchase.name);
                    setEstimatedPrice(
                        existingPurchase.estimatedPrice.toString()
                    );
                    setPriority(existingPurchase.priority);
                    setPlannedDate(
                        new Date(existingPurchase.plannedDate)
                    );
                    setSavedAmount(
                        existingPurchase.savedAmount.toString()
                    );
                    setImages(existingPurchase.images ?? []);
                }
            } catch (error) {
                console.error('Error loading purchase:', error);

                Alert.alert(
                    'Loading Failed',
                    'Could not load this purchase. Please try again.',
                    [
                        {
                            text: 'OK',
                            onPress: () => router.back(),
                        },
                    ]
                );
            } finally {
                if (isActive) {
                    setIsLoading(false);
                }
            }
        };

        loadPurchase();

        return () => {
            isActive = false;
        };
    }, [purchaseId]);

    // Select multiple images
    const pickImages = async () => {
        const remainingSlots = MAX_IMAGES - images.length;

        if (remainingSlots <= 0) {
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            selectionLimit: remainingSlots,
            quality: 1,
        });

        if (!result.canceled) {
            const selectedImages = result.assets.map(
                (asset) => asset.uri
            );

            setImages((currentImages) => [
                ...currentImages,
                ...selectedImages.slice(
                    0,
                    MAX_IMAGES - currentImages.length
                ),
            ]);
        }
    };

    // Remove an image
    const removeImage = (indexToRemove: number) => {
        setImages((currentImages) =>
            currentImages.filter(
                (_, index) => index !== indexToRemove
            )
        );
    };

    // Save newly selected images permanently.
    // Existing images are kept in their current storage locations.
    const saveImagesPermanently = async (
        currentPurchaseId: string
    ): Promise<string[]> => {
        const imageDirectory = new Directory(
            Paths.document,
            'purchase-images'
        );

        imageDirectory.create({
            idempotent: true,
            intermediates: true,
        });

        const permanentImages: string[] = [];

        for (let index = 0; index < images.length; index++) {
            const imageUri = images[index];

            const isExistingImage =
                originalPurchase?.images.includes(imageUri) ?? false;

            if (isExistingImage) {
                permanentImages.push(imageUri);
                continue;
            }

            const originalFile = new File(imageUri);

            const extensionMatch = imageUri
                .split('?')[0]
                .match(/\.[a-zA-Z0-9]+$/);

            const extension = extensionMatch
                ? extensionMatch[0]
                : '.jpg';

            const destinationFile = new File(
                imageDirectory,
                `${currentPurchaseId}-${Date.now()}-${index}${extension}`
            );

            await originalFile.copy(destinationFile);

            permanentImages.push(destinationFile.uri);
        }

        return permanentImages;
    };

    // Validate and save purchase
    const handleSave = async () => {
        const name = purchaseName.trim();
        const price = Number(estimatedPrice);

        const savings = savedAmount.trim() === ''
            ? 0
            : Number(savedAmount);

        if (!name) {
            Alert.alert(
                'Missing Name',
                'Please enter the purchase name.'
            );
            return;
        }

        if (
            !estimatedPrice.trim() ||
            !Number.isFinite(price) ||
            price <= 0
        ) {
            Alert.alert(
                'Invalid Price',
                'Please enter a valid estimated price greater than zero.'
            );
            return;
        }

        if (!Number.isFinite(savings) || savings < 0) {
            Alert.alert(
                'Invalid Savings',
                'Please enter a valid savings amount.'
            );
            return;
        }

        if (savings > price) {
            Alert.alert(
                'Invalid Savings',
                'Your savings cannot be greater than the estimated price.'
            );
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const selectedDate = new Date(plannedDate);
        selectedDate.setHours(0, 0, 0, 0);

        const originalDate = originalPurchase
            ? new Date(originalPurchase.plannedDate)
            : null;

        if (
            selectedDate < today &&
            (!originalDate ||
                selectedDate.getTime() !==
                new Date(
                    originalDate.setHours(0, 0, 0, 0)
                ).getTime())
        ) {
            Alert.alert(
                'Invalid Date',
                'Please select today or a future date.'
            );
            return;
        }

        try {
            setIsSaving(true);

            // Use the existing ID when editing.
            // Create a new ID when adding.
            const currentPurchaseId = originalPurchase
                ? originalPurchase.id
                : Date.now().toString();

            // Save newly selected images
            const permanentImages =
                await saveImagesPermanently(currentPurchaseId);

            const purchases = await getPurchases();

            if (originalPurchase) {
                // Update the existing purchase
                const updatedPurchase: Purchase = {
                    ...originalPurchase,
                    name,
                    estimatedPrice: price,
                    priority,
                    plannedDate: plannedDate.toISOString(),
                    savedAmount: savings,
                    images: permanentImages,
                };

                const updatedPurchases = purchases.map(
                    (purchase) =>
                        purchase.id === currentPurchaseId
                            ? updatedPurchase
                            : purchase
                );

                await savePurchases(updatedPurchases);

                Alert.alert(
                    'Purchase Updated',
                    'Your purchase has been updated successfully.',
                    [
                        {
                            text: 'OK',
                            onPress: () => router.back(),
                        },
                    ]
                );
            } else {
                // Create a new purchase
                const newPurchase: Purchase = {
                    id: currentPurchaseId,
                    name,
                    estimatedPrice: price,
                    priority,
                    plannedDate: plannedDate.toISOString(),
                    createdAt: new Date().toISOString(),
                    savedAmount: savings,
                    images: permanentImages,
                    status: 'Active',
                };

                await savePurchases([
                    ...purchases,
                    newPurchase,
                ]);

                Alert.alert(
                    'Purchase Saved',
                    'Your purchase has been saved successfully.',
                    [
                        {
                            text: 'OK',
                            onPress: () => router.back(),
                        },
                    ]
                );
            }
        } catch (error) {
            console.error('Error saving purchase:', error);

            Alert.alert(
                'Save Failed',
                'Something went wrong while saving your purchase. Please try again.'
            );
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>
                    Loading purchase...
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Text style={styles.backText}>←</Text>
                </Pressable>

                <Text style={styles.headerTitle}>
                    {isEditing ? 'Edit Purchase' : 'Add New Purchase'}
                </Text>

                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Introduction */}
                <View style={styles.intro}>
                    <Text style={styles.title}>
                        {isEditing
                            ? 'Update your purchase'
                            : 'Plan your next purchase'}
                    </Text>

                    <Text style={styles.subtitle}>
                        {isEditing
                            ? 'Make changes to your planned purchase details.'
                            : 'Add the details of something you want to buy later.'}
                    </Text>
                </View>

                {/* Form */}
                <View style={styles.formCard}>
                    <Text style={styles.formTitle}>
                        Purchase Information
                    </Text>

                    <Text style={styles.inputLabel}>
                        Purchase Name
                    </Text>

                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Wireless Headphones"
                        placeholderTextColor="#9AA2B1"
                        value={purchaseName}
                        onChangeText={setPurchaseName}
                    />

                    <Text style={styles.inputLabel}>
                        Estimated Price
                    </Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Enter estimated price"
                        placeholderTextColor="#9AA2B1"
                        value={estimatedPrice}
                        onChangeText={setEstimatedPrice}
                        keyboardType="decimal-pad"
                    />

                    <Text style={styles.inputLabel}>
                        Purchase Priority
                    </Text>

                    <View style={styles.priorityContainer}>
                        {(['Low', 'Medium', 'High'] as const).map((item) => (
                            <Pressable
                                key={item}
                                style={[
                                    styles.priorityButton,
                                    priority === item && styles.selectedPriority,
                                ]}
                                onPress={() => setPriority(item)}
                            >
                                <Text
                                    style={[
                                        styles.priorityText,
                                        priority === item && styles.selectedPriorityText,
                                    ]}
                                >
                                    {item}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    <Text style={styles.inputLabel}>
                        Planned Purchase Date
                    </Text>

                    <Pressable
                        style={styles.dateButton}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Text style={styles.dateButtonText}>
                            {plannedDate.toLocaleDateString()}
                        </Text>

                        <Text style={styles.calendarIcon}>📅</Text>
                    </Pressable>

                    {showDatePicker && (
                        <DateTimePicker
                            value={plannedDate}
                            mode="date"
                            minimumDate={
                                isEditing ? undefined : new Date()
                            }
                            display="default"
                            onChange={(event, selectedDate) => {
                                setShowDatePicker(false);

                                if (event.type === 'set' && selectedDate) {
                                    setPlannedDate(selectedDate);
                                }
                            }}
                        />
                    )}

                    <Text style={styles.inputLabel}>
                        Amount Saved
                    </Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Enter amount already saved"
                        placeholderTextColor="#9AA2B1"
                        value={savedAmount}
                        onChangeText={setSavedAmount}
                        keyboardType="decimal-pad"
                    />

                    {/* Product Images */}
                    <Text style={styles.inputLabel}>
                        Product Images
                    </Text>

                    <Text style={styles.imageCounter}>
                        {images.length}/{MAX_IMAGES} images selected
                    </Text>

                    <Pressable
                        style={[
                            styles.imagePickerButton,
                            images.length >= MAX_IMAGES &&
                                styles.disabledImageButton,
                        ]}
                        onPress={pickImages}
                        disabled={images.length >= MAX_IMAGES}
                    >
                        <Text style={styles.imagePickerButtonText}>
                            {images.length >= MAX_IMAGES
                                ? 'Maximum 5 Images Selected'
                                : '+ Add Product Images'}
                        </Text>
                    </Pressable>

                    {images.length > 0 && (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.imageList}
                        >
                            {images.map((imageUri, index) => (
                                <View
                                    key={`${imageUri}-${index}`}
                                    style={styles.imageContainer}
                                >
                                    <Image
                                        source={{ uri: imageUri }}
                                        style={styles.productImage}
                                    />

                                    <Pressable
                                        style={styles.removeImageButton}
                                        onPress={() => removeImage(index)}
                                    >
                                        <Text style={styles.removeImageText}>
                                            ×
                                        </Text>
                                    </Pressable>
                                </View>
                            ))}
                        </ScrollView>
                    )}
                </View>

                {/* Save Button */}
                <Pressable
                    style={[
                        styles.saveButton,
                        isSaving && styles.disabledImageButton,
                    ]}
                    onPress={handleSave}
                    disabled={isSaving}
                >
                    <Text style={styles.saveButtonText}>
                        {isSaving
                            ? 'Saving Purchase...'
                            : isEditing
                                ? 'Update Purchase'
                                : 'Save Purchase'}
                    </Text>
                </Pressable>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F8FC',
    },

    loadingContainer: {
        flex: 1,
        backgroundColor: '#F7F8FC',
        alignItems: 'center',
        justifyContent: 'center',
    },

    loadingText: {
        fontSize: 15,
        color: '#7B8497',
    },

    scrollView: {
        flex: 1,
    },

    content: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 40,
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 55,
        paddingBottom: 15,
        backgroundColor: '#F7F8FC',
    },

    backButton: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },

    backText: {
        fontSize: 27,
        color: '#17233D',
    },

    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#17233D',
    },

    headerSpacer: {
        width: 42,
    },

    intro: {
        marginBottom: 25,
    },

    title: {
        fontSize: 23,
        fontWeight: 'bold',
        color: '#17233D',
    },

    subtitle: {
        fontSize: 14,
        color: '#7B8497',
        marginTop: 8,
        lineHeight: 21,
    },

    formCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: '#EEF0F5',
    },

    formTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#17233D',
        marginBottom: 15,
    },

    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#17233D',
        marginBottom: 8,
        marginTop: 12,
    },

    input: {
        backgroundColor: '#F7F8FC',
        borderWidth: 1,
        borderColor: '#E5E9F0',
        borderRadius: 12,
        padding: 14,
        fontSize: 14,
        color: '#17233D',
        marginBottom: 15,
    },

    priorityContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
        marginTop: 5,
    },

    priorityButton: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E5E9F0',
        backgroundColor: '#F7F8FC',
        alignItems: 'center',
    },

    selectedPriority: {
        backgroundColor: '#2878D0',
        borderColor: '#2878D0',
    },

    priorityText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#7B8497',
    },

    selectedPriorityText: {
        color: '#FFFFFF',
    },

    dateButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F7F8FC',
        borderWidth: 1,
        borderColor: '#E5E9F0',
        borderRadius: 12,
        padding: 14,
        marginTop: 5,
    },

    dateButtonText: {
        fontSize: 14,
        color: '#17233D',
    },

    calendarIcon: {
        fontSize: 20,
    },

    imageCounter: {
        fontSize: 12,
        color: '#7B8497',
        marginBottom: 8,
    },

    imagePickerButton: {
        backgroundColor: '#F0F6FF',
        borderWidth: 1,
        borderColor: '#2878D0',
        borderStyle: 'dashed',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 5,
    },

    disabledImageButton: {
        opacity: 0.5,
    },

    imagePickerButtonText: {
        color: '#2878D0',
        fontSize: 14,
        fontWeight: '600',
    },

    imageList: {
        marginTop: 15,
    },

    imageContainer: {
        marginRight: 12,
        borderRadius: 12,
        position: 'relative',
    },

    productImage: {
        width: 100,
        height: 100,
        borderRadius: 12,
    },

    removeImageButton: {
        position: 'absolute',
        top: 5,
        right: 5,
        width: 25,
        height: 25,
        borderRadius: 13,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },

    removeImageText: {
        fontSize: 20,
        color: '#E04444',
        fontWeight: 'bold',
        lineHeight: 23,
    },

    saveButton: {
        backgroundColor: '#2878D0',
        padding: 17,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 25,
    },

    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: 'bold',
    },
});
