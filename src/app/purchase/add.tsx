
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useState } from 'react';

import {
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { router } from 'expo-router';

const MAX_IMAGES = 5;

export default function AddPurchaseScreen() {
    // Purchase information
    const [purchaseName, setPurchaseName] = useState('');
    const [estimatedPrice, setEstimatedPrice] = useState('');

    // Purchase priority
    const [priority, setPriority] = useState('Medium');

    // Planned purchase date
    const [plannedDate, setPlannedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Initial savings
    const [savedAmount, setSavedAmount] = useState('');

    // Product images
    const [images, setImages] = useState<string[]>([]);

    // Open gallery and select multiple images
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

    // Remove an individual image
    const removeImage = (indexToRemove: number) => {
        setImages((currentImages) =>
            currentImages.filter(
                (_, index) => index !== indexToRemove
            )
        );
    };

    return (
        <View style={styles.container}>

            {/* Fixed Header */}
            <View style={styles.header}>
                <Pressable
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Text style={styles.backText}>←</Text>
                </Pressable>

                <Text style={styles.headerTitle}>
                    Add New Purchase
                </Text>

                <View style={styles.headerSpacer} />
            </View>

            {/* Scrollable Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >

                {/* Introduction */}
                <View style={styles.intro}>
                    <Text style={styles.title}>
                        Plan your next purchase
                    </Text>

                    <Text style={styles.subtitle}>
                        Add the details of something you want to buy later.
                    </Text>
                </View>

                {/* Form Container */}
                <View style={styles.formCard}>
                    <Text style={styles.formTitle}>
                        Purchase Information
                    </Text>

                    {/* Purchase Name */}
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

                    {/* Estimated Price */}
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

                    {/* Priority Selection */}
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

                    {/* Planned Purchase Date */}
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
                            minimumDate={new Date()}
                            display="default"
                            onChange={(event, selectedDate) => {
                                setShowDatePicker(false);

                                if (event.type === 'set' && selectedDate) {
                                    setPlannedDate(selectedDate);
                                }
                            }}
                        />
                    )}

                    {/* Initial Savings */}
                    <Text style={styles.inputLabel}>
                        Initial Savings
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
                            images.length >= MAX_IMAGES && styles.disabledImageButton,
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

                    {/* Selected Image Previews */}
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
                    style={styles.saveButton}
                    onPress={() => { }}
                >
                    <Text style={styles.saveButtonText}>
                        Save Purchase
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

    scrollView: {
        flex: 1,
    },

    content: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 40,
    },

    // Fixed Header
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

    // Introduction
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

    // Form
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

    // Priority
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

    // Planned Date
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

    // Product Images
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

    // Save Button
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
