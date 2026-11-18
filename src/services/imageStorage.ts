
import { Directory, File, Paths } from 'expo-file-system';

// Folder where BuyLater will keep purchase images
const imagesDirectory = new Directory(
    Paths.document,
    'purchase-images'
);

// Copy selected images into permanent app storage
export const savePurchaseImages = async (
    imageUris: string[]
): Promise<string[]> => {
    try {
        // Create the folder if it does not exist
        if (!imagesDirectory.exists) {
            imagesDirectory.create();
        }

        const savedImageUris: string[] = [];

        for (let index = 0; index < imageUris.length; index++) {
            const originalUri = imageUris[index];

            // Keep the original file extension when available
            const cleanUri = originalUri.split('?')[0];
            const extensionMatch = cleanUri.match(
                /\.(jpg|jpeg|png|webp|heic|heif)$/i
            );

            const extension = extensionMatch
                ? extensionMatch[1]
                : 'jpg';

            // Create a unique filename
            const fileName = `${Date.now()}-${index}.${extension}`;

            const originalFile = new File(originalUri);
            const destinationFile = new File(
                imagesDirectory,
                fileName
            );

            // Copy the image into BuyLater's storage
            await originalFile.copy(destinationFile);

            savedImageUris.push(destinationFile.uri);
        }

        return savedImageUris;
    } catch (error) {
        console.error('Error saving purchase images:', error);
        throw error;
    }
};
