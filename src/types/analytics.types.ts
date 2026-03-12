import type { ContactMessage } from "./contactMessages.types";
import type { Payment } from "./payment.types";
import type { PaginationPayload } from "./pagination.types";
import type { User } from "./user.types";

export type DayRange = 7 | 30 | 90;

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ContactSupportAnalytics {
  unread_messages_supported?: boolean;
  unread_messages?: number;
  unread_messages_count?: number;
}

export interface AnalyticsOverview {
  total_users?: number;
  new_users_today?: number;
  new_users_7d?: number;
  active_users?: number;
  total_payments?: number;
  paid_users?: number;
  total_revenue?: number;
  revenue_7d?: number;
  revenue_30d?: number;
  total_messages?: number;
  messages_today?: number;
  messages_7d?: number;
  contact_support_analytics?: ContactSupportAnalytics;
  [key: string]: unknown;
}

export interface UsersGrowthPoint {
  date: string;
  users: number;
}

export interface RevenueGrowthPoint {
  date: string;
  revenue: number;
  payments?: number;
}

export interface MessagesGrowthPoint {
  date: string;
  messages: number;
}

export interface RecentUser extends User {
  user_id?: number;
}

export interface RecentPayment extends Payment {}

export interface RecentMessage extends ContactMessage {}

export interface PaginatedItems<T> {
  items: T[];
  pagination: PaginationPayload;
}
