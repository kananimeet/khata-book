import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './entities/setting.entity.js';
import { UpdateSettingDto } from './dto/update-setting.dto.js';

export const DEFAULT_TOTAL_AMOUNT = 6000;

@Injectable()
export class SettingService {
  private cachedSetting: Setting | null = null;
  private cacheExpiresAt = 0;
  private readonly CACHE_TTL_MS = 60 * 1000; // 60 seconds

  constructor(
    @InjectRepository(Setting)
    private readonly settingRepository: Repository<Setting>,
  ) {}

  /**
   * Retrieves the current system settings.
   * Uses an in-memory cache with 60s TTL for sub-millisecond responses.
   * If no setting record exists yet, automatically creates and saves a default record.
   */
  async getSetting(): Promise<Setting> {
    const now = Date.now();
    if (this.cachedSetting && now < this.cacheExpiresAt) {
      return this.cachedSetting;
    }

    let setting = await this.settingRepository.findOne({
      where: {},
      order: { created_at: 'ASC' },
    });

    if (!setting) {
      setting = this.settingRepository.create({
        total_amount: DEFAULT_TOTAL_AMOUNT,
      });
      setting = await this.settingRepository.save(setting);
    }

    this.cachedSetting = setting;
    this.cacheExpiresAt = now + this.CACHE_TTL_MS;
    return setting;
  }

  /**
   * Retrieves the current default total_amount configured in settings.
   */
  async getDefaultTotalAmount(): Promise<number> {
    const setting = await this.getSetting();
    return Number(setting.total_amount);
  }

  /**
   * Admin updates the system settings (e.g. default room rate total_amount).
   * Immediately invalidates and updates the in-memory cache.
   */
  async update(updateDto: UpdateSettingDto): Promise<Setting> {
    let setting = await this.settingRepository.findOne({
      where: {},
      order: { created_at: 'ASC' },
    });

    const newTotal = Number(updateDto.total_amount ?? updateDto.total);

    if (!setting) {
      setting = this.settingRepository.create({
        total_amount: newTotal,
      });
    } else {
      setting.total_amount = newTotal;
    }

    const saved = await this.settingRepository.save(setting);
    this.cachedSetting = saved;
    this.cacheExpiresAt = Date.now() + this.CACHE_TTL_MS;
    return saved;
  }

  /**
   * Clears the in-memory cache manually (e.g., in unit tests).
   */
  clearCache(): void {
    this.cachedSetting = null;
    this.cacheExpiresAt = 0;
  }
}
