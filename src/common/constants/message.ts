/*
 * SUCCESS MESSAGES
 */
export const LOGGED_OUT = 'logged out successfully';
export const LOGGED_IN = 'You have logged in successfully.';
export const LOGIN_SUCCESS = 'Admin login successful';
export const USER_CREATED_SUCCESS = 'User created successfully';
export const SUCCESS = 'Operation completed successfully';
export const OPERATION_SUCCESS = 'Operation completed successfully';

/*
 * AUTHENTICATION & AUTHORIZATION ERROR MESSAGES
 */
export const INVALID_CREDENTIALS = 'Invalid credentials';
export const UNAUTHORIZED = 'Unauthorized access';
export const TOKEN_EXPIRED = 'Token has expired';
export const FORBIDDEN = 'You do not have permission to access this resource';

/*
 * USER MESSAGES
 */
export const USER_NOT_FOUND = (identifier?: string) =>
  identifier ? `User '${identifier}' not found` : 'User not found';
export const USER_ALREADY_EXISTS = (identifier?: string) =>
  identifier ? `User with email '${identifier}' already exists` : 'User already exists';
export const USER_INACTIVE = 'User account is inactive';

/*
 * VALIDATION MESSAGES
 */
export const EMAIL_INVALID = 'email must be an email';
export const EMAIL_REQUIRED = 'email should not be empty';
export const PASSWORD_STRING = 'password must be a string';
export const PASSWORD_REQUIRED = 'password should not be empty';
export const FIELD_REQUIRED = (field: string) => `${field} is required`;
export const FIELD_INVALID = (field: string) => `Invalid ${field}`;

/*
 * SEED MESSAGES
 */
export const SEED_MISSING_ENV =
  'Missing required admin seed environment variables: ADMIN_NAME, ADMIN_EMAIL, or ADMIN_PASSWORD';
export const SEED_ADMIN_ALREADY_EXISTS = (email: string) =>
  `Admin user with email ${email} already exists. Skipping insert.`;
export const SEED_ADMIN_CREATED = (email: string) =>
  `Admin user with email ${email} created successfully.`;
export const SEED_COMPLETED = 'Seeding completed successfully.';
export const SEED_FAILED = 'Seeding failed:';

/*
 * GENERAL MESSAGES
 */
export const INTERNAL_SERVER_ERROR = 'Internal server error occurred';
