import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './entities/setting.entity.js';
import { UpdateSettingDto } from './dto/update-setting.dto.js';

export const DEFAULT_TOTAL_AMOUNT = 6000;

@Injectable()
export class SettingService {
  constructor(
    @InjectRepository(Setting)
    private readonly settingRepository: Repository<Setting>,
  ) {}

  /**
   * Retrieves the current system settings.
   * If no setting record exists yet, automatically creates and saves a default record.
   */
  async getSetting(): Promise<Setting> {
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

    return this.settingRepository.save(setting);
  }
}
