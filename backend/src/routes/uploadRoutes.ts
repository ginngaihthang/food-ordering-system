import { Router } from 'express';
import multer from 'multer';
import { upload } from '../middleware/uploads.js';
import { requiredAuth, requireRole } from '../middleware/auth.js';
import { deleteCloudinaryImage } from '../utils/cloudinaryHelpers.js';

const router = Router();

router.post(
  '/',
  requiredAuth,
  requireRole('ADMIN', 'STAFF'),
  (req, res, next) => {
    upload.single('image')(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({ message: 'Image must be smaller than 5MB' });
          return;
        }
        res.status(400).json({ message: err.message });
        return;
      }

      if (err) {
        // e.g. fileFilter rejection, or Cloudinary upload error
        const message = err instanceof Error ? err.message : 'Upload failed';
        res.status(400).json({ message });
        return;
      }

      next();
    });
  },
  (req, res) => {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const imageUrl = (req.file as Express.Multer.File & { path: string }).path;
    res.json({ imageUrl });
  }

);

// New: delete an uploaded image (used when user cancels before saving)
router.delete(
  '/',
  requiredAuth,
  requireRole('ADMIN', 'STAFF'),
  async (req, res) => {
    const { imageUrl } = req.body as { imageUrl?: string };

    if (!imageUrl) {
      res.status(400).json({ message: 'imageUrl is required' });
      return;
    }

    await deleteCloudinaryImage (imageUrl);
    res.json({ message: 'Image deleted' });
  }
);


export default router;