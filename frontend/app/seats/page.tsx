"use client";

import { useEffect, useState } from "react";
import { getSeats, createSeat, allocateSeat, releaseSeat, updateSeatStatus, getEmployees, Employee, getErrorMessage } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Armchair, Plus } from "lucide-react";
import { usePagination } from "@/hooks/usePagination";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { TableSkeleton, CardListSkeleton } from "@/components/LoadingSkeleton";
import { SeatForm } from "@/components/forms/SeatForm";
import { AllocateForm } from "@/components/forms/AllocateForm";

export default function SeatsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [floor, setFloor] = useState("ALL");
  const [zone, setZone] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [releaseId, setReleaseId] = useState<number | null>(null);
  const [isReleasing, setIsReleasing] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allocateSeatState, setAllocateSeatState] = useState<any | null>(null);

  const { data: seats, loading, page, limit, total, totalPages, goToPage, refresh } = usePagination(
    getSeats,
    {
      floor: floor !== "ALL" ? Number(floor) : undefined,
      zone: zone !== "ALL" ? zone : undefined,
      status: status !== "ALL" ? status : undefined
    }
  );

  useEffect(() => {
    getEmployees({ status: "PENDING_ALLOCATION" }).then(res => setEmployees(res.data)).catch(err => toast.error(getErrorMessage(err)));
  }, []);

  const handleAddSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      await createSeat(data);
      toast.success("Seat created successfully");
      setIsAddOpen(false);
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAllocate = async (data: any) => {
    if (!allocateSeatState) return;
    setIsSubmitting(true);
    try {
      await allocateSeat({ employee_id: data.employee_id, seat_id: data.seat_id });
      toast.success("Seat allocated successfully");
      setAllocateSeatState(null);
      refresh();
      getEmployees({ status: "PENDING_ALLOCATION" }).then(res => setEmployees(res.data));
    } catch(err: any) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRelease = async () => {
    if (!releaseId) return;
    setIsReleasing(true);
    try {
      await releaseSeat({ employee_id: releaseId });
      toast.success("Seat released successfully");
      refresh();
      setReleaseId(null);
    } catch(err: any) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsReleasing(false);
    }
  };

  const handleUpdateStatus = async (seatId: number, newStatus: string) => {
    try {
      await updateSeatStatus(seatId, newStatus);
      toast.success("Seat status updated successfully");
      refresh();
    } catch(err: any) {
      toast.error(getErrorMessage(err));
    }
  };

  const startIdx = (page - 1) * limit + 1;
  const endIdx = Math.min(page * limit, total);

  const renderAllocateDialog = (seat: any) => (
    <Button variant="outline" size="sm" onClick={() => setAllocateSeatState(seat)} className="text-ethara-green border-ethara-green hover:bg-ethara-green/10">
      Allocate
    </Button>
  );

  const renderMarkAvailable = (seat: any) => (
    <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(seat.id, "AVAILABLE")} className="text-ethara-slate border-gray-200 hover:bg-gray-50">
      Mark Available
    </Button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-[#43464D]">Seats</h1>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={
            <Button className="bg-ethara-green hover:bg-ethara-green/90 text-white w-full sm:w-auto shadow-sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Seat
            </Button>
          } />
          <DialogContent className="sm:max-w-md rounded-lg w-[95vw]">
            <DialogHeader>
              <DialogTitle>Add New Seat</DialogTitle>
            </DialogHeader>
            <div className="pt-4">
              <SeatForm onSubmit={handleAddSubmit} isLoading={isSubmitting} />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 mb-4 overflow-x-auto pb-2 scrollbar-thin">
        <Select value={floor} onValueChange={(val) => setFloor(val || "ALL")}>
          <SelectTrigger className="w-[150px] sm:w-[200px] shrink-0 bg-white">
            <SelectValue placeholder="Filter by Floor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Floors</SelectItem>
            {[1,2,3,4,5].map(f => <SelectItem key={f} value={f.toString()}>Floor {f}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={zone} onValueChange={(val) => setZone(val || "ALL")}>
          <SelectTrigger className="w-[150px] sm:w-[200px] shrink-0 bg-white">
            <SelectValue placeholder="Filter by Zone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Zones</SelectItem>
            {['A','B','C','D','E','F','G','H','I','J'].map(z => <SelectItem key={z} value={z}>Zone {z}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(val) => setStatus(val || "ALL")}>
          <SelectTrigger className="w-[150px] sm:w-[200px] shrink-0 bg-white">
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="AVAILABLE">Available</SelectItem>
            <SelectItem value="OCCUPIED">Occupied</SelectItem>
            <SelectItem value="RESERVED">Reserved</SelectItem>
            <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!loading && total > 0 && (
        <div className="text-sm text-gray-500 hidden lg:block">
          Showing {startIdx}–{endIdx} of {total} seats
        </div>
      )}

      {/* Mobile / Tablet Card View */}
      <div className="lg:hidden">
        {loading ? (
          <CardListSkeleton count={6} />
        ) : seats.length === 0 ? (
          <EmptyState icon={Armchair} title="No seats found" subtitle="Adjust your filters to see more results." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {seats.map(seat => (
              <Card key={seat.id} className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-4">
                  <div className="flex justify-between items-start border-b pb-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-gray-50 text-[#43464D] p-3 rounded-lg font-bold text-xl border border-gray-200">
                        {seat.seat_number}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-500">Floor {seat.floor} · Zone {seat.zone}</span>
                        <div className="mt-1"><StatusBadge status={seat.status} /></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex flex-col">
                      {seat.allocated_employee_name ? (
                        <>
                          <span className="text-sm font-medium text-[#43464D]">{seat.allocated_employee_name}</span>
                          <span className="text-xs text-gray-500">{seat.allocated_project_name || 'No Project'}</span>
                        </>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Unassigned</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {seat.status === 'AVAILABLE' && renderAllocateDialog(seat)}
                      {seat.status === 'OCCUPIED' && seat.allocated_employee_id && (
                        <Button variant="outline" size="sm" onClick={() => setReleaseId(seat.allocated_employee_id!)} className="text-red-500 hover:text-red-600 border-red-200 hover:bg-red-50">
                          Release
                        </Button>
                      )}
                      {(seat.status === 'RESERVED' || seat.status === 'MAINTENANCE') && renderMarkAvailable(seat)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block">
        <Card className="shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10 border-b">
                <TableRow>
                  <TableHead>Seat</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Allocated To</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Allocation Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7}><TableSkeleton rows={5} cols={7} /></TableCell></TableRow>
                ) : seats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <EmptyState icon={Armchair} title="No seats found" subtitle="Adjust your filters to see more results." />
                    </TableCell>
                  </TableRow>
                ) : seats.map((seat) => (
                  <TableRow key={seat.id} className="hover:bg-gray-50 transition-colors">
                    <TableCell className="font-bold text-[#43464D] text-lg">{seat.seat_number}</TableCell>
                    <TableCell className="text-[#43464D]">Floor {seat.floor} · Zone {seat.zone} · Bay {seat.bay}</TableCell>
                    <TableCell><StatusBadge status={seat.status} /></TableCell>
                    <TableCell>
                      {seat.allocated_employee_name ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-sm text-[#43464D]">{seat.allocated_employee_name}</span>
                          <span className="text-xs text-gray-500">{seat.allocated_employee_code}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {seat.allocated_project_name ? (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-700">{seat.allocated_project_name}</Badge>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {seat.allocation_date ? new Date(seat.allocation_date).toLocaleDateString() : <span className="text-gray-400">—</span>}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {seat.status === 'AVAILABLE' && renderAllocateDialog(seat)}
                      {seat.status === 'OCCUPIED' && seat.allocated_employee_id && (
                        <Button variant="outline" size="sm" onClick={() => setReleaseId(seat.allocated_employee_id!)} className="text-red-500 hover:text-red-600 border-red-200 hover:bg-red-50">
                          Release
                        </Button>
                      )}
                      {(seat.status === 'RESERVED' || seat.status === 'MAINTENANCE') && renderMarkAvailable(seat)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {!loading && total > 0 && (
        <Pagination 
          currentPage={page} 
          totalPages={totalPages} 
          onPageChange={goToPage} 
          isLoading={loading} 
        />
      )}

      <ConfirmDialog 
        open={!!releaseId}
        onOpenChange={(open) => !open && setReleaseId(null)}
        title="Release Seat"
        description="Are you sure you want to release this seat? The employee will be marked as Pending Allocation."
        onConfirm={handleRelease}
        confirmLabel={isReleasing ? "Releasing..." : "Release"}
        isDestructive={true}
      />

      <Dialog open={!!allocateSeatState} onOpenChange={(open) => !open && setAllocateSeatState(null)}>
        <DialogContent className="sm:max-w-lg rounded-lg w-[95vw]">
          <DialogHeader>
            <DialogTitle>Allocate Seat</DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            {allocateSeatState && (
              <AllocateForm 
                seat={allocateSeatState} 
                seatId={allocateSeatState.id}
                onSubmit={handleAllocate} 
                isLoading={isSubmitting} 
                employees={employees} 
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
