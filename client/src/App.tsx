import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "@/components/navbar";
import Dashboard from "@/pages/dashboard";
import OracleBot from "@/pages/oracle";
import Leaderboard from "@/pages/leaderboard";
import Home from "@/pages/home";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/oracle" component={OracleBot} />
      <Route path="/leaderboard/builders" component={Leaderboard} />
      <Route path="/leaderboard/users" component={Leaderboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

// Hide navbar on landing/legal pages
const PAGES_WITHOUT_NAVBAR = ["/privacy", "/terms"];

function AppContent() {
  const [location] = useLocation();
  const showNavbar = !PAGES_WITHOUT_NAVBAR.includes(location);

  return (
    <>
      {showNavbar && <Navbar />}
      <Toaster />
      <Router />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

