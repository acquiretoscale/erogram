import imageCompression from 'browser-image-compression';

export async function compressImage(file: File): Promise<File> {
    const options = {
        maxSizeMB: 0.8, // Compress to under 1MB to be safe for Nginx default
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/jpeg', // Convert to JPEG for better compression
    };

    try {
        const compressedFile = await imageCompression(file, options);
        // Create a new file with the original name but potentially new extension
        return new File([compressedFile], file.name, { type: compressedFile.type });
    } catch (error) {
        console.error('Image compression failed:', error);
        // Return original file if compression fails, though it might still fail upload
        return file;
    }
}
