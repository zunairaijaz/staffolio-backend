import { Router } from 'express';
import multer from 'multer';
import { uploadScreenshot } from '../controllers/screenshot.controller';

const router = Router();

// ✅ use memory storage to avoid writing to disk
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post(
  '/upload',
  upload.single('screenshot'), 
  uploadScreenshot
);

export default router;
