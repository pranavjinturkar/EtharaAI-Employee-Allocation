"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { seatSchema, SeatFormData } from "@/lib/validations";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface SeatFormProps {
  defaultValues?: Partial<SeatFormData>;
  onSubmit: (data: SeatFormData) => Promise<void>;
  isLoading: boolean;
}

export function SeatForm({ defaultValues, onSubmit, isLoading }: SeatFormProps) {
  const { register, handleSubmit, control, watch, setValue, getValues, reset, formState: { errors } } = useForm<SeatFormData>({
    resolver: zodResolver(seatSchema),
    defaultValues: {
      floor: defaultValues?.floor || 1,
      zone: defaultValues?.zone || "A",
      bay: defaultValues?.bay || "",
      seat_number: defaultValues?.seat_number || "",
      status: defaultValues?.status || "AVAILABLE",
    }
  });

  const zone = watch("zone");
  const bay = watch("bay");

  useEffect(() => {
    if (zone && bay && !defaultValues?.seat_number) {
      const current = getValues("seat_number");
      // Only auto-update if they haven't manually completely changed the format
      if (!current || current.includes('-')) {
        const parts = current.split('-');
        const num = parts.length > 1 ? parts[1] : "1";
        setValue("seat_number", `${zone}${bay}-${num}`, { shouldValidate: true });
      } else if (!current) {
        setValue("seat_number", `${zone}${bay}-1`, { shouldValidate: true });
      }
    }
  }, [zone, bay, setValue, getValues, defaultValues]);

  return (
    <form onSubmit={handleSubmit(async (data) => {
      await onSubmit(data);
      if (!defaultValues?.seat_number) {
        reset({
          floor: 1,
          zone: "A",
          bay: "",
          seat_number: "",
          status: "AVAILABLE"
        });
      }
    })} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Floor <span className="text-red-500">*</span></label>
          <Controller
            name="floor"
            control={control}
            render={({ field }) => (
              <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value.toString()}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Floor" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(f => (
                    <SelectItem key={f} value={f.toString()}>Floor {f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.floor && <p className="text-red-500 text-xs">{errors.floor.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Zone <span className="text-red-500">*</span></label>
          <Controller
            name="zone"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Zone" />
                </SelectTrigger>
                <SelectContent>
                  {['A','B','C','D','E','F','G','H','I','J'].map(z => (
                    <SelectItem key={z} value={z}>Zone {z}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.zone && <p className="text-red-500 text-xs">{errors.zone.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Bay <span className="text-red-500">*</span></label>
          <Input {...register("bay")} placeholder="e.g. 1" />
          {errors.bay && <p className="text-red-500 text-xs">{errors.bay.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Seat Number <span className="text-red-500">*</span></label>
          <Input {...register("seat_number")} placeholder="e.g. A1-1" />
          {errors.seat_number && <p className="text-red-500 text-xs">{errors.seat_number.message}</p>}
        </div>

        <div className="space-y-1 md:col-span-2">
          <label className="text-sm font-medium">Status <span className="text-red-500">*</span></label>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AVAILABLE">Available</SelectItem>
                  <SelectItem value="RESERVED">Reserved</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.status && <p className="text-red-500 text-xs">{errors.status.message}</p>}
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={isLoading} className="bg-ethara-green hover:bg-ethara-green/90 text-white w-full sm:w-auto">
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Add Seat
        </Button>
      </div>
    </form>
  );
}
