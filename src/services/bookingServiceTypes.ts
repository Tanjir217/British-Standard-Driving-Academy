export interface BookingRequest {
  name: string;
  phone: string;
  email?: string;
  date?: string;
  serviceId?: string;
  slot?: {
    serviceId: string;
    scheduleId: string;
    startDate: string;
    endDate: string;
    localStartDate: string;
    localEndDate: string;
    timeZone: string;
    location: unknown;
    resource?: unknown;
    bookable: boolean;
  };
  packageId?: string;
  additionalService?: string;
  notes?: string;
  paymentMethod?: string;
}

export interface BookingResult {
  ok: boolean;
  reference: string;
  message?: string;
}
