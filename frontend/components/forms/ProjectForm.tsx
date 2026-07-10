"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { projectSchema, ProjectFormData } from "@/lib/validations";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ProjectFormProps {
  defaultValues?: Partial<ProjectFormData>;
  onSubmit: (data: ProjectFormData) => Promise<void>;
  isLoading: boolean;
}

export function ProjectForm({ defaultValues, onSubmit, isLoading }: ProjectFormProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      description: defaultValues?.description || "",
      manager_name: defaultValues?.manager_name || "",
    }
  });

  return (
    <form onSubmit={handleSubmit(async (data) => {
      await onSubmit(data);
      if (!defaultValues?.name) {
        reset({
          name: "",
          description: "",
          manager_name: "",
        });
      }
    })} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium">Project Name <span className="text-red-500">*</span></label>
        <Input {...register("name")} placeholder="e.g. Project Apollo" />
        {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
      </div>
      
      <div className="space-y-1">
        <label className="text-sm font-medium">Description</label>
        <textarea 
          {...register("description")} 
          placeholder="Brief description of the project..."
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {errors.description && <p className="text-red-500 text-xs">{errors.description.message}</p>}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Manager Name</label>
        <Input {...register("manager_name")} placeholder="John Doe" />
        {errors.manager_name && <p className="text-red-500 text-xs">{errors.manager_name.message}</p>}
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={isLoading} className="bg-ethara-green hover:bg-ethara-green/90 text-white w-full sm:w-auto">
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Add Project
        </Button>
      </div>
    </form>
  );
}
