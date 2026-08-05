import apiClient from './axios';

export type SubscriptionPlan = 'FREE' | 'PRO' | 'BUSINESS';
export type BillingCycle = 'MONTHLY' | 'YEARLY';
export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PENDING';

export interface Subscription {
  plan: SubscriptionPlan;
  billing?: BillingCycle;
  status: SubscriptionStatus;
  startedAt?: string;
  expiresAt?: string;
}

export interface InitiateSubscriptionResponse {
  paymentUrl: string;
  reference?: string;
}

// Get current subscription
export const getMySubscription = () =>
  apiClient.get<Subscription>('/subscriptions/me');

// Initiate payment
export const initiateSubscription = (plan: SubscriptionPlan, billing: BillingCycle) =>
  apiClient.post<InitiateSubscriptionResponse>('/subscriptions/initiate', { plan, billing });

// Verify payment after redirect
export const verifySubscription = (reference: string) =>
  apiClient.post<Subscription>('/subscriptions/verify', { reference });

// Cancel subscription
export const cancelSubscription = () =>
  apiClient.delete<Subscription>('/subscriptions/me');
