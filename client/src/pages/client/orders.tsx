import { useQuery } from "@tanstack/react-query";
  import { Link } from "wouter";
  import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
  import { Button } from "../../components/ui/button";
  import { Input } from "../../components/ui/input";
  import { Badge } from "../../components/ui/badge";
  import { Plus, Search, FileText, Clock, CheckCircle } from "lucide-react";
  import { useState } from "react";

  export default function ClientOrders() {
    const [search, setSearch] = useState('');
    
    const { data: orders = [], isLoading } = useQuery({
      queryKey: ['/api/orders'],
      queryFn: async () => {
        const res = await fetch('/api/orders', { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch orders');
        return res.json();
      }
    });
    
    const filteredOrders = orders.filter((order: any) =>
      order.title.toLowerCase().includes(search.toLowerCase()) ||
      order.description?.toLowerCase().includes(search.toLowerCase())
    );
    
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'completed': return 'bg-green-100 text-green-800';
        case 'delivered': return 'bg-purple-100 text-purple-800';
        case 'in_progress': return 'bg-blue-100 text-blue-800';
        case 'assigned': return 'bg-yellow-100 text-yellow-800';
        case 'submitted': return 'bg-gray-100 text-gray-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };
    
    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'completed':
        case 'delivered':
          return <CheckCircle className="h-4 w-4" />;
        case 'in_progress':
        case 'assigned':
          return <Clock className="h-4 w-4" />;
        default:
          return <FileText className="h-4 w-4" />;
      }
    };
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
            <p className="text-gray-600 mt-1">Track and manage your translation projects</p>
          </div>
          <Link href="/orders/new">
            <Button size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              New Order
            </Button>
          </Link>
        </div>
        
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search orders..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-gray-500 py-8">Loading orders...</p>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg mb-2">
                  {search ? 'No orders found' : 'No orders yet'}
                </p>
                <p className="text-gray-500 mb-6">
                  {search ? 'Try adjusting your search' : 'Create your first translation order to get started'}
                </p>
                {!search && (
                  <Link href="/orders/new">
                    <Button>Create Order</Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((order: any) => (
                  <Link key={order.id} href={`/orders/${order.id}`}>
                    <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {getStatusIcon(order.status)}
                            <h3 className="font-semibold text-gray-900 text-lg">{order.title}</h3>
                          </div>
                          {order.description && (
                            <p className="text-gray-600 text-sm mb-3 line-clamp-2">{order.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                            <span className="flex items-center gap-1 font-medium">
                              <span className="text-blue-600">{order.sourceLang.toUpperCase()}</span>
                              →
                              <span className="text-purple-600">{order.targetLang.toUpperCase()}</span>
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(order.createdAt).toLocaleDateString()}
                            </span>
                            {order.deadline && (
                              <>
                                <span>•</span>
                                <span className="text-orange-600">
                                  Due: {new Date(order.deadline).toLocaleDateString()}
                                </span>
                              </>
                            )}
                            {order.priority && order.priority !== 'normal' && (
                              <>
                                <span>•</span>
                                <Badge variant="outline" className="capitalize">
                                  {order.priority}
                                </Badge>
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
  