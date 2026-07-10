"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, Users, Armchair, FolderKanban, Bot, Menu, X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/seats", label: "Seats", icon: Armchair },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/assistant", label: "AI Assistant", icon: Bot },
];

export function Navigation() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b sticky top-0 z-40 shrink-0">
        <h1 className="text-xl font-bold text-ethara-slate">Ethara</h1>
        <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Menu">
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </Button>
      </div>

      {/* Mobile Slide-down Nav (Hamburger) */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[65px] bg-white z-50 p-4 border-b">
          <nav className="flex flex-col gap-2">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-4 px-4 py-3 rounded-lg text-base font-medium transition-colors",
                    isActive ? "bg-ethara-green text-white" : "text-ethara-slate hover:bg-gray-100"
                  )}
                >
                  <Icon className="w-6 h-6" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Desktop / Tablet Sidebar */}
      <div 
        className={cn(
          "hidden md:flex flex-col bg-white border-r h-full shrink-0 transition-all duration-300 relative",
          collapsed ? "w-[80px] lg:w-60" : "w-60"
        )}
      >
        <div className="p-6 flex items-center justify-between h-[84px]">
          <h1 className={cn("text-2xl font-bold text-ethara-slate transition-all", collapsed ? "hidden lg:block" : "block")}>Ethara</h1>
          {/* Collapse toggle (only visible on md, hidden on lg) */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden absolute -right-4 top-6 bg-white border shadow-sm rounded-full w-8 h-8 z-10" 
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Toggle Sidebar"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                title={link.label}
                className={cn(
                  "flex items-center rounded-lg text-sm font-medium transition-colors",
                  collapsed ? "justify-center py-3 lg:justify-start lg:gap-3 lg:px-4 lg:py-3" : "gap-3 px-4 py-3",
                  isActive ? "bg-ethara-green text-white" : "text-ethara-slate hover:bg-gray-100"
                )}
              >
                <Icon className={cn("w-6 h-6 shrink-0", isActive && "text-white")} />
                <span className={cn("transition-all whitespace-nowrap overflow-hidden", collapsed ? "hidden lg:inline" : "inline")}>
                  {link.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around items-center p-2 pb-4 z-40 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex flex-col items-center gap-1 p-2 min-w-[64px] rounded-lg transition-colors",
                isActive ? "text-ethara-green" : "text-gray-400 hover:text-ethara-slate"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
