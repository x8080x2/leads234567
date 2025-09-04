import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import EmailFinder from "@/pages/email-finder";
import IndustrySearchPage from "@/pages/industry-search";

function Router() {
  return (
    <Switch>
      <Route path="/" component={EmailFinder} />
      <Route path="/industry-search" component={IndustrySearchPage} />
      <Route component={EmailFinder} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
