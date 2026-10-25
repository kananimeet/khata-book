import { Module, Global } from '@nestjs/common';
import { CloudinaryProvider } from './cloudinary.provider.js';
import { CloudinaryService } from './cloudinary.service.js';

@Global()
@Module({
  providers: [CloudinaryProvider, CloudinaryService],
  exports: [CloudinaryProvider, CloudinaryService],
})
export class CloudinaryModule {}
