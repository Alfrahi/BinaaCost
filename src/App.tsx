import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./components/AuthProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import LayoutShell from "./components/LayoutShell";
import LanguageProvider from "./components/LanguageProvider";
import { Toaster } from "./components/ui/sonner";
import { ErrorBoundary } from "react-error-boundary";
import ErrorDisplay from "./components/ErrorDisplay";
import React, { Suspense } from "react";
import PageLoader from "./components/PageLoader";

const Login = React.lazy(() => import("./pages/Login"));
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const CreateProject = React.lazy(() => import("./pages/CreateProject"));
const ProjectDetail = React.lazy(() => import("./pages/ProjectDetail"));
const EditProject = React.lazy(() => import("./pages/EditProject"));
const Settings = React.lazy(() => import("./pages/Settings"));
const CostLibrary = React.lazy(() => import("./pages/CostLibrary"));
const Analytics = React.lazy(() => import("./pages/Analytics"));
const AdminPanel = React.lazy(() => import("./pages/admin/AdminPanel"));
const UserManagement = React.lazy(() => import("./pages/admin/UserManagement"));
const ProjectManagement = React.lazy(
  () => import("./pages/admin/ProjectManagement"),
);
const DropdownSettings = React.lazy(
  () => import("./pages/admin/DropdownSettings"),
);
const AppSettings = React.lazy(() => import("./pages/admin/AppSettings"));
const AuditLogs = React.lazy(() => import("./pages/admin/AuditLogs"));
const UserDetails = React.lazy(() => import("./pages/admin/UserDetails"));
const SubscriptionManagement = React.lazy(
  () => import("./pages/admin/SubscriptionManagement"),
);
const PublicShare = React.lazy(() => import("./pages/PublicShare"));
const NotFound = React.lazy(() => import("./pages/NotFound"));

function AppContent() {
  return (
    <AuthProvider>
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
                <Route
                  path="/admin/subscriptions"
                  element={
                    <AdminRoute>
                      <LayoutShell>
                        <SubscriptionManagement />
                      </LayoutShell>
                    </AdminRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
          <Toaster />
        </Router>
      </LanguageProvider>
    </AuthProvider>
  );
}

function App() {
  return <AppContent />;
}

export default App;
