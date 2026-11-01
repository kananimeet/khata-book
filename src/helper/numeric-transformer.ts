import { ValueTransformer } from 'typeorm';

export class ColumnNumericTransformer implements ValueTransformer {
  to(data?: number | null): number | null {
    if (data === undefined || data === null) return null;
    return Number(data);
  }

  from(data?: string | number | null): number {
    if (data === undefined || data === null) return 0;
    const parsed = typeof data === 'number' ? data : parseFloat(data);
    return isNaN(parsed) ? 0 : parsed;
  }
}
