import { Router } from 'express';
import multer from 'multer';
import { uploadScreenshot } from '../controllers/screenshot.controller';

const router = Router();

const upload = multer({ dest: 'uploads/' });

router.post(
  '/upload',
  upload.single('screenshot'), 
  uploadScreenshot
);

export default router;
