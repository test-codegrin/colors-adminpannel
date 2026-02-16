export interface Payment {
  payment_id: number;
  user_id: number;
  name: string;
  email: string;
  stripe_session_id: string;
  amount: number;
  status: "paid" | "pending" | "failed";
  created_at: string;
}

/* Raw API Response */
export type PaymentsApiRawResponse =
  | Payment[]
  | {
      payments?: Payment[];
      data?: Payment[] | { payments?: Payment[] };
    };

export interface PaymentsApiResponse {
  payments: Payment[];
}
