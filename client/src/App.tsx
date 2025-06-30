import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthContext, useAuthState } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/protected-route";

// Pages
import Login from "@/pages/login";
import TempAdmin from "@/pages/temp-admin";
import Dashboard from "@/pages/dashboard";
import UserManagement from "@/pages/user-management";
import CreateUser from "@/pages/create-user";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

function AuthProvider({ children }: { children: React.ReactNode }) {
  const authState = useAuthState();

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login" component={Login} />
      <Route path="/temp-admin" component={TempAdmin} />
      
      {/* Protected routes */}
      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/users">
        <ProtectedRoute requiredRoles={['admin', 'manager']}>
          <UserManagement />
        </ProtectedRoute>
      </Route>
      
      <Route path="/users/create">
        <ProtectedRoute requiredRoles={['admin']}>
          <CreateUser />
        </ProtectedRoute>
      </Route>

      <Route path="/settings">
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      </Route>

      {/* Redirect root to dashboard */}
      <Route path="/">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      
      {/* 404 fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
