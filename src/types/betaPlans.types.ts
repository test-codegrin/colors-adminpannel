export interface BetaPlan {
  beta_claim_id: number;
  user_id: number;
  name: string;
  email: string;
}

export interface BetaPlansApiResponse {
  success: boolean;
  count: number;
  data: BetaPlan[];
}
