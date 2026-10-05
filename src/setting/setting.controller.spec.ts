import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SettingController } from './setting.controller.js';
import {
  SETTING_FETCHED_SUCCESS,
  SETTING_UPDATED_SUCCESS,
} from '../common/message.js';

describe('SettingController', () => {
  let controller: SettingController;
  let mockSettingService: any;

  beforeEach(() => {
    mockSettingService = {
      getSetting: vi.fn().mockResolvedValue({
        id: 'set-123',
        total_amount: 6000,
      }),
      update: vi.fn().mockResolvedValue({
        id: 'set-123',
        total_amount: 7000,
      }),
    };

    controller = new SettingController(mockSettingService);
  });

  it('should fetch settings successfully', async () => {
    const result = await controller.getSetting();
    expect(result.message).toBe(SETTING_FETCHED_SUCCESS);
    expect(result.data.total_amount).toBe(6000);
    expect(mockSettingService.getSetting).toHaveBeenCalled();
  });

  it('should update settings via PATCH successfully', async () => {
    const result = await controller.update({ total_amount: 7000 });
    expect(result.message).toBe(SETTING_UPDATED_SUCCESS);
    expect(result.data.total_amount).toBe(7000);
    expect(mockSettingService.update).toHaveBeenCalledWith({
      total_amount: 7000,
    });
  });

  it('should update settings via PUT successfully', async () => {
    const result = await controller.updatePut({ total_amount: 7000 });
    expect(result.message).toBe(SETTING_UPDATED_SUCCESS);
    expect(result.data.total_amount).toBe(7000);
    expect(mockSettingService.update).toHaveBeenCalledWith({
      total_amount: 7000,
    });
  });
});
