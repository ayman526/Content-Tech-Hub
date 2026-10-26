import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
  import { useRoute, useLocation } from "wouter";
  import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
  import { Button } from "../../components/ui/button";
  import { Badge } from "../../components/ui/badge";
  import { Textarea } from "../../components/ui/textarea";
  import { useToast } from "../../hooks/use-toast";
  import { useAuth } from "../../hooks/use-auth";
  import { 
    ArrowLeft, FileText, Globe, Calendar, User, 
    Sparkles, CheckCircle, Clock, AlertCircle, Loader2 
  } from "lucide-react";
  import { useState } from "react";
  import { Separator } from "../../components/ui/separator";

  export default function OrderDetails() {
    const [, params] = useRoute('/orders/:id');
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const [textToTranslate, setTextToTranslate] = useState('');
    const [translatedText, setTranslatedText] = useState('');
    
    const orderId = params?.id;
    
    const { data: order, isLoading } = useQuery({
      queryKey: [`/api/orders/${orderId}`],
      queryFn: async () => {
        const res = await fetch(`/api/orders/${orderId}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch order');
        return res.json();
      },
      enabled: !!orderId,
    });
    
    const translateMutation = useMutation({
      mutationFn: async (text: string) => {
        const res = await fetch(`/api/orders/${orderId}/ai-translate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ text }),
        });
        if (!res.ok) throw new Error('Translation failed');
        return res.json();
      },
      onSuccess: (data) => {
        setTranslatedText(data.translatedText);
        queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
        toast({
          title: "Translation Complete",
          description: "AI translation generated successfully.",
        });
      },
    });
    
    const acceptAssignmentMutation = useMutation({
      mutationFn: async (assignmentId: number) => {
        const res = await fetch(`/api/assignments/${assignmentId}/accept`, {
          method: 'PATCH',
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to accept');
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
        toast({
          title: "Assignment Accepted",
          description: "You can now start working on this translation.",
        });
      },
    });
    
    const completeAssignmentMutation = useMutation({
      mutationFn: async (assignmentId: number) => {
        const res = await fetch(`/api/assignments/${assignmentId}/complete`, {
          method: 'PATCH',
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to complete');
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
        toast({
          title: "Assignment Completed",
          description: "The order has been marked as complete.",
        });
      },
    });
    
    const updateStatusMutation = useMutation({
      mutationFn: async (status: string) => {
        const res = await fetch(`/api/orders/${orderId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ status }),
        });
        if (!res.ok) throw new Error('Failed to update status');
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
        toast({
          title: "Status Updated",
          description: "Order status has been updated.",
        });
      },
    });
    
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      );
    }
    
    if (!order) {
      return (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Order not found</p>
        </div>
      );
    }
    
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
    
    const isClient = user?.id === order.clientId;
    const myAssignment = order.assignments?.find((a: any) => a.linguistId === user?.id);
    const isAssignedLinguist = !!myAssignment;
    
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setLocation(user?.role === 'linguist' ? '/' : '/orders')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{order.title}</h1>
            <div className="flex items-center gap-3 mt-2">
              <Badge className={getStatusColor(order.status)}>
                {order.status.replace('_', ' ')}
              </Badge>
              {order.priority && order.priority !== 'normal' && (
                <Badge variant="outline" className="capitalize">
                  {order.priority} priority
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.description && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                  <p className="text-gray-900">{order.description}</p>
                </div>
              )}
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Language Pair
                  </h3>
                  <p className="text-gray-900 font-medium">
                    {order.sourceLang.toUpperCase()} → {order.targetLang.toUpperCase()}
                  </p>
                </div>
                
                {order.deadline && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Deadline
                    </h3>
                    <p className="text-gray-900">{new Date(order.deadline).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
              
              {order.specialInstructions && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Special Instructions</h3>
                    <p className="text-gray-600 text-sm">{order.specialInstructions}</p>
                  </div>
                </>
              )}
              
              {isClient && !order.aiTranslationCompleted && (
                <>
                  <Separator />
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 text-blue-900 mb-3">
                      <Sparkles className="h-5 w-5" />
                      <h3 className="font-semibold text-lg">AI Translation</h3>
                    </div>
                    <p className="text-sm text-gray-700 mb-4">
                      Get an instant AI-powered draft translation to review before assigning to a linguist.
                    </p>
                    
                    <Textarea
                      placeholder="Paste your text here to translate..."
                      value={textToTranslate}
                      onChange={(e) => setTextToTranslate(e.target.value)}
                      rows={4}
                      className="mb-3"
                    />
                    
                    <Button
                      onClick={() => translateMutation.mutate(textToTranslate)}
                      disabled={!textToTranslate || translateMutation.isPending}
                      className="w-full"
                    >
                      {translateMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Translating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate AI Translation
                        </>
                      )}
                    </Button>
                    
                    {translatedText && (
                      <div className="mt-4 p-4 bg-white rounded border">
                        <h4 className="font-medium text-gray-900 mb-2">Translation Result:</h4>
                        <p className="text-gray-800">{translatedText}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Client Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {order.client?.firstName} {order.client?.lastName}
                    </p>
                    <p className="text-sm text-gray-600">{order.client?.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {order.assignments && order.assignments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Assigned Linguist</CardTitle>
                </CardHeader>
                <CardContent>
                  {order.assignments.map((assignment: any) => (
                    <div key={assignment.id} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-full">
                          <User className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {assignment.linguist?.firstName} {assignment.linguist?.lastName}
                          </p>
                          <Badge variant="outline" className="mt-1">
                            {assignment.status}
                          </Badge>
                        </div>
                      </div>
                      
                      {isAssignedLinguist && assignment.status === 'assigned' && (
                        <Button
                          onClick={() => acceptAssignmentMutation.mutate(assignment.id)}
                          disabled={acceptAssignmentMutation.isPending}
                          className="w-full"
                        >
                          Accept Assignment
                        </Button>
                      )}
                      
                      {isAssignedLinguist && assignment.status === 'accepted' && (
                        <Button
                          onClick={() => completeAssignmentMutation.mutate(assignment.id)}
                          disabled={completeAssignmentMutation.isPending}
                          className="w-full"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark as Complete
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            
            {user?.role === 'admin' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Admin Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {order.status === 'completed' && (
                    <Button
                      onClick={() => updateStatusMutation.mutate('delivered')}
                      disabled={updateStatusMutation.isPending}
                      className="w-full"
                      variant="outline"
                    >
                      Mark as Delivered
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Created</p>
                      <p className="text-xs text-gray-600">
                        {new Date(order.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  {order.assignments?.[0]?.acceptedAt && (
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Accepted</p>
                        <p className="text-xs text-gray-600">
                          {new Date(order.assignments[0].acceptedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {order.assignments?.[0]?.completedAt && (
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Completed</p>
                        <p className="text-xs text-gray-600">
                          {new Date(order.assignments[0].completedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }
  