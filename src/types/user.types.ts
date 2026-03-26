import type { PaginationPayload } from "./pagination.types";

export type UserPaymentStatusFilter = "all" | "paid" | "unpaid";
export type UserStatusFilter = "all" | "online" | "offline";

export interface User {
  user_id?: number | string;
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  mobile?: string;
  is_paid?: boolean | number | string;
  picture?: string;
  google_id?: string | null;
  created_at?: string;
  [key: string]: unknown;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  mobile?: string;
  picture?: string;
  is_paid?: boolean;
  password?: string;
}

export interface GetUsersParams {
  page: number;
  limit: number;
  search?: string;
  is_paid?: 0 | 1;
  status?: Exclude<UserStatusFilter, "all">;
  start_date?: string;
  end_date?: string;
  signal?: AbortSignal;
}

export interface UsersFiltersFormValues {
  search: string;
  paymentStatus: UserPaymentStatusFilter;
  status: UserStatusFilter;
  startDate: string;
  endDate: string;
}

export interface UsersApiResponse {
  users: User[];
  total: number;
  currentPage: number;
  totalPages: number;
  pagination: PaginationPayload;
}

export interface UsersApiRawPagination {
  total?: number | string;
  page?: number | string;
  limit?: number | string;
  total_pages?: number | string;
  totalPages?: number | string;
}

export interface UsersApiRawResponse {
  success?: boolean;
  users?: User[];
  data?:
    | User[]
    | {
        users?: User[];
        total?: number | string;
        totalUsers?: number | string;
        totalPages?: number | string;
        total_pages?: number | string;
        page?: number | string;
        currentPage?: number | string;
        current_page?: number | string;
        pagination?: UsersApiRawPagination;
      };
  total?: number | string;
  totalUsers?: number | string;
  totalPages?: number | string;
  total_pages?: number | string;
  page?: number | string;
  currentPage?: number | string;
  current_page?: number | string;
  pagination?: UsersApiRawPagination;
  message?: string;
}
