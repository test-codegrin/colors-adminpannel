import type { PaginationPayload } from "@/types/pagination.types";

export interface BetaPlan {
  beta_claim_id: number;
  user_id: number;
  name: string;
  email: string;
  search:string;
}

export interface BetaPlansApiResponse {
  success: boolean;
  count: number;
  total: number;
  data: BetaPlan[];
  pagination: PaginationPayload;
}
