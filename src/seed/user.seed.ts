import 'dotenv/config';
import { UserRole } from '../common/enums/role.enum.js';
import { Device_Type } from '../helper/constant.js';

export interface IUserSeed {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  device_type?: Device_Type;
  is_active?: boolean;
}

export const UserSeed: IUserSeed = {
  name: process.env.ADMIN_NAME || 'Super Admin',
  email: process.env.ADMIN_EMAIL || 'admin@khatabook.com',
  password: process.env.ADMIN_PASSWORD || 'Admin@123',
  role: UserRole.ADMIN,
  device_type: Device_Type.WEB,
  is_active: true,
};