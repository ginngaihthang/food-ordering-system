import { cloudinary } from '../config/cloudinary.js';

/**
 * Extracts the Cloudinary public_id from a full image URL so we can delete it.
 * Example URL:
 * https://res.cloudinary.com/demo/image/upload/v1234567890/restaurant-qr-ordering/abc123.jpg
 * → public_id: restaurant-qr-ordering/abc123
 */
export function extractPublicId(imageUrl: string): string | null {
  try {
    const parts = imageUrl.split('/upload/');
    if (parts.length < 2 || !parts[1]) return null;

    

    const afterUpload = parts[1]; // v1234567890/restaurant-qr-ordering/abc123.jpg
    const withoutVersion = afterUpload.replace(/^v\d+\//, ''); // restaurant-qr-ordering/abc123.jpg
    const withoutExtension = withoutVersion.replace(/\.[a-zA-Z0-9]+$/, ''); // restaurant-qr-ordering/abc123

    return withoutExtension;
  } catch {
    return null;
  }
}

export async function deleteCloudinaryImage(imageUrl: string | null): Promise<void> {
  if (!imageUrl) return;

  const publicId = extractPublicId(imageUrl);
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Failed to delete Cloudinary image:', err);
    // Don't throw — a failed image cleanup shouldn't block the main operation
  }
}