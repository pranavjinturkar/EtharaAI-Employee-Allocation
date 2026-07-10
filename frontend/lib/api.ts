import axios, { AxiosError } from "axios";

const DEFAULT_API_URL = "http://localhost:8000";

function normalizeApiUrl(value: string | undefined) {
  const trimmed = (value || DEFAULT_API_URL).trim().replace(/\/+$/, "");
  const isLocalUrl = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/i.test(trimmed);

  if (/^http:\/\//i.test(trimmed) && !isLocalUrl) {
    return trimmed.replace(/^http:\/\//i, "https://");
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/i.test(trimmed)) {
    return `http://${trimmed}`;
  }

  return `https://${trimmed}`;
}

const apiClient = axios.create({
  baseURL: normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL),
  headers: {
    "Content-Type": "application/json",
  },
});

export interface SeatInfo {
  floor: number;
  zone: string;
  bay: string;
  seat_number: string;
}

export interface Employee {
  id: number;
  employee_code: string;
  name: string;
  email: string;
  department: string;
  role: string;
  joining_date: string;
  project_id?: number;
  status: string;
  created_at: string;
  project_name?: string;
  seat_info?: SeatInfo;
}

export interface EmployeeCreate {
  employee_code: string;
  name: string;
  email: string;
  department: string;
  role: string;
  joining_date: string;
  project_id?: number;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  manager_name?: string;
  status: string;
  created_at: string;
}

export interface Seat {
  id: number;
  floor: number;
  zone: string;
  bay: string;
  seat_number: string;
  status: string;
  created_at: string;
  allocated_employee_name?: string;
  allocated_employee_code?: string;
  allocated_employee_id?: number;
  allocated_project_name?: string;
  allocation_date?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface DashboardSummary {
  total_employees: number;
  total_seats: number;
  occupied_seats: number;
  available_seats: number;
  reserved_seats: number;
  maintenance_seats: number;
  pending_allocation_count: number;
}

export interface ProjectUtilization {
  project_name: string;
  allocated_seats: number;
  total_employees: number;
}

export interface FloorUtilization {
  floor: number;
  total_seats: number;
  occupied_seats: number;
  available_seats: number;
}

async function apiRequest<T>(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", path: string, data?: unknown) {
  const response = await apiClient.request<T>({
    method,
    url: path,
    data,
  });
  return response.data;
}

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const axiosError = err as AxiosError<{ detail?: string } | string>;
    const detail = axiosError.response?.data;

    if (typeof detail === "object" && detail?.detail) {
      return detail.detail;
    }

    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }

    if (axiosError.code === "ERR_NETWORK") {
      return "Unable to reach the server. Please try again shortly.";
    }

    return axiosError.message || "Something went wrong.";
  }

  if (!(err instanceof Error)) {
    return "Something went wrong.";
  }

  if (err.message.includes("ECONNREFUSED") || err.message.includes("fetch failed") || err.message.includes("Failed to fetch")) {
    return "Unable to reach the server. Please try again shortly.";
  }

  try {
    const parsed = JSON.parse(err.message);
    return parsed.detail || "Something went wrong.";
  } catch {
    return err.message || "Something went wrong.";
  }
}

export async function getEmployees(params?: { search?: string, project_id?: number, status?: string, page?: number, limit?: number }) {
  const q = new URLSearchParams();
  if (params?.search) q.append("search", params.search);
  if (params?.project_id) q.append("project_id", params.project_id.toString());
  if (params?.status) q.append("status", params.status);
  if (params?.page) q.append("page", params.page.toString());
  if (params?.limit) q.append("limit", params.limit.toString());
  const qs = q.toString();
  return apiRequest<PaginatedResponse<Employee>>("GET", `/employees/${qs ? `?${qs}` : ''}`);
}

export async function getEmployee(id: number) {
  return apiRequest<Employee>("GET", `/employees/${id}`);
}

export async function createEmployee(data: EmployeeCreate) {
  return apiRequest<Employee>("POST", `/employees/`, data);
}

export async function updateEmployee(id: number, data: Partial<EmployeeCreate>) {
  return apiRequest<Employee>("PUT", `/employees/${id}`, data);
}

export async function deleteEmployee(id: number) {
  return apiRequest<unknown>("DELETE", `/employees/${id}`);
}

export async function getProjects() {
  return apiRequest<Project[]>("GET", `/projects/`);
}

export async function createProject(data: { name: string, description?: string, manager_name?: string }) {
  return apiRequest<Project>("POST", `/projects/`, data);
}

export async function getProjectEmployees(id: number) {
  return apiRequest<Employee[]>("GET", `/projects/${id}/employees`);
}

export async function getSeats(params?: { floor?: number, zone?: string, status?: string, page?: number, limit?: number }) {
  const q = new URLSearchParams();
  if (params?.floor) q.append("floor", params.floor.toString());
  if (params?.zone) q.append("zone", params.zone);
  if (params?.status) q.append("status", params.status);
  if (params?.page) q.append("page", params.page.toString());
  if (params?.limit) q.append("limit", params.limit.toString());
  const qs = q.toString();
  return apiRequest<PaginatedResponse<Seat>>("GET", `/seats/${qs ? `?${qs}` : ''}`);
}

export async function getAvailableSeats(params?: { floor?: number, zone?: string, project_id?: number }) {
  const q = new URLSearchParams();
  if (params?.floor) q.append("floor", params.floor.toString());
  if (params?.zone) q.append("zone", params.zone);
  if (params?.project_id) q.append("project_id", params.project_id.toString());
  const qs = q.toString();
  return apiRequest<Seat[]>("GET", `/seats/available${qs ? `?${qs}` : ''}`);
}

export async function createSeat(data: { floor: number, zone: string, bay: string, seat_number: string, status?: string }) {
  return apiRequest<Seat>("POST", `/seats/`, data);
}

export async function allocateSeat(data: { employee_id: number, seat_id?: number }) {
  return apiRequest<unknown>("POST", `/seats/allocate/`, data);
}

export async function releaseSeat(data: { employee_id: number }) {
  return apiRequest<unknown>("POST", `/seats/release/`, data);
}

export async function updateSeatStatus(seatId: number, status: string) {
  return apiRequest("PATCH", `/seats/${seatId}/status/`, { status });
}

export async function getDashboardSummary() {
  return apiRequest<DashboardSummary>("GET", `/dashboard/summary`);
}

export async function getProjectUtilization() {
  return apiRequest<ProjectUtilization[]>("GET", `/dashboard/project-utilization`);
}

export async function getFloorUtilization() {
  return apiRequest<FloorUtilization[]>("GET", `/dashboard/floor-utilization`);
}

export async function queryAssistant(data: { query: string, email?: string }) {
  return apiRequest<{ answer: string }>("POST", `/ai/query/`, data);
}
