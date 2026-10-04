/*
 * SUCCESS MESSAGES
 */
export const LOGGED_OUT = 'logged out successfully';
export const LOGGED_IN = 'You have logged in successfully.';
export const LOGIN_SUCCESS = 'Admin login successful';
export const USER_CREATED_SUCCESS = 'User created successfully';
export const USER_UPDATED_SUCCESS = 'User updated successfully';
export const USERS_FETCHED_SUCCESS = 'Users fetched successfully';
export const USER_FETCHED_SUCCESS = 'User fetched successfully';
export const PASSWORD_SET_SUCCESS = 'Password set successfully and logged in';
export const USER_LOGIN_SUCCESS = 'User login successful';
export const EMAIL_CHECKED_SUCCESS = 'Email status checked successfully';
export const SUCCESS = 'Operation completed successfully';
export const OPERATION_SUCCESS = 'Operation completed successfully';
export const SETTING_FETCHED_SUCCESS = 'Setting fetched successfully';
export const SETTING_UPDATED_SUCCESS = 'Setting updated successfully';

/*
 * AUTHENTICATION & AUTHORIZATION ERROR MESSAGES
 */
export const INVALID_CREDENTIALS = 'Invalid credentials';
export const UNAUTHORIZED = 'Unauthorized access';
export const TOKEN_EXPIRED = 'Token has expired';
export const FORBIDDEN = 'You do not have permission to access this resource';
export const PASSWORD_NOT_SET =
  'Password has not been set yet. Please set your password first.';
export const PASSWORD_ALREADY_SET =
  'Password is already set for this account. Please log in.';

/*
 * USER MESSAGES
 */
export const USER_NOT_FOUND = (identifier?: string) =>
  identifier ? `User '${identifier}' not found` : 'User not found';
export const USER_ALREADY_EXISTS = (identifier?: string) =>
  identifier
    ? `User with email '${identifier}' already exists`
    : 'User already exists';
export const USER_MOBILE_ALREADY_EXISTS = (mobile?: string) =>
  mobile
    ? `User with mobile '${mobile}' already exists`
    : 'User with this mobile number already exists';
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

/*
 * EXPENSE MESSAGES
 */
export const EXPENSE_CREATED_SUCCESS = 'Expense request created successfully';
export const EXPENSE_UPDATED_SUCCESS = 'Expense updated successfully';
export const EXPENSE_FETCHED_SUCCESS = 'Expense fetched successfully';
export const EXPENSES_FETCHED_SUCCESS = 'Expenses fetched successfully';
export const EXPENSE_DELETED_SUCCESS = 'Expense deleted successfully';
export const EXPENSE_APPROVED_SUCCESS = 'Expense request approved successfully';
export const EXPENSE_REJECTED_SUCCESS = 'Expense request rejected successfully';
export const EXPENSE_PAYMENT_CREATED_SUCCESS =
  'Payment request submitted successfully';
export const EXPENSE_NOT_FOUND = 'Expense not found';
export const EXPENSE_PAYMENT_NOT_FOUND = 'Payment request not found';
export const EXPENSE_USER_NOT_ALLOWED_TO_EDIT =
  'Users are not allowed to edit expense requests. Only Admin can update or edit.';
export const EXPENSE_ALREADY_COMPLETED =
  'This expense is already fully paid and completed';
export const EXPENSE_AMOUNT_EXCEEDS_REMAINING = (
  remaining: number,
  payAmount?: number,
) =>
  payAmount !== undefined
    ? `Payment amount (${payAmount}) exceeds remaining balance. Only ${remaining} is remaining (only ${remaining} baki he)`
    : `Payment amount cannot exceed remaining balance. Only ${remaining} is remaining (only ${remaining} baki he)`;
export const EXPENSE_PAY_GREATER_THAN_TOTAL =
  'Pay amount cannot be greater than total amount';
export const EXPENSE_PREVIOUS_PAYMENT_PENDING =
  'A payment request is already pending admin approval. Please wait for admin approval before creating another request.';
export const EXPENSE_INITIAL_REQUEST_PENDING =
  'The initial expense request is still pending admin approval. Please wait for admin approval before submitting subsequent payments.';
export const EXPENSE_TOTAL_LIST_FETCHED_SUCCESS =
  'User total amounts fetched successfully';
