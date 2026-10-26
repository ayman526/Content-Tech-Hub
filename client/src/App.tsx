import { useAuth } from "./hooks/use-auth";
  import { Route, Switch, Redirect, useLocation } from "wouter";
  import { Loader2 } from "lucide-react";
  import ClientDashboard from "./pages/client/dashboard";
  import ClientOrders from "./pages/client/orders";
  import CreateOrder from "./pages/client/create-order";
  import OrderDetails from "./pages/client/order-details";
  import LinguistDashboard from "./pages/linguist/dashboard";
  import LinguistJobs from "./pages/linguist/jobs";
  import AdminDashboard from "./pages/admin/dashboard";
  import Navigation from "./components/layout/navigation";
  import NotFound from "./pages/not-found";
  import LandingPage from "./pages/landing";
import { Toaster } from "./components/ui/toaster";

  function LoadingPage() {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>

    );
  }

  function RoleBasedRouter({ role }: { role: string }) {
    const [location] = useLocation();
    
    if (role === 'client') {
      return (
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <div className="container mx-auto px-4 py-8">
            <Switch>
              <Route path="/" component={ClientDashboard} />
              <Route path="/orders" component={ClientOrders} />
              <Route path="/orders/new" component={CreateOrder} />
              <Route path="/orders/:id" component={OrderDetails} />
              <Route component={NotFound} />
            </Switch>
          </div>
        </div>
      );
    }
    
    if (role === 'linguist') {
      return (
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <div className="container mx-auto px-4 py-8">
            <Switch>
              <Route path="/" component={LinguistDashboard} />
              <Route path="/jobs" component={LinguistJobs} />
              <Route path="/orders/:id" component={OrderDetails} />
              <Route component={NotFound} />
            </Switch>
          </div>
        </div>
      );
    }
    
    if (role === 'admin') {
      return (
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <div className="container mx-auto px-4 py-8">
            <Switch>
              <Route path="/" component={AdminDashboard} />
              <Route path="/orders/:id" component={OrderDetails} />
              <Route component={NotFound} />
            </Switch>
          </div>
        </div>
      );
    }
    
    return <Redirect to="/" />;
  }

  export default function App() {
    const { user, isLoading } = useAuth();

    if (isLoading) {
      return <LoadingPage />;
    }

    if (!user) {
      return <LandingPage />;
    }

    return (
    <>
      <RoleBasedRouter role={user.role || 'client'} />
      <Toaster />
    </>
  );
  }
  