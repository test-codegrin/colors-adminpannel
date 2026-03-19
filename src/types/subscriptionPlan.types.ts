import type { PaginationPayload } from "./pagination.types";

export interface SubscriptionPlan {
  id: number;
  name: string;
  price: number;
  description: string;
  is_beta: number | boolean;
  is_active: number | boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SubscriptionPlanPayload {
  name: string;
  price: number;
  description: string;
  is_beta: number;
  is_active: number;
}

export interface SubscriptionPlansApiResponse {
  success?: boolean;
  count?: number;
  plans: SubscriptionPlan[];
  total?: number;
  totalPages?: number;
  pagination?: PaginationPayload;
}

export interface SingleSubscriptionPlanApiResponse {
  success?: boolean;
  plan?: SubscriptionPlan;
  data?: SubscriptionPlan;
}

