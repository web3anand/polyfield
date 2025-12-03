import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "@/components/navbar";
import Dashboard from "@/pages/dashboard";
import OracleBot from "@/pages/oracle";
import WhalesHub from "@/pages/whales-hub";
import MicroEdgeScanner from "@/pages/micro-edge";
import Leaderboard from "@/pages/leaderboard";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/oracle" component={OracleBot} />
      <Route path="/scanner/whales" component={WhalesHub} />
      <Route path="/scanner/micro-edge" component={MicroEdgeScanner} />
      <Route path="/leaderboard/builders" component={Leaderboard} />
      <Route path="/leaderboard/users" component={Leaderboard} />
      {/* Legacy route redirect */}
      <Route path="/whales" component={MicroEdgeScanner} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Navbar />
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
