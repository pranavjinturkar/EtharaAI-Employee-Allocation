"use client";

import { useEffect, useState } from "react";
import { getEmployees, createEmployee, updateEmployee, deleteEmployee, getProjects, Employee, Project, getErrorMessage } from "@/lib/api";
import { EmployeeForm } from "@/components/forms/EmployeeForm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Eye, Edit2, Trash2, Users, Loader2, Plus } from "lucide-react";
import { usePagination } from "@/hooks/usePagination";
import { useDebounce } from "@/hooks/useDebounce";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/StatusBadge";
import { SeatInfo } from "@/components/SeatInfo";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { TableSkeleton, CardListSkeleton } from "@/components/LoadingSkeleton";

export default function EmployeesPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [status, setStatus] = useState("ALL");
  const [projectId, setProjectId] = useState("ALL");
  
  const [deactivateId, setDeactivateId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [viewEmployee, setViewEmployee] = useState<Employee | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: employees, loading, page, limit, total, totalPages, goToPage, refresh } = usePagination(
    getEmployees,
    {
      search: debouncedSearch || undefined,
      project_id: projectId !== "ALL" ? Number(projectId) : undefined,
      status: status !== "ALL" ? status : undefined
    }
  );

  useEffect(() => {
    getProjects().then(setProjects).catch(err => toast.error(getErrorMessage(err)));
  }, []);

  const handleDelete = async () => {
    if (!deactivateId) return;
    setIsDeleting(true);
    try {
      await deleteEmployee(deactivateId);
      toast.success("Employee deactivated successfully");
      refresh();
      setDeactivateId(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      await createEmployee(data);
      toast.success("Employee created successfully");
      setIsAddOpen(false);
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (data: any) => {
    if (!editEmployee) return;
    setIsSubmitting(true);
    try {
      await updateEmployee(editEmployee.id, data);
      toast.success("Employee updated successfully");
      setEditEmployee(null);
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const startIdx = (page - 1) * limit + 1;
  const endIdx = Math.min(page * limit, total);

  const renderActionButtons = (emp: Employee) => (
    <div className="flex items-center gap-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={
            <Button variant="ghost" size="icon-sm" onClick={() => setViewEmployee(emp)} className="h-8 w-8 text-gray-500 hover:text-ethara-green" aria-label="View">
              <Eye className="w-4 h-4" />
            </Button>
          } />
          <TooltipContent>View</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={
            <Button variant="ghost" size="icon-sm" onClick={() => setEditEmployee(emp)} className="h-8 w-8 text-gray-500 hover:text-ethara-purple" aria-label="Edit">
              <Edit2 className="w-4 h-4" />
            </Button>
          } />
          <TooltipContent>Edit</TooltipContent>
        </Tooltip>
        {emp.status !== "INACTIVE" && (
          <Tooltip>
            <TooltipTrigger render={
              <Button variant="ghost" size="icon-sm" onClick={() => setDeactivateId(emp.id)} className="h-8 w-8 text-gray-500 hover:text-red-500" aria-label="Deactivate">
                <Trash2 className="w-4 h-4" />
              </Button>
            } />
            <TooltipContent>Deactivate</TooltipContent>
          </Tooltip>
        )}
      </TooltipProvider>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-ethara-slate">Employees</h1>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={
            <Button className="bg-ethara-green hover:bg-ethara-green/90 text-white w-full sm:w-auto shadow-sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Employee
            </Button>
          } />
          <DialogContent className="sm:max-w-xl w-[95vw] max-h-[90vh] overflow-y-auto rounded-lg">
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
              <DialogDescription>Fill in the details to add a new employee.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <EmployeeForm onSubmit={handleAddSubmit} projects={projects} isLoading={isSubmitting} />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 mb-4">
        <Input 
          placeholder="Search name, email, or code..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)}
          className="w-full lg:max-w-sm bg-white"
        />
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          <Select value={projectId} onValueChange={(val) => setProjectId(val || "ALL")}>
            <SelectTrigger className="w-full sm:w-[200px] bg-white">
              <SelectValue placeholder="Filter by Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Projects</SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(val) => setStatus(val || "ALL")}>
            <SelectTrigger className="w-full sm:w-[200px] bg-white">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="PENDING_ALLOCATION">Pending Allocation</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!loading && total > 0 && (
        <div className="text-sm text-gray-500 hidden lg:block">
          Showing {startIdx}–{endIdx} of {total} employees
        </div>
      )}

      {/* Mobile / Tablet Card View */}
      <div className="lg:hidden">
        {loading ? (
          <CardListSkeleton count={5} />
        ) : employees.length === 0 ? (
          <EmptyState icon={Users} title="No employees found" subtitle="Try adjusting your filters or search query." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {employees.map(emp => (
              <Card key={emp.id} className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-ethara-slate text-lg">{emp.name}</h3>
                      <p className="text-sm text-gray-500">{emp.email}</p>
                    </div>
                    <Badge variant="outline" className="text-xs bg-gray-50">{emp.employee_code}</Badge>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 items-center">
                    <StatusBadge status={emp.status} />
                    {emp.project_name && <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600 hover:bg-gray-200">{emp.project_name}</Badge>}
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 text-sm flex items-center justify-between border border-gray-100">
                    <SeatInfo info={emp.seat_info} />
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="text-xs text-gray-400 font-medium">{emp.role}</div>
                    {renderActionButtons(emp)}
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
                  <TableHead>Employee</TableHead>
                  <TableHead>Role & Dept</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Seat</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6}><TableSkeleton rows={5} cols={6} /></TableCell></TableRow>
                ) : employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <EmptyState icon={Users} title="No employees found" subtitle="Try adjusting your filters or search query." />
                    </TableCell>
                  </TableRow>
                ) : employees.map((emp) => (
                  <TableRow key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-ethara-slate">{emp.name}</span>
                        <span className="text-xs text-gray-500">{emp.email} · {emp.employee_code}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm text-ethara-slate">{emp.role}</span>
                        <span className="text-xs text-gray-500">{emp.department}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {emp.project_name ? <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200">{emp.project_name}</Badge> : <span className="text-gray-400">—</span>}
                    </TableCell>
                    <TableCell>
                      <SeatInfo info={emp.seat_info} />
                    </TableCell>
                    <TableCell><StatusBadge status={emp.status} /></TableCell>
                    <TableCell className="text-right">
                      {renderActionButtons(emp)}
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
        open={!!deactivateId}
        onOpenChange={(open) => !open && setDeactivateId(null)}
        title="Deactivate Employee"
        description="Are you sure you want to deactivate this employee? This will automatically release their allocated seat."
        onConfirm={handleDelete}
        confirmLabel={isDeleting ? "Deactivating..." : "Deactivate"}
        isDestructive={true}
      />

      <Dialog open={!!editEmployee} onOpenChange={(open) => !open && setEditEmployee(null)}>
        <DialogContent className="sm:max-w-xl w-[95vw] max-h-[90vh] overflow-y-auto rounded-lg">
          <DialogHeader>
            <DialogTitle>Edit Employee — {editEmployee?.name}</DialogTitle>
            <DialogDescription>Update the details for this employee.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {editEmployee && (
              <EmployeeForm 
                defaultValues={{
                  ...editEmployee,
                  project_id: editEmployee.project_id || null,
                  joining_date: editEmployee.joining_date.split('T')[0] // Assuming YYYY-MM-DD format is needed
                }} 
                onSubmit={handleEditSubmit} 
                projects={projects} 
                isLoading={isSubmitting} 
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewEmployee} onOpenChange={(open) => !open && setViewEmployee(null)}>
        <DialogContent className="sm:max-w-md w-[95vw] max-h-[90vh] overflow-y-auto rounded-lg">
          {viewEmployee && (
            <>
              <div className="flex flex-col items-center mb-6 pt-4">
                <div className="w-20 h-20 bg-ethara-green/10 text-ethara-green rounded-full flex items-center justify-center text-2xl font-bold mb-3 border-2 border-ethara-green/20">
                  {viewEmployee.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <h2 className="text-xl font-bold text-ethara-slate">{viewEmployee.name}</h2>
                <p className="text-sm text-gray-500">{viewEmployee.employee_code}</p>
                <div className="mt-2"><StatusBadge status={viewEmployee.status} /></div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div>
                  <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Email</div>
                  <div className="font-medium text-ethara-slate truncate">{viewEmployee.email}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Role</div>
                  <div className="font-medium text-ethara-slate">{viewEmployee.role}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Department</div>
                  <div className="font-medium text-ethara-slate">{viewEmployee.department}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Project</div>
                  <div className="font-medium text-ethara-slate">{viewEmployee.project_name || 'None'}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Joining Date</div>
                  <div className="font-medium text-ethara-slate">{new Date(viewEmployee.joining_date).toLocaleDateString()}</div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="text-gray-500 text-xs uppercase tracking-wider mb-2">Seat Assignment</div>
                <SeatInfo info={viewEmployee.seat_info} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
