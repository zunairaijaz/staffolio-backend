import { Request, Response } from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import cloudinary from '../config/cloudinary';
import Screenshot from '../models/Screenshot';

export const uploadScreenshot = async (req: Request, res: Response) => {
  try {
    const { userId, takenAt } = req.body;
    const file = req.file;

    console.log('📥 BODY:', req.body);
    console.log('📷 FILE:', file?.path);

    if (!file) {
      return res.status(400).json({ message: 'Screenshot file missing' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid userId' });
    }

    const uploadResult = await cloudinary.uploader.upload(file.path, {
      folder: 'screenshots',
    });

    const screenshot = await Screenshot.create({
      userId,
      imageUrl: uploadResult.secure_url,
      takenAt: takenAt ? new Date(takenAt) : new Date(),
    });

    // ✅ cleanup temp file
    fs.unlinkSync(file.path);

    console.log('✅ Saved to MongoDB:', screenshot._id);

    return res.status(201).json({ success: true, screenshot });
  } catch (error) {
    console.error('❌ Upload error:', error);
    return res.status(500).json({ message: 'Upload failed' });
  }
};

