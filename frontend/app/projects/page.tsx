"use client";

import { useEffect, useState } from "react";
import {
  getProjects,
  createProject,
  getProjectUtilization,
  getEmployees,
  Project,
  ProjectUtilization,
  getErrorMessage,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, FolderKanban } from "lucide-react";
import toast from "react-hot-toast";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { CardListSkeleton } from "@/components/LoadingSkeleton";
import { ProjectForm } from "@/components/forms/ProjectForm";
import { usePagination } from "@/hooks/usePagination";
import { useDebounce } from "@/hooks/useDebounce";
import { ProjectFormData } from "@/lib/validations";

// ─── Project Employees Modal Table ───────────────────────────────────────────

function ProjectEmployeesTable({ projectId }: { projectId: number }) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const {
    data: employees,
    loading,
    page,
    limit,
    total,
    totalPages,
    prevPage,
    nextPage,
  } = usePagination(
    getEmployees,
    { project_id: projectId, search: debouncedSearch || undefined },
    10
  );

  const startIdx = total === 0 ? 0 : (page - 1) * limit + 1;
  const endIdx = Math.min(page * limit, total);

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Search */}
      <div className="px-8 py-3 border-b shrink-0 bg-white">
        <Input
          placeholder="Search by name or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-white max-w-sm"
        />
      </div>

      {/* Table — scrollable */}
      <div className="flex-1 overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
            <TableRow className="border-b-2">
              <TableHead className="w-[55%] pl-8 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Employee
              </TableHead>
              <TableHead className="w-[30%] py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Seat
              </TableHead>
              <TableHead className="w-[15%] py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-b border-gray-100">
                  <TableCell className="pl-8 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse shrink-0" />
                      <div className="space-y-2">
                        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                        <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="h-6 w-32 bg-gray-100 rounded-md animate-pulse" />
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse" />
                  </TableCell>
                </TableRow>
              ))
            ) : employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-40 text-center text-gray-400">
                  No employees found.
                </TableCell>
              </TableRow>
            ) : (
              employees.map((emp) => (
                <TableRow
                  key={emp.id}
                  className="hover:bg-gray-50 border-b border-gray-100 transition-colors"
                >
                  <TableCell className="py-4 pl-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-ethara-green flex items-center justify-center text-white text-sm font-bold shrink-0 select-none">
                        {emp.name
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-ethara-slate leading-tight">
                          {emp.name}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {emp.employee_code}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    {emp.seat_info ? (
                      <span className="inline-flex items-center bg-gray-100 rounded-md px-2.5 py-1 text-xs font-medium text-ethara-slate">
                        Floor {emp.seat_info.floor} · Seat {emp.seat_info.seat_number}
                      </span>
                    ) : (
                      <span className="inline-flex items-center bg-amber-50 text-amber-600 rounded-md px-2.5 py-1 text-xs font-medium">
                        Unassigned
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="py-4">
                    <StatusBadge status={emp.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer */}
      {!loading && total > 0 && (
        <div className="px-8 py-4 border-t bg-gray-50 flex items-center justify-between shrink-0">
          <span className="text-sm text-gray-500">
            Showing {startIdx}–{endIdx} of {total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={prevPage}
              disabled={page === 1}
              className="text-sm"
            >
              ← Prev
            </Button>
            <span className="text-sm text-gray-500 px-2 tabular-nums">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={nextPage}
              disabled={page === totalPages}
              className="text-sm"
            >
              Next →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Projects Page ────────────────────────────────────────────────────────────

const CARD_BORDER_COLORS = [
  "border-t-[#7CC0AA]",
  "border-t-[#88778F]",
  "border-t-[#96849A]",
  "border-t-[#43464D]",
  "border-t-blue-400",
  "border-t-rose-400",
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [utilization, setUtilization] = useState<ProjectUtilization[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [projs, utils] = await Promise.all([
        getProjects(),
        getProjectUtilization(),
      ]);
      setProjects(projs);
      setUtilization(utils);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  const handleAddSubmit = async (data: ProjectFormData) => {
    setIsSubmitting(true);
    try {
      await createProject(data);
      toast.success("Project created successfully");
      setIsAddOpen(false);
      loadData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUtil = (name: string): ProjectUtilization =>
    utilization.find((u) => u.project_name === name) || {
      project_name: name,
      total_employees: 0,
      allocated_seats: 0,
    };

  const getPercentage = (allocated: number, total: number) =>
    total > 0 ? Math.round((allocated / total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ethara-slate">Projects</h1>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={
            <Button className="bg-ethara-green hover:bg-ethara-green/90 text-white shadow-sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Project
            </Button>
           } />
          <DialogContent className="sm:max-w-md rounded-2xl w-[95vw]">
            <DialogHeader>
              <DialogTitle>Add New Project</DialogTitle>
            </DialogHeader>
            <div className="pt-4">
              <ProjectForm onSubmit={handleAddSubmit} isLoading={isSubmitting} />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Project cards */}
      {loading ? (
        <CardListSkeleton count={6} />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects found"
          subtitle="Get started by creating a new project."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((proj, idx) => {
            const util = getUtil(proj.name);
            const percent = getPercentage(util.allocated_seats, util.total_employees);
            const borderColor = CARD_BORDER_COLORS[idx % CARD_BORDER_COLORS.length];

            return (
              <Card
                key={proj.id}
                className={`rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 border-t-4 ${borderColor} border-l-0 border-r-0 border-b-0`}
              >
                <CardHeader className="pb-2 pt-5">
                  <CardTitle className="text-ethara-slate text-lg font-bold">
                    {proj.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 text-sm">
                    {proj.description || "No description provided."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-5">
                  {/* Stats row */}
                  <div className="flex justify-around bg-gray-50 border border-gray-100 rounded-xl p-3 mb-4">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-xl font-bold text-ethara-slate">
                        {util.total_employees}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">
                        Employees
                      </span>
                    </div>
                    <div className="w-px bg-gray-200" />
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-xl font-bold text-ethara-slate">
                        {util.allocated_seats}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">
                        Seats
                      </span>
                    </div>
                    <div className="w-px bg-gray-200" />
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-xl font-bold text-ethara-slate">
                        {percent}%
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">
                        Utilized
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-ethara-green h-1.5 rounded-full transition-all duration-700"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {/* View team button */}
                  <Button
                    variant="outline"
                    className="w-full text-ethara-slate border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    onClick={() => setSelectedProject(proj)}
                  >
                    View Team
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Team members modal */}
      <Dialog
        open={!!selectedProject}
        onOpenChange={(open) => !open && setSelectedProject(null)}
      >
        <DialogContent className="w-[95vw] h-[90vh] max-w-full rounded-2xl sm:w-[95vw] sm:h-[90vh] sm:max-h-[90vh] sm:max-w-[1200px] sm:rounded-2xl xl:w-[50vw] xl:max-w-[50vw] flex flex-col p-0 overflow-hidden gap-0 border-0 sm:border">
          {/* Modal header */}
          <div className="px-8 pt-7 pb-5 border-b shrink-0 bg-white">
            <div className="pr-8">
              <h2 className="text-2xl font-bold text-ethara-slate">
                {selectedProject?.name}
              </h2>
              {selectedProject?.description && (
                <p className="text-sm text-gray-500 mt-1">
                  {selectedProject.description}
                </p>
              )}
            </div>
            {selectedProject && (
              <div className="flex flex-wrap gap-2 mt-4">
                {[
                  `${getUtil(selectedProject.name).total_employees} Members`,
                  `${getUtil(selectedProject.name).allocated_seats} Active Seats`,
                  `${getPercentage(
                    getUtil(selectedProject.name).allocated_seats,
                    getUtil(selectedProject.name).total_employees
                  )}% Utilization`,
                ].map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center bg-ethara-bg border border-gray-200 rounded-full px-4 py-1.5 text-sm font-medium text-ethara-slate"
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Table */}
          <div className="flex-1 overflow-hidden bg-white flex flex-col min-h-0">
            {selectedProject && (
              <ProjectEmployeesTable projectId={selectedProject.id} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}