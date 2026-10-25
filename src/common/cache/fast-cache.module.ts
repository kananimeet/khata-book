import { Module, Global } from '@nestjs/common';
import { FastCacheService } from './fast-cache.service.js';

@Global()
@Module({
  providers: [FastCacheService],
  exports: [FastCacheService],
})
export class FastCacheModule {}
