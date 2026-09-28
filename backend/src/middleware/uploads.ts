import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { cloudinary } from '../config/cloudinary.js';

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'food_ordering',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 800, crop: 'limit' }],
  } as Record<string, unknown>, // multer-storage-cloudinary's types are loosely typed
});

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 5MB max
});