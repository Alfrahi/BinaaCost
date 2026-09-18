"use client";

import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import BottomNav from "./BottomNav";
import { useIsMobile } from "@/shared/hooks/useMobile";
import OfflineSyncIndicator from "@/shared/components/OfflineSyncIndicator";
import { cn } from "@/shared/lib/utils";

interface LayoutShellProps {
  children: React.ReactNode;
}

export default function LayoutShell({ children }: LayoutShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();

  useEffect(() => {
    if (isMobile) {
      setIsSidebarCollapsed(false);
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  const mainContentWrapperClass = cn(
    "flex flex-1 flex-col overflow-hidden transition-all duration-200 ease-in-out",
  );

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />

      <div className={mainContentWrapperClass}>
        <Topbar setSidebarOpen={setSidebarOpen} />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
          {children}
        </main>

        <div
          className={cn(
            "fixed end-4 z-modal",
            isMobile ? "bottom-20" : "bottom-6",
          )}
        >
          <OfflineSyncIndicator />
        </div>

        {isMobile && <BottomNav />}
      </div>
    </div>
  );
}
