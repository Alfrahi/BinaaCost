import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider } from "@/features/auth";
import ProtectedRoute from "./app/router/ProtectedRoute";
import AdminRoute from "./app/router/AdminRoute";
import LayoutShell from "./app/layout/LayoutShell";
import LanguageProvider from "./app/providers/LanguageProvider";
import ThemeProvider from "./app/providers/ThemeProvider";
import { Toaster } from "@/shared/components/ui/sonner";
import { ErrorBoundary } from "react-error-boundary";
import ErrorDisplay from "@/shared/components/ErrorDisplay";
import React, { Suspense } from "react";
import PageLoader from "@/shared/components/PageLoader";

// Lazily load all page components for code-splitting
const Login = React.lazy(() => import("@/features/auth/components/Login"));
const Dashboard = React.lazy(() => import("@/pages/dashboard/Dashboard"));
const CreateProject = React.lazy(() => import("@/pages/projects/CreateProject"));
const ProjectDetail = React.lazy(() => import("@/pages/projects/ProjectDetail"));
const EditProject = React.lazy(() => import("@/pages/projects/EditProject"));
const Settings = React.lazy(() => import("@/pages/settings/Settings"));
const CostLibrary = React.lazy(() => import("@/pages/cost-library/CostLibrary"));
const Analytics = React.lazy(() => import("@/pages/analytics/Analytics"));
const AdminPanel = React.lazy(() => import("@/pages/admin/AdminPanel"));
const UserManagement = React.lazy(() => import("@/pages/admin/UserManagement"));
const ProjectManagement = React.lazy(() => import("@/pages/admin/ProjectManagement"));
const DropdownSettings = React.lazy(() => import("@/pages/admin/DropdownSettings"));
const AppSettings = React.lazy(() => import("@/pages/admin/AppSettings"));
const AuditLogs = React.lazy(() => import("@/pages/admin/AuditLogs"));
const UserDetails = React.lazy(() => import("@/pages/admin/UserDetails"));
const PublicShare = React.lazy(() => import("@/pages/PublicShare"));
const NotFound = React.lazy(() => import("@/pages/NotFound"));

/**
 * Layout wrapper that renders LayoutShell with Outlet for nested routes.
 * Using React Router v6 layout routes eliminates repeated ProtectedRoute +
 * LayoutShell boilerplate on every individual route definition.
 */
function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <LayoutShell>
        <Outlet />
      </LayoutShell>
    </ProtectedRoute>
  );
}

function AdminLayout() {
  return (
    <AdminRoute>
      <LayoutShell>
        <Outlet />
      </LayoutShell>
    </AdminRoute>
  );
}

function AppContent() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LanguageProvider>
          <Router>
            <ErrorBoundary FallbackComponent={ErrorDisplay}>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/public-share/:accessToken" element={<PublicShare />} />

                  {/* Protected user routes — LayoutShell rendered once via Outlet */}
                  <Route element={<ProtectedLayout />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/projects/new" element={<CreateProject />} />
                    <Route path="/projects/:id" element={<ProjectDetail />} />
                    <Route path="/projects/:id/edit" element={<EditProject />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/cost-library" element={<CostLibrary />} />
                    <Route path="/analytics" element={<Analytics />} />
                    {/* Legacy route redirects */}
                    <Route path="/projects" element={<Navigate to="/" replace />} />
                    <Route path="/resources" element={<Navigate to="/cost-library" replace />} />
                    <Route path="/cost-databases" element={<Navigate to="/cost-library" replace />} />
                  </Route>

                  {/* Admin-only routes */}
                  <Route element={<AdminLayout />}>
                    <Route path="/admin" element={<AdminPanel />} />
                    <Route path="/admin/users" element={<UserManagement />} />
                    <Route path="/admin/users/:userId" element={<UserDetails />} />
                    <Route path="/admin/projects" element={<ProjectManagement />} />
                    <Route path="/admin/settings" element={<DropdownSettings />} />
                    <Route path="/admin/app-settings" element={<AppSettings />} />
                    <Route path="/admin/audit-logs" element={<AuditLogs />} />
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </Router>
          <Toaster />
        </LanguageProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

function App() {
  return <AppContent />;
}

export default App;
