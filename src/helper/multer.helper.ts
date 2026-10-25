import { memoryStorage } from 'multer';
import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface.js';

export const userProfilePictureUploadOptions: MulterOptions = {
  storage: memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.match(/\/(jpg|jpeg|png|webp|gif)$/i)) {
      return cb(
        new BadRequestException(
          'Invalid file type. Only JPG, JPEG, PNG, WEBP, and GIF images are allowed.',
        ),
        false,
      );
    }
    cb(null, true);
  },
};

export const userPhotoUploadOptions = userProfilePictureUploadOptions;

export const dailyExpensePhotoUploadOptions: MulterOptions = {
  storage: memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.match(/\/(jpg|jpeg|png|webp|gif|pdf)$/i)) {
      return cb(
        new BadRequestException(
          'Invalid file type. Only JPG, JPEG, PNG, WEBP, GIF, and PDF files are allowed.',
        ),
        false,
      );
    }
    cb(null, true);
  },
};
