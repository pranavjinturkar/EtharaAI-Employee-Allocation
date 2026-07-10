import { z } from "zod"

export const employeeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  department: z.string().min(1, "Department is required"),
  role: z.string().min(1, "Role is required"),
  joining_date: z.string().min(1, "Joining date is required"),
  project_id: z.number().optional().nullable(),
})

export const projectSchema = z.object({
  name: z.string().min(2, "Project name must be at least 2 characters"),
  description: z.string().optional(),
  manager_name: z.string().optional(),
})

export const seatSchema = z.object({
  floor: z.number().min(1).max(5),
  zone: z.string().min(1).max(1).regex(/^[A-J]$/, "Zone must be A-J"),
  bay: z.string().min(1, "Bay is required"),
  seat_number: z.string().min(1, "Seat number is required"),
  status: z.enum(["AVAILABLE", "RESERVED", "MAINTENANCE"]),
})

export const allocateSchema = z.object({
  employee_id: z.number().min(1, "Please select an employee"),
  seat_id: z.number().optional(),
})

export type EmployeeFormData = z.infer<typeof employeeSchema>
export type ProjectFormData = z.infer<typeof projectSchema>
export type SeatFormData = z.infer<typeof seatSchema>
export type AllocateFormData = z.infer<typeof allocateSchema>
