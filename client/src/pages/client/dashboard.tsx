import { useQuery } from "@tanstack/react-query";
  import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
  import { Button } from "../../components/ui/button";
  import { Link } from "wouter";
  import { FileText, Clock, CheckCircle, AlertCircle, Plus, TrendingUp } from "lucide-react";
  import { Badge } from "../../components/ui/badge";

  export default function ClientDashboard() {
    const { data: orders = [], isLoading } = useQuery({
      queryKey: ['/api/orders'],
      queryFn: async () => {
        const res = await fetch('/api/orders', { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch orders');
        return res.json();
      }
    });
    
    const { data: profile } = useQuery({
      queryKey: ['/api/user/profile'],
      queryFn: async () => {
        const res = await fetch('/api/user/profile', { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch profile');
        return res.json();
      }
    });
    
    const stats = {
      total: orders.length,
      active: orders.filter((o: any) => ['submitted', 'assigned', 'in_progress'].includes(o.status)).length,
      completed: orders.filter((o: any) => o.status === 'completed').length,
      pending: orders.filter((o: any) => o.status === 'submitted').length,
    };
    
    const recentOrders = orders.slice(0, 5);
    
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'completed': return 'bg-green-100 text-green-800';
        case 'in_progress': return 'bg-blue-100 text-blue-800';
        case 'assigned': return 'bg-yellow-100 text-yellow-800';
        case 'submitted': return 'bg-gray-100 text-gray-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };
    
    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'completed': return <CheckCircle className="h-4 w-4" />;
        case 'in_progress': return <Clock className="h-4 w-4" />;
        default: return <FileText className="h-4 w-4" />;
      }
    };
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Client Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back! Manage your translation projects.</p>
          </div>
          <Link href="/orders/new">
            <Button size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              New Translation Order
            </Button>
          </Link>
        </div>
        
        {profile && (
          <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Current Plan</p>
                  <h3 className="text-2xl font-bold capitalize">{profile.subscriptionTier} Tier</h3>
                  <p className="text-blue-100 text-sm mt-1">
                    {profile.subscriptionTier === 'basic' && 'Upgrade for advanced features'}
                    {profile.subscriptionTier === 'professional' && 'Enjoying professional features'}
                    {profile.subscriptionTier === 'enterprise' && 'Full enterprise access'}
                  </p>
                </div>
                <TrendingUp className="h-12 w-12 text-white opacity-80" />
              </div>
            </CardContent>
          </Card>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Orders</CardTitle>
              <Link href="/orders">
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-gray-500 py-8">Loading orders...</p>
            ) : recentOrders.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No orders yet</p>
                <Link href="/orders/new">
                  <Button>Create Your First Order</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order: any) => (
                  <Link key={order.id} href={`/orders/${order.id}`}>
                    <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {getStatusIcon(order.status)}
                            <h3 className="font-semibold text-gray-900">{order.title}</h3>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <span className="font-medium">{order.sourceLang.toUpperCase()}</span>
                              →
                              <span className="font-medium">{order.targetLang.toUpperCase()}</span>
                            </span>
                            <span>•</span>
                            <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
  