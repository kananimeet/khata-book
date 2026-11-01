import { Injectable, BadRequestException } from '@nestjs/common';
import {
  v2 as cloudinary,
  type UploadApiResponse,
  type UploadApiErrorResponse,
} from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'khata-book',
  ): Promise<UploadApiResponse> {
    if (!file) {
      throw new BadRequestException('No file provided for upload');
    }

    // If buffer is present (memoryStorage)
    if (file.buffer) {
      return new Promise<UploadApiResponse>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'auto',
          },
          (
            error: UploadApiErrorResponse | undefined,
            result: UploadApiResponse | undefined,
          ) => {
            if (error) return reject(error);
            if (!result) return reject(new BadRequestException('Upload failed'));
            resolve(result);
          },
        );

        const stream = Readable.from(file.buffer);
        stream.pipe(uploadStream);
      });
    }

    // If path is present (diskStorage fallback)
    if (file.path) {
      return cloudinary.uploader.upload(file.path, {
        folder,
        resource_type: 'auto',
      });
    }

    throw new BadRequestException(
      'Invalid file object: neither buffer nor path found',
    );
  }

  async deleteFile(publicId: string): Promise<any> {
    return cloudinary.uploader.destroy(publicId);
  }
}
