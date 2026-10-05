export type ApiErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "NETWORK_ERROR"
  | "SERVER_ERROR"
  | "UNKNOWN";

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  field?: string;
  requestId?: string;
}

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

export interface Pagination {
  page: number;
  pageSize: number;
  total?: number;
}

export interface Paginated<T> {
  items: T[];
  pagination: Pagination;
}
