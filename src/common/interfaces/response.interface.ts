export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
  total?: number;
  page?: number;
  take?: number;
  activeItems?: number;
}
