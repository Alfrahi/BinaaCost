import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
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

const Login = React.lazy(() => import("@/features/auth/components/Login"));
const Dashboard = React.lazy(() => import("@/pages/(dashboard)/Dashboard"));
const CreateProject = React.lazy(() => import("@/pages/(project)/CreateProject"));
const ProjectDetail = React.lazy(() => import("@/pages/(project)/ProjectDetail"));
const EditProject = React.lazy(() => import("@/pages/(project)/EditProject"));
const Settings = React.lazy(() => import("@/pages/(settings)/Settings"));
const CostLibrary = React.lazy(() => import("@/pages/(cost-library)/CostLibrary"));
const Analytics = React.lazy(() => import("@/pages/(analytics)/Analytics"));
const AdminPanel = React.lazy(() => import("@/pages/admin/AdminPanel"));
const UserManagement = React.lazy(() => import("@/pages/admin/UserManagement"));
const ProjectManagement = React.lazy(
  () => import("@/pages/admin/ProjectManagement"),
);
const DropdownSettings = React.lazy(
  () => import("@/pages/admin/DropdownSettings"),
);
const AppSettings = React.lazy(() => import("@/pages/admin/AppSettings"));
const AuditLogs = React.lazy(() => import("@/pages/admin/AuditLogs"));
const UserDetails = React.lazy(() => import("@/pages/admin/UserDetails"));
const PublicShare = React.lazy(() => import("@/pages/PublicShare"));
const NotFound = React.lazy(() => import("@/pages/NotFound"));

function AppContent() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LanguageProvider>
          <Router>
            <ErrorBoundary FallbackComponent={ErrorDisplay}>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/public-share/:accessToken"
                  element={<PublicShare />}
                />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <LayoutShell>
                        <Dashboard />
                      </LayoutShell>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/projects/new"
                  element={
                    <ProtectedRoute>
                      <LayoutShell>
                        <CreateProject />
                      </LayoutShell>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/projects/:id"
                  element={
                    <ProtectedRoute>
                      <LayoutShell>
                        <ProjectDetail />
                      </LayoutShell>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/projects/:id/edit"
                  element={
                    <ProtectedRoute>
                      <LayoutShell>
                        <EditProject />
                      </LayoutShell>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <LayoutShell>
                        <Settings />
                      </LayoutShell>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/cost-library"
                  element={
                    <ProtectedRoute>
                      <LayoutShell>
                        <CostLibrary />
                      </LayoutShell>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/resources"
                  element={
                    <ProtectedRoute>
                      <LayoutShell>
                        <Navigate to="/cost-library" replace />
                      </LayoutShell>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/cost-databases"
                  element={
                    <ProtectedRoute>
                      <LayoutShell>
                        <Navigate to="/cost-library" replace />
                      </LayoutShell>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/analytics"
                  element={
                    <ProtectedRoute>
                      <LayoutShell>
                        <Analytics />
                      </LayoutShell>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <LayoutShell>
                        <AdminPanel />
                      </LayoutShell>
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <AdminRoute>
                      <LayoutShell>
                        <UserManagement />
                      </LayoutShell>
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/users/:userId"
                  element={
                    <AdminRoute>
                      <LayoutShell>
                        <UserDetails />
                      </LayoutShell>
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/projects"
                  element={
                    <AdminRoute>
                      <LayoutShell>
                        <ProjectManagement />
                      </LayoutShell>
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/settings"
                  element={
                    <AdminRoute>
                      <LayoutShell>
                        <DropdownSettings />
                      </LayoutShell>
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/app-settings"
                  element={
                    <AdminRoute>
                      <LayoutShell>
                        <AppSettings />
                      </LayoutShell>
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/audit-logs"
                  element={
                    <AdminRoute>
                      <LayoutShell>
                        <AuditLogs />
                      </LayoutShell>
                    </AdminRoute>
                  }
                />
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
