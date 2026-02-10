import { Router } from 'express';
import multer from 'multer';
import { uploadScreenshot, getAllScreenshots } from '../controllers/screenshot.controller';
import { authGuard } from '../utils/jwt';

const router = Router();

// ✅ use memory storage to avoid writing to disk
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post(
  '/upload',
  upload.single('screenshot'), 
  uploadScreenshot
);
router.get('/', authGuard, getAllScreenshots)

export default router;
