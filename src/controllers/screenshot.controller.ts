import { Request, Response } from 'express';
import mongoose from 'mongoose';
import cloudinary from '../config/cloudinary';
import Screenshot from '../models/Screenshot';
import streamifier from 'streamifier'; // <-- needed for buffer to stream

export const uploadScreenshot = async (req: Request, res: Response) => {
  try {
    const { userId, takenAt } = req.body;
    const file = req.file;

    console.log('📥 BODY:', req.body);
    console.log('📷 FILE:', file?.originalname);

    if (!file || !file.buffer) {
      return res.status(400).json({ message: 'Screenshot file missing' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid userId' });
    }

    // ✅ Upload buffer directly to Cloudinary
    const uploadResult: any = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'screenshots' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });

    // ✅ Save to MongoDB
    const screenshot = await Screenshot.create({
      userId,
      imageUrl: uploadResult.secure_url,
      takenAt: takenAt ? new Date(takenAt) : new Date(),
    });

    console.log('✅ Saved to MongoDB:', screenshot._id);

    return res.status(201).json({ success: true, screenshot });
  } catch (error) {
    console.error('❌ Upload error:', error);
    return res.status(500).json({ message: 'Upload failed', error });
  }
};
