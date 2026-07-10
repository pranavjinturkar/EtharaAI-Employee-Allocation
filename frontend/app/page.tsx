"use client";

import { useEffect, useState } from "react";
import { getDashboardSummary, getProjectUtilization, getFloorUtilization, DashboardSummary, ProjectUtilization, FloorUtilization, getErrorMessage } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";
import toast from "react-hot-toast";
import { Users, Armchair, CheckCircle, Clock, CalendarDays, Grid, RefreshCw } from "lucide-react";

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [projectUtil, setProjectUtil] = useState<ProjectUtilization[]>([]);
  const [floorUtil, setFloorUtil] = useState<FloorUtilization[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async (showMainLoader = false) => {
    if (showMainLoader) setLoading(true);
    else setIsRefreshing(true);
    try {
      const [sum, pUtil, fUtil] = await Promise.all([
        getDashboardSummary(),
        getProjectUtilization(),
        getFloorUtilization()
      ]);
      setSummary(sum);
      setProjectUtil(pUtil);
      setFloorUtil(fUtil);
      setLastUpdated(new Date());
    } catch (err: any) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(true);
    const interval = setInterval(() => {
      loadData(false);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-ethara-slate">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
             <Card key={i} className="h-28 animate-pulse bg-white border-l-4 border-gray-200 rounded-2xl shadow-sm" />
          ))}
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-6 pb-8 relative">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-ethara-slate">Dashboard</h1>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => loadData(false)} 
          disabled={isRefreshing}
          className="text-ethara-slate border-gray-200 bg-white hover:bg-gray-50 shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard 
          title="Total Employees" 
          value={summary.total_employees} 
          borderColor="border-l-ethara-slate" 
          icon={<Users className="w-5 h-5 text-ethara-slate opacity-70" />}
        />
        <StatCard 
          title="Total Seats" 
          value={summary.total_seats} 
          borderColor="border-l-[#96849A]" 
          icon={<Grid className="w-5 h-5 text-ethara-lightpurple opacity-70" />}
        />
        <StatCard 
          title="Occupied Seats" 
          value={summary.occupied_seats} 
          borderColor="border-l-ethara-purple" 
          icon={<Armchair className="w-5 h-5 text-ethara-purple opacity-70" />}
        />
        <StatCard 
          title="Available Seats" 
          value={summary.available_seats} 
          borderColor="border-l-ethara-green" 
          icon={<CheckCircle className="w-5 h-5 text-ethara-green opacity-70" />}
        />
        <StatCard 
          title="Reserved Seats" 
          value={summary.reserved_seats} 
          borderColor="border-l-yellow-500" 
          icon={<CalendarDays className="w-5 h-5 text-yellow-500 opacity-70" />}
        />
        <StatCard 
          title="Pending Allocation" 
          value={summary.pending_allocation_count} 
          borderColor="border-l-amber-500" 
          icon={<Clock className="w-5 h-5 text-amber-500 opacity-70" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-ethara-purple uppercase tracking-wide">Project Seat Allocation</CardTitle>
          </CardHeader>
          <CardContent className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectUtil} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="project_name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#88778F' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#88778F' }} />
                <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="allocated_seats" fill="#7CC0AA" radius={[4, 4, 0, 0]} name="Allocated Seats" maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-ethara-purple uppercase tracking-wide">Floor Occupancy</CardTitle>
          </CardHeader>
          <CardContent className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={floorUtil} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="floor" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#88778F' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#88778F' }} />
                <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="occupied_seats" fill="#88778F" radius={[4, 4, 0, 0]} name="Occupied" maxBarSize={40} />
                <Bar dataKey="available_seats" fill="#7CC0AA" radius={[4, 4, 0, 0]} name="Available" maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {lastUpdated && (
        <div className="text-right text-xs text-gray-400 pt-4">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, borderColor, icon }: { title: string, value: number, borderColor: string, icon: React.ReactNode }) {
  return (
    <Card className={`rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow border-l-4 ${borderColor}`}>
      <CardContent className="p-6 flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-ethara-slate">{value}</p>
        </div>
        <div className="p-2 bg-gray-50 rounded-full">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
