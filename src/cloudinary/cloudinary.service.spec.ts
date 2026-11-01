import { describe, it, expect, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service.js';
import { v2 as cloudinary } from 'cloudinary';

vi.mock('cloudinary', () => ({
  v2: {
    uploader: {
      upload_stream: vi.fn(),
      upload: vi.fn(),
      destroy: vi.fn(),
    },
  },
}));

describe('CloudinaryService', () => {
  let service: CloudinaryService;

  beforeEach(() => {
    service = new CloudinaryService();
    vi.clearAllMocks();
  });

  it('should throw BadRequestException if no file is provided', async () => {
    await expect(service.uploadFile(undefined as any)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should upload via stream when buffer is present', async () => {
    const mockFile = {
      buffer: Buffer.from('test-image-content'),
      originalname: 'test.png',
      mimetype: 'image/png',
    } as Express.Multer.File;

    const mockResult = {
      secure_url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      public_id: 'sample_id',
    };

    (cloudinary.uploader.upload_stream as any).mockImplementation(
      (_options: any, callback: any) => {
        const stream = new (require('stream').Writable)({
          write(_chunk: any, _encoding: any, next: any) {
            next();
          },
        });
        stream.on('finish', () => callback(null, mockResult));
        return stream;
      },
    );

    const result = await service.uploadFile(mockFile, 'test-folder');
    expect(result.secure_url).toBe(mockResult.secure_url);
  });

  it('should upload from path when file.path is present without buffer', async () => {
    const mockFile = {
      path: '/tmp/test.png',
      originalname: 'test.png',
    } as Express.Multer.File;

    const mockResult = {
      secure_url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    };

    (cloudinary.uploader.upload as any).mockResolvedValue(mockResult);

    const result = await service.uploadFile(mockFile, 'test-folder');
    expect(cloudinary.uploader.upload).toHaveBeenCalledWith('/tmp/test.png', {
      folder: 'test-folder',
      resource_type: 'auto',
    });
    expect(result.secure_url).toBe(mockResult.secure_url);
  });

  it('should call cloudinary.uploader.destroy when deleteFile is invoked', async () => {
    (cloudinary.uploader.destroy as any).mockResolvedValue({ result: 'ok' });

    const result = await service.deleteFile('sample_id');
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('sample_id');
    expect(result).toEqual({ result: 'ok' });
  });
});
