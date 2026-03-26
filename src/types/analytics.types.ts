import type { ContactMessage } from "./contactMessages.types";
import type { Payment } from "./payment.types";
import type { PaginationPayload } from "./pagination.types";
import type { User } from "./user.types";

export type DayRange = 7 | 30 | 90 | 180 | 365;
export type MinutesRange = 15 | 30 | 60 | 180 | 360 | 720 | 1440;

export interface ApiEnvelope<T> {
  success: true;
  data: T;
}

export interface ApiErrorEnvelope {
  success: false;
  message: string;
}

export interface PaginatedItems<T> {
  items: T[];
  pagination: PaginationPayload;
}

export interface UsersGrowthPoint {
  date: string;
  users: number;
}

export interface RevenueGrowthPoint {
  date: string;
  payments: number;
  revenue: number;
}

export interface MessagesGrowthPoint {
  date: string;
  messages: number;
}

export interface TopPage {
  page: string;
  views: number;
}

export interface OverviewUserAnalytics {
  total_users: number;
  new_users_today: number;
  new_users_7d: number;
  active_users: number;
  user_growth_30d: UsersGrowthPoint[];
}

export interface OverviewPaymentAnalytics {
  total_payments: number;
  paid_users: number;
  total_revenue: number;
  revenue_7d: number;
  revenue_30d: number;
  payments_growth: RevenueGrowthPoint[];
}

export interface ContactSupportAnalytics {
  total_messages: number;
  messages_today: number;
  messages_7d: number;
  unread_messages: number;
  unread_messages_supported: boolean;
}

export interface PlatformEndpointUsage {
  endpoint: string;
  requests: number;
  unique_api_requests: number;
}

export interface PlatformUsageStat {
  date: string;
  requests: number;
  unique_api_requests: number;
  errors: number;
}

export interface PlatformSessionStatistics {
  total_sessions: number;
  avg_requests_per_session: number;
}

export interface PlatformUsageAnalytics {
  range_days: number;
  total_requests: number;
  most_used_endpoints: PlatformEndpointUsage[];
  api_usage_stats: PlatformUsageStat[];
  session_statistics: PlatformSessionStatistics;
  unique_api_requests: number;
  tracking_enabled: boolean;
  failure_rate: number;
}

export interface AnalyticsOverview {
  range_days: number;
  user_analytics: OverviewUserAnalytics;
  payment_analytics: OverviewPaymentAnalytics;
  contact_support_analytics: ContactSupportAnalytics;
  platform_usage_analytics: PlatformUsageAnalytics;
}

export interface UsersGrowthResponse {
  range_days: number;
  growth: UsersGrowthPoint[];
}

export interface RevenueGrowthResponse {
  range_days: number;
  growth: RevenueGrowthPoint[];
}

export interface MessagesGrowthResponse {
  range_days: number;
  growth: MessagesGrowthPoint[];
}

export interface PageViewsSummary {
  range_days: number;
  total_page_views: number;
  unique_page_views: number;
  page_views_today: number;
  page_views_7d: number;
  most_viewed_pages: TopPage[];
}

export interface DeviceBreakdownItem {
  device: string;
  users: number;
  logged_in_users: number;
  guest_users: number;
  sessions: number;
  users_share_percent: number;
  percentage?: number;
  sessions_per_user: number;
}

export interface BrowserBreakdownItem {
  browser: string;
  users: number;
  sessions: number;
  users_share_percent: number;
  percentage?: number;
}

export interface OsBreakdownItem {
  os: string;
  users: number;
  sessions: number;
  users_share_percent: number;
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
  range_days: number;
  summary: DeviceAnalyticsSummary;
  devices: DeviceBreakdownItem[];
  browsers: BrowserBreakdownItem[];
  os: OsBreakdownItem[];
}

export interface LiveUsersData {
  live_users?: number;
  window_minutes?: number;
  total_online_users?: number;
  user_ids?: number[];
  active_users_now: number;
  active_sessions: number;
  users_last_5_minutes: number;
  users_last_30_minutes: number;
  logged_in_users_now: number;
  guest_users_now: number;
  logged_in_users_last_30_minutes: number;
  guest_users_last_30_minutes: number;
  logged_in_active_sessions: number;
  guest_active_sessions: number;
  sessions_last_30_minutes: number;
  sessions_per_user_now: number;
  updated_at?: string;
}

export interface FeatureUsageTopEvent {
  event_type: string;
  count: number;
}

export interface FeatureUsageData {
  range_days: number;
  color_saved: number;
  color_deleted: number;
  palette_generated: number;
  palette_saved: number;
  palette_deleted: number;
  palette_exported: number;
  color_copied: number;
  gradient_generated: number;
  gradient_saved: number;
  gradient_deleted: number;
  tailwind_colors_copied: number;
  top_feature_events: FeatureUsageTopEvent[];
}

export interface FeatureUsageItem {
  feature: string;
  usage: number;
}

export interface UserActivityData {
  dau: number;
  wau: number;
  mau: number;
}

export interface SessionsSummary {
  range_days: number;
  avg_session_time_seconds: number;
  avg_session_time: string;
  pages_per_session: number;
  bounce_rate: number;
  total_sessions: number;
}

export interface CountryLocationItem {
  country: string;
  count: number;
}

export interface RegionLocationItem {
  region: string;
  count: number;
}

export interface CityLocationItem {
  city: string;
  count: number;
}

export interface LocationsData {
  range_days: number;
  countries: CountryLocationItem[];
  regions: RegionLocationItem[];
  cities: CityLocationItem[];
}

export interface TrafficSourceSummaryItem {
  source: string;
  count: number;
}

export interface TrafficSourcesData {
  range_days: number;
  sources: Record<string, number>;
  top_sources: TrafficSourceSummaryItem[];
}

export interface PerformanceEndpointItem {
  endpoint: string;
  requests: number;
  unique_api_requests: number;
  avg_response_time_ms: number;
  errors: number;
}

export interface PerformanceData {
  range_minutes: number;
  tracking_enabled: boolean;
  total_requests: number;
  unique_api_requests: number;
  avg_response_time_ms: number;
  error_rate: number;
  requests_per_minute: number;
  top_endpoints: PerformanceEndpointItem[];
}

export interface ActivityFeedItem {
  analytics_event_id: number;
  event_type: string;
  page: string | null;
  endpoint: string | null;
  user_id: number | null;
  session_id: string;
  device: string | null;
  browser: string | null;
  os: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  source: string | null;
  status_code: number | null;
  response_time_ms: number | null;
  duration_seconds: number | null;
  created_at: string;
}

export interface ActivityFeedData {
  limit: number;
  items: ActivityFeedItem[];
}

export interface RecentUser
  extends Omit<
    User,
    "user_id" | "mobile" | "is_paid" | "picture" | "created_at"
  > {
  user_id: number;
  mobile: string;
  is_paid: number | boolean;
  picture: string | null;
  created_at: string;
}

export interface RecentPayment extends Omit<Payment, "receipt_url"> {
  receipt_url: string | null;
}

export interface RecentMessage extends ContactMessage {}
