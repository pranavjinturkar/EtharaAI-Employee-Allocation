"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { employeeSchema, EmployeeFormData } from "@/lib/validations";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Project } from "@/lib/api";
import { Loader2 } from "lucide-react";

interface EmployeeFormProps {
  defaultValues?: Partial<EmployeeFormData> & { employee_code?: string };
  onSubmit: (data: EmployeeFormData) => Promise<void>;
  projects: Project[];
  isLoading: boolean;
}

export function EmployeeForm({ defaultValues, onSubmit, projects, isLoading }: EmployeeFormProps) {
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      email: defaultValues?.email || "",
      department: defaultValues?.department || "",
      role: defaultValues?.role || "",
      joining_date: defaultValues?.joining_date || new Date().toISOString().split('T')[0],
      project_id: defaultValues?.project_id || null,
    }
  });

  return (
    <form onSubmit={handleSubmit(async (data) => {
      await onSubmit(data);
      if (!defaultValues?.employee_code) {
        reset({
          name: "",
          email: "",
          department: "",
          role: "",
          joining_date: new Date().toISOString().split('T')[0],
          project_id: null,
        });
      }
    })} className="space-y-4">
      {defaultValues?.employee_code && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm flex justify-between items-center mb-4">
          <span className="font-medium text-gray-500">Employee Code</span>
          <span className="font-bold text-ethara-slate">{defaultValues.employee_code}</span>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Full Name <span className="text-red-500">*</span></label>
          <Input {...register("name")} placeholder="John Doe" />
          {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Email <span className="text-red-500">*</span></label>
          <Input type="email" {...register("email")} placeholder="john@ethara.com" />
          {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Department <span className="text-red-500">*</span></label>
          <Controller
            name="department"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value || ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Engineering">Engineering</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                  <SelectItem value="Sales">Sales</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="Product">Product</SelectItem>
                  <SelectItem value="Design">Design</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.department && <p className="text-red-500 text-xs">{errors.department.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Role <span className="text-red-500">*</span></label>
          <Input {...register("role")} placeholder="e.g. Frontend Developer" />
          {errors.role && <p className="text-red-500 text-xs">{errors.role.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Joining Date <span className="text-red-500">*</span></label>
          <Input type="date" {...register("joining_date")} placeholder="(YYYY-MM-DD)" />
          {errors.joining_date && <p className="text-red-500 text-xs">{errors.joining_date.message}</p>}
        </div>

        <div className="space-y-1 md:col-span-2">
          <label className="text-sm font-medium">Project (Optional)</label>
          <Controller
            name="project_id"
            control={control}
            render={({ field }) => (
              <Select 
                onValueChange={(val) => field.onChange(val === "" || val === "none" ? null : Number(val))} 
                value={field.value ? field.value.toString() : "none"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Project (Pending Allocation)</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.project_id && <p className="text-red-500 text-xs">{errors.project_id.message}</p>}
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={isLoading} className="bg-ethara-green hover:bg-ethara-green/90 text-white w-full sm:w-auto">
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {defaultValues?.employee_code ? "Update Employee" : "Add Employee"}
        </Button>
      </div>
    </form>
  );
}
