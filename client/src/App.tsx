import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import WorkflowEditor from "@/pages/workflow-editor";
import WorkflowList from "@/pages/workflow-list";

function Router() {
  return (
    <Switch>
      <Route path="/">
        {() => {
          window.location.href = "/workflows";
          return null;
        }}
      </Route>
      <Route path="/workflows" component={WorkflowList} />
      <Route path="/workflows/:id" component={WorkflowEditor} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
