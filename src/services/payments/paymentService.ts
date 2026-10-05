import type { Payment } from "../domain/types";
import type { ServiceResult } from "../api/types";

export interface PaymentService {
  listForCurrentStudent(): Promise<ServiceResult<Payment[]>>;
  getById(id: string): Promise<ServiceResult<Payment>>;
}

export const paymentService: PaymentService = {
  async listForCurrentStudent() {
    throw new Error("Payment service backend adapter is not configured.");
  },

  async getById(_id) {
    throw new Error("Payment service backend adapter is not configured.");
  },
};
