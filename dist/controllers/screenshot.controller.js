"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllScreenshots = exports.uploadScreenshot = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
const Screenshot_1 = __importDefault(require("../models/Screenshot"));
const streamifier_1 = __importDefault(require("streamifier")); // <-- needed for buffer to stream
const uploadScreenshot = async (req, res) => {
    try {
        const { userId, takenAt } = req.body;
        const file = req.file;
        console.log('📥 BODY:', req.body);
        console.log('📷 FILE:', file?.originalname);
        if (!file || !file.buffer) {
            return res.status(400).json({ message: 'Screenshot file missing' });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid userId' });
        }
        // ✅ Upload buffer directly to Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary_1.default.uploader.upload_stream({ folder: 'screenshots' }, (error, result) => {
                if (error)
                    return reject(error);
                resolve(result);
            });
            streamifier_1.default.createReadStream(file.buffer).pipe(uploadStream);
        });
        // ✅ Save to MongoDB
        const screenshot = await Screenshot_1.default.create({
            userId,
            imageUrl: uploadResult.secure_url,
            takenAt: takenAt ? new Date(takenAt) : new Date(),
        });
        console.log('✅ Saved to MongoDB:', screenshot._id);
        return res.status(201).json({ success: true, screenshot });
    }
    catch (error) {
        console.error('❌ Upload error:', error);
        return res.status(500).json({ message: 'Upload failed', error });
    }
};
exports.uploadScreenshot = uploadScreenshot;
const getAllScreenshots = async (req, res) => {
    try {
        const { filter, date, startDate, endDate } = req.query;
        let start;
        let end;
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
            start = new Date(date);
            start.setHours(0, 0, 0, 0);
            end = new Date(date);
            end.setHours(23, 59, 59, 999);
        }
        if (startDate && endDate) {
            start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
        }
        const screenshots = await Screenshot_1.default.find({
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
            screenshots: screenshots.map((shot) => ({
                _id: shot._id,
                imageUrl: shot.imageUrl,
                takenAt: shot.takenAt,
                userName: shot.userId?.name,
                userEmail: shot.userId?.email,
                teamName: shot.userId?.teamName,
            })),
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch screenshots",
        });
    }
};
exports.getAllScreenshots = getAllScreenshots;
