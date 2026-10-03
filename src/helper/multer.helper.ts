import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface.js';

export const USER_UPLOAD_DIR = join(process.cwd(), 'uploads', 'users');

export const userProfilePictureUploadOptions: MulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      if (!existsSync(USER_UPLOAD_DIR)) {
        mkdirSync(USER_UPLOAD_DIR, { recursive: true });
      }
      cb(null, USER_UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = extname(file.originalname).toLowerCase();
      cb(null, `user-${uniqueSuffix}${ext}`);
    },
  }),
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
