import apiClient from './axios';
import {
  AuthResponse,
  RegisterPayload,
  LoginPayload,
  VerifyOtpPayload,
  ForgotPasswordPayload,
  VerifyResetOtpPayload,
  ResetPasswordPayload,
  User,
} from '../types';
import { USE_MOCK_DATA } from '../config';
import { MOCK_USERS } from '../mock/mockData';
import { mockDelay, generateMockId } from '../mock/mockHelpers';

// Registrations awaiting OTP verification, keyed by email (mock mode only).
const pendingRegistrations = new Map<string, RegisterPayload>();

function inferRoleFromEmail(email: string): User['role'] {
  const lower = email.toLowerCase();
  if (lower.includes('owner')) return 'EQUIPMENT_OWNER';
  if (lower.includes('buyer')) return 'BUYER';
  if (lower.includes('general')) return 'GENERAL';
  return 'FARMER';
}

function findUserByEmail(email: string): User | undefined {
  return MOCK_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export async function register(payload: RegisterPayload): Promise<void> {
  if (USE_MOCK_DATA) {
    pendingRegistrations.set(payload.email.toLowerCase(), payload);
    await mockDelay(undefined);
    return;
  }
  await apiClient.post('/auth/register', payload);
}

export async function verifyOtp(payload: VerifyOtpPayload): Promise<AuthResponse> {
  if (USE_MOCK_DATA) {
    const pending = pendingRegistrations.get(payload.email.toLowerCase());
    const existing = findUserByEmail(payload.email);

    const user: User = existing ?? {
      id: generateMockId('u'),
      fullName: pending?.fullName ?? payload.email.split('@')[0],
      email: payload.email,
      phoneNumber: pending?.phoneNumber ?? '0240000000',
      role: pending?.role ?? inferRoleFromEmail(payload.email),
      region: pending?.region,
      district: pending?.district,
      isVerified: true,
      createdAt: new Date().toISOString(),
    };

    if (!existing) {
      MOCK_USERS.push(user);
    }
    pendingRegistrations.delete(payload.email.toLowerCase());

    return mockDelay({ token: generateMockId('token'), user });
  }
  const { data } = await apiClient.post<AuthResponse>('/auth/verify-otp', payload);
  return data;
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  if (USE_MOCK_DATA) {
    // No backend yet: accept any password and log in as any email. If the
    // email matches a known mock account use it, otherwise infer the role
    // from the email text ('owner'/'buyer'/'general', else farmer) and fall
    // back to that role's demo account.
    const existing = findUserByEmail(payload.email);
    const role = existing?.role ?? inferRoleFromEmail(payload.email);
    const user =
      existing ??
      MOCK_USERS.find((u) => u.role === role) ??
      MOCK_USERS[0];
    return mockDelay({ token: generateMockId('token'), user });
  }
  const { data } = await apiClient.post<AuthResponse>('/auth/login', payload);
  return data;
}

export async function loginAsRole(role: User['role']): Promise<AuthResponse> {
  if (USE_MOCK_DATA) {
    const user = MOCK_USERS.find((u) => u.role === role) ?? MOCK_USERS[0];
    return mockDelay({ token: generateMockId('token'), user });
  }
  const demoEmail =
    role === 'EQUIPMENT_OWNER'
      ? 'owner@agrochain.com'
      : role === 'BUYER'
      ? 'buyer@agrochain.com'
      : role === 'GENERAL'
      ? 'general@agrochain.com'
      : 'farmer@agrochain.com';
  const { data } = await apiClient.post<AuthResponse>('/auth/login', { email: demoEmail, password: 'demo1234' });
  return data;
}

export async function forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
  if (USE_MOCK_DATA) {
    await mockDelay(undefined);
    return;
  }
  await apiClient.post('/auth/forgot-password', payload);
}

export async function verifyResetOtp(payload: VerifyResetOtpPayload): Promise<void> {
  if (USE_MOCK_DATA) {
    await mockDelay(undefined);
    return;
  }
  await apiClient.post('/auth/verify-reset-otp', payload);
}

export async function resetPassword(payload: ResetPasswordPayload): Promise<void> {
  if (USE_MOCK_DATA) {
    await mockDelay(undefined);
    return;
  }
  await apiClient.post('/auth/reset-password', payload);
}

export async function forgotPasswordSms(payload: { phone: string }): Promise<void> {
  if (USE_MOCK_DATA) {
    await mockDelay(undefined);
    return;
  }
  await apiClient.post('/auth/forgot-password-sms', payload);
}

export async function verifyResetOtpSms(payload: { phone: string; otp: string }): Promise<void> {
  if (USE_MOCK_DATA) {
    await mockDelay(undefined);
    return;
  }
  await apiClient.post('/auth/verify-reset-otp-sms', payload);
}

export async function resetPasswordBySms(payload: { phone: string; otp: string; newPassword: string }): Promise<void> {
  if (USE_MOCK_DATA) {
    await mockDelay(undefined);
    return;
  }
  await apiClient.post('/auth/reset-password-sms', payload);
}
