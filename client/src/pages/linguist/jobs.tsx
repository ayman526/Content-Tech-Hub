import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
  import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
  import { Button } from "../../components/ui/button";
  import { Badge } from "../../components/ui/badge";
  import { useToast } from "../../hooks/use-toast";
  import { Briefcase, Globe, Calendar, AlertCircle, CheckCircle } from "lucide-react";
  import { useAuth } from "../../hooks/use-auth";

  export default function LinguistJobs() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { user } = useAuth();
    
    const { data: availableJobs = [], isLoading } = useQuery({
      queryKey: ['/api/linguist/available-jobs'],
      queryFn: async () => {
        const res = await fetch('/api/linguist/available-jobs', { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch jobs');
        return res.json();
      }
    });
    
    const assignMutation = useMutation({
      mutationFn: async (orderId: number) => {
        const res = await fetch('/api/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ orderId, linguistId: user?.id }),
        });
        if (!res.ok) throw new Error('Failed to accept job');
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/linguist/available-jobs'] });
        queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
        toast({
          title: "Job Accepted",
          description: "The job has been assigned to you.",
        });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to accept job. Please try again.",
          variant: "destructive",
        });
      }
    });
    
    const getPriorityColor = (priority?: string) => {
      switch (priority) {
        case 'urgent': return 'bg-red-100 text-red-800';
        case 'high': return 'bg-orange-100 text-orange-800';
        case 'normal': return 'bg-blue-100 text-blue-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };
    
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Available Jobs</h1>
          <p className="text-gray-600 mt-1">Translation projects matching your language pairs</p>
        </div>
        
        {isLoading ? (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-gray-500">Loading available jobs...</p>
            </CardContent>
          </Card>
        ) : availableJobs.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Briefcase className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg mb-2">No Available Jobs</p>
                <p className="text-gray-500">
                  Check back later for new translation opportunities
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {availableJobs.map((job: any) => (
              <Card key={job.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{job.title}</CardTitle>
                      <div className="flex items-center gap-3">
                        <Badge className="bg-blue-100 text-blue-800">
                          <Globe className="h-3 w-3 mr-1" />
                          {job.sourceLang.toUpperCase()} → {job.targetLang.toUpperCase()}
                        </Badge>
                        {job.priority && job.priority !== 'normal' && (
                          <Badge className={getPriorityColor(job.priority)}>
                            {job.priority} priority
                          </Badge>
                        )}
                        {job.aiTranslationCompleted && (
                          <Badge className="bg-purple-100 text-purple-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            AI Draft Available
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => assignMutation.mutate(job.id)}
                      disabled={assignMutation.isPending}
                    >
                      Accept Job
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {job.description && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                      <p className="text-gray-600 text-sm">{job.description}</p>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-6 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Posted: {new Date(job.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {job.deadline && (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <span className="text-orange-600 font-medium">
                          Deadline: {new Date(job.deadline).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    
                    {job.client && (
                      <div className="text-gray-600">
                        Client: {job.client.firstName} {job.client.lastName}
                      </div>
                    )}
                  </div>
                  
                  {job.specialInstructions && (
                    <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Special Instructions</h4>
                      <p className="text-gray-600 text-sm">{job.specialInstructions}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }
  