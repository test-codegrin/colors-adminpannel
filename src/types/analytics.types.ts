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

export interface PageViewsPoint {
  date: string;
  views: number;
  unique_visitors?: number;
}

export interface TopPage {
  page: string;
  views: number;
  unique_visitors?: number;
}

export interface DeviceBreakdownItem {
  device: string;
  users: number;
  percentage?: number;
  logged_in_users?: number;
  guest_users?: number;
  sessions?: number;
  sessions_per_user?: number;
}

export interface BrowserBreakdownItem {
  browser: string;
  users: number;
  sessions?: number;
  percentage?: number;
}

export interface OsBreakdownItem {
  os: string;
  users: number;
  sessions?: number;
  percentage?: number;
}

export interface DeviceAnalyticsSummary {
  total_users: number;
  logged_in_users: number;
  guest_users: number;
  total_sessions: number;
  avg_sessions_per_user: number;
}

export interface DeviceAnalyticsPayload {
  range_days?: number;
  summary: DeviceAnalyticsSummary;
  devices: DeviceBreakdownItem[];
  browsers: BrowserBreakdownItem[];
  os: OsBreakdownItem[];
}

export interface LiveUsersData {
  live_users: number;
  active_users_now?: number;
  active_sessions?: number;
  users_last_5_minutes?: number;
  users_last_30_minutes?: number;
  logged_in_users_now?: number;
  guest_users_now?: number;
  logged_in_users_last_30_minutes?: number;
  guest_users_last_30_minutes?: number;
  logged_in_active_sessions?: number;
  guest_active_sessions?: number;
  sessions_last_30_minutes?: number;
  sessions_per_user_now?: number;
  updated_at?: string;
}

export interface FeatureUsageItem {
  feature: string;
  usage: number;
  percentage?: number;
}

export interface UserActivityItem {
  id?: number | string;
  user_id?: number | string;
  name?: string;
  action?: string | number;
  activity?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface SessionsPoint {
  date: string;
  sessions: number;
  avg_duration?: number;
}

export interface LocationBreakdownItem {
  location: string;
  users: number;
  percentage?: number;
}

export interface TrafficSourceItem {
  source: string;
  users: number;
  visits?: number;
  percentage?: number;
}

export interface PerformanceData {
  avg_response_time?: number;
  uptime?: number;
  bounce_rate?: number;
  conversion_rate?: number;
  avg_response_time_ms?: number;
  error_rate?: number;
  requests_per_minute?: number;
  total_requests?: number;
  [key: string]: unknown;
}

export interface ActivityFeedItem {
  id?: number | string;
  type?: string;
  title?: string;
  message?: string;
  created_at?: string;
  [key: string]: unknown;
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
