"use client";

import { useState, useRef, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { allocateSchema, AllocateFormData } from "@/lib/validations";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Employee, Seat } from "@/lib/api";
import { Loader2, Search, Check } from "lucide-react";
import { SeatInfo } from "@/components/SeatInfo";
import { cn } from "@/lib/utils";

interface AllocateFormProps {
  seat?: Seat;
  seatId?: number;
  onSubmit: (data: AllocateFormData) => Promise<void>;
  isLoading: boolean;
  employees: Employee[];
}

export function AllocateForm({ seat, seatId, onSubmit, isLoading, employees }: AllocateFormProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { handleSubmit, control, setValue, formState: { errors } } = useForm<AllocateFormData>({
    resolver: zodResolver(allocateSchema),
    defaultValues: {
      employee_id: undefined,
      seat_id: seatId,
    }
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase()) || 
    e.employee_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
      {seat && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex items-center justify-between mb-4">
          <div>
            <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Allocating Seat</div>
            <div className="font-bold text-lg text-ethara-slate">{seat.seat_number}</div>
          </div>
          <SeatInfo info={{ floor: seat.floor, zone: seat.zone, bay: seat.bay, seat_number: seat.seat_number }} />
        </div>
      )}

      <div className="space-y-2 relative" ref={wrapperRef}>
        <label className="text-sm font-medium">Select Employee</label>
        
        <Controller
          name="employee_id"
          control={control}
          render={({ field }) => {
            const selectedEmp = employees.find(e => e.id === field.value);
            return (
              <div className="relative">
                <div 
                  className={cn(
                    "flex min-h-[40px] w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer",
                    isOpen ? "ring-2 ring-ring ring-offset-2" : ""
                  )}
                  onClick={() => setIsOpen(!isOpen)}
                >
                  {selectedEmp ? (
                    <div className="flex flex-col text-left">
                      <span className="font-medium text-ethara-slate">{selectedEmp.name}</span>
                      <span className="text-xs text-gray-500">{selectedEmp.employee_code}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Select an employee...</span>
                  )}
                </div>

                {isOpen && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md bg-white">
                    <div className="sticky top-0 bg-white p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="Search name or code..." 
                          className="pl-8 h-9"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    <div className="p-1">
                      {filteredEmployees.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">No employees found.</div>
                      ) : (
                        filteredEmployees.map(emp => (
                          <div 
                            key={emp.id}
                            className={cn(
                              "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none hover:bg-gray-100 hover:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
                              field.value === emp.id ? "bg-gray-50" : ""
                            )}
                            onClick={() => {
                              field.onChange(emp.id);
                              setIsOpen(false);
                              setSearch("");
                            }}
                          >
                            <div className="flex-1 flex flex-col">
                              <span className="font-medium text-ethara-slate">{emp.name}</span>
                              <span className="text-xs text-gray-500">{emp.employee_code} • {emp.project_name || 'No Project'}</span>
                            </div>
                            {field.value === emp.id && <Check className="h-4 w-4 text-ethara-green" />}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          }}
        />
        {errors.employee_id && <p className="text-red-500 text-xs">{errors.employee_id.message}</p>}
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={isLoading} className="bg-ethara-green hover:bg-ethara-green/90 text-white w-full sm:w-auto">
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Allocate Seat
        </Button>
      </div>
    </form>
  );
}
