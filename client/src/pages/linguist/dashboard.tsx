import { useQuery } from "@tanstack/react-query";
  import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
  import { Button } from "../../components/ui/button";
  import { Link } from "wouter";
  import { Briefcase, DollarSign, Star, CheckCircle, Clock } from "lucide-react";
  import { Badge } from "../../components/ui/badge";

  export default function LinguistDashboard() {
    const { data: orders = [] } = useQuery({
      queryKey: ['/api/orders'],
      queryFn: async () => {
        const res = await fetch('/api/orders', { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch orders');
        return res.json();
      }
    });
    
    const { data: availableJobs = [] } = useQuery({
      queryKey: ['/api/linguist/available-jobs'],
      queryFn: async () => {
        const res = await fetch('/api/linguist/available-jobs', { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch jobs');
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
      active: orders.filter((o: any) => ['assigned', 'accepted', 'in_progress'].includes(o.status)).length,
      completed: profile?.linguistProfile?.completedJobs || 0,
      earnings: parseFloat(profile?.linguistProfile?.totalEarnings || '0'),
      rating: parseFloat(profile?.linguistProfile?.rating || '0'),
      available: availableJobs.length,
    };
    
    const activeOrders = orders.filter((o: any) => 
      ['assigned', 'accepted', 'in_progress'].includes(o.status)
    ).slice(0, 5);
    
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'in_progress': return 'bg-blue-100 text-blue-800';
        case 'accepted': return 'bg-green-100 text-green-800';
        case 'assigned': return 'bg-yellow-100 text-yellow-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Linguist Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage your translation assignments</p>
          </div>
          <Link href="/jobs">
            <Button size="lg" className="gap-2">
              <Briefcase className="h-5 w-5" />
              Browse Jobs ({stats.available})
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
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
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.earnings.toFixed(2)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rating</CardTitle>
              <Star className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.rating.toFixed(1)}/5.0</div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Active Assignments</CardTitle>
              <Link href="/jobs">
                <Button variant="outline" size="sm">Browse All Jobs</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {activeOrders.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No active assignments</p>
                <p className="text-gray-500 text-sm mb-6">
                  Browse available jobs to start earning
                </p>
                <Link href="/jobs">
                  <Button>View Available Jobs</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {activeOrders.map((order: any) => (
                  <Link key={order.id} href={`/orders/${order.id}`}>
                    <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-2">{order.title}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1 font-medium">
                              <span className="text-blue-600">{order.sourceLang.toUpperCase()}</span>
                              →
                              <span className="text-purple-600">{order.targetLang.toUpperCase()}</span>
                            </span>
                            {order.deadline && (
                              <>
                                <span>•</span>
                                <span>Due: {new Date(order.deadline).toLocaleDateString()}</span>
                              </>
                            )}
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
  