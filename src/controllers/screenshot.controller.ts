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
export const getAllScreenshots = async (req: Request, res: Response) => {
  try {
    const { filter, date, startDate, endDate } = req.query;

    let start: Date;
    let end: Date;

    start = new Date();
    start.setHours(0, 0, 0, 0);

    end = new Date();
    end.setHours(23, 59, 59, 999);

    if (filter === "yesterday") {
      start = new Date();
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);

      end = new Date();
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
    }

    if (date) {
      start = new Date(date as string);
      start.setHours(0, 0, 0, 0);

      end = new Date(date as string);
      end.setHours(23, 59, 59, 999);
    }

    if (startDate && endDate) {
      start = new Date(startDate as string);
      start.setHours(0, 0, 0, 0);

      end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
    }

    const screenshots = await Screenshot.find({
      takenAt: { $gte: start, $lte: end },
    })
      .populate("userId", "name email teamName")
      .sort({ takenAt: -1 });

    return res.status(200).json({
      success: true,
      count: screenshots.length,

      appliedFilter: {
        filter: filter || "today",
        startDate: start,
        endDate: end,
      },

      screenshots: screenshots.map((shot: any) => ({
        _id: shot._id,
        imageUrl: shot.imageUrl,
        takenAt: shot.takenAt,

        userName: shot.userId?.name,
        userEmail: shot.userId?.email,
        teamName: shot.userId?.teamName,
      })),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch screenshots",
    });
  }
};
