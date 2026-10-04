import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SettingService, DEFAULT_TOTAL_AMOUNT } from './setting.service.js';

describe('SettingService', () => {
  let service: SettingService;
  let mockSettingRepo: any;

  beforeEach(() => {
    mockSettingRepo = {
      findOne: vi.fn(),
      create: vi.fn((data) => ({ id: 'set-123', ...data })),
      save: vi.fn((data) => Promise.resolve({ id: 'set-123', ...data })),
    };

    service = new SettingService(mockSettingRepo);
  });

  it('should return existing setting if found', async () => {
    mockSettingRepo.findOne.mockResolvedValue({
      id: 'existing-id',
      total_amount: 8000,
    });

    const result = await service.getSetting();
    expect(result.total_amount).toBe(8000);
    expect(mockSettingRepo.create).not.toHaveBeenCalled();
  });

  it('should automatically initialize default setting if none exists', async () => {
    mockSettingRepo.findOne.mockResolvedValue(null);

    const result = await service.getSetting();
    expect(mockSettingRepo.create).toHaveBeenCalledWith({
      total_amount: DEFAULT_TOTAL_AMOUNT,
    });
    expect(mockSettingRepo.save).toHaveBeenCalled();
    expect(result.total_amount).toBe(DEFAULT_TOTAL_AMOUNT);
  });

  it('should return default total_amount number', async () => {
    mockSettingRepo.findOne.mockResolvedValue({
      id: 'existing-id',
      total_amount: 7500,
    });

    const total = await service.getDefaultTotalAmount();
    expect(total).toBe(7500);
  });

  it('should update total_amount when admin updates settings', async () => {
    mockSettingRepo.findOne.mockResolvedValue({
      id: 'existing-id',
      total_amount: 6000,
    });

    const updated = await service.update({ total_amount: 9000 });
    expect(mockSettingRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'existing-id',
        total_amount: 9000,
      }),
    );
    expect(updated.total_amount).toBe(9000);
  });
});
