import { useState } from "react";
  import { useMutation, useQueryClient } from "@tanstack/react-query";
  import { useLocation } from "wouter";
  import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
  import { Button } from "../../components/ui/button";
  import { Input } from "../../components/ui/input";
  import { Label } from "../../components/ui/label";
  import { Textarea } from "../../components/ui/textarea";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
  import { useToast } from "../../hooks/use-toast";
  import { ArrowLeft, ArrowRight, FileText, Globe, Calendar, Sparkles } from "lucide-react";
  import { Badge } from "../../components/ui/badge";

  const LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'ar', name: 'Arabic' },
    { code: 'ru', name: 'Russian' },
  ];

  const PRIORITIES = [
    { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
    { value: 'normal', label: 'Normal', color: 'bg-blue-100 text-blue-800' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' },
  ];

  export default function CreateOrder() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [step, setStep] = useState(1);
    
    const [formData, setFormData] = useState({
      title: '',
      description: '',
      sourceLang: '',
      targetLang: '',
      deadline: '',
      specialInstructions: '',
      priority: 'normal',
    });
    
    const createOrderMutation = useMutation({
      mutationFn: async (data: typeof formData) => {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to create order');
        return res.json();
      },
      onSuccess: (order) => {
        queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
        toast({
          title: "Order Created",
          description: "Your translation order has been submitted successfully.",
        });
        setLocation(`/orders/${order.id}`);
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to create order. Please try again.",
          variant: "destructive",
        });
      }
    });
    
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      createOrderMutation.mutate(formData);
    };
    
    const canProceed = () => {
      if (step === 1) return formData.title && formData.description;
      if (step === 2) return formData.sourceLang && formData.targetLang;
      return true;
    };
    
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setLocation('/orders')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create Translation Order</h1>
            <p className="text-gray-600 mt-1">Step {step} of 3</p>
          </div>
        </div>
        
        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`flex-1 h-2 rounded-full transition-colors ${
                s <= step ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        
        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Project Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Project Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Marketing Website Translation"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Provide details about what needs to be translated..."
                    rows={6}
                    required
                  />
                </div>
              </CardContent>
            </Card>
          )}
          
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Language Selection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="sourceLang">Source Language *</Label>
                  <Select 
                    value={formData.sourceLang}
                    onValueChange={(value) => setFormData({ ...formData, sourceLang: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source language" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map(lang => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="targetLang">Target Language *</Label>
                  <Select 
                    value={formData.targetLang}
                    onValueChange={(value) => setFormData({ ...formData, targetLang: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select target language" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map(lang => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {formData.sourceLang && formData.targetLang && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-900 mb-2">
                      <Sparkles className="h-5 w-5" />
                      <span className="font-semibold">AI Translation Available</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      Get an instant AI-powered draft translation, then assign to a professional linguist for refinement.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Timeline & Requirements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="deadline">Deadline (Optional)</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select 
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map(p => (
                        <SelectItem key={p.value} value={p.value}>
                          <div className="flex items-center gap-2">
                            <Badge className={p.color}>{p.label}</Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="specialInstructions">Special Instructions (Optional)</Label>
                  <Textarea
                    id="specialInstructions"
                    value={formData.specialInstructions}
                    onChange={(e) => setFormData({ ...formData, specialInstructions: e.target.value })}
                    placeholder="Any specific requirements, terminology preferences, or style guidelines..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          )}
          
          <div className="flex justify-between mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(s => Math.max(1, s - 1))}
              disabled={step === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            
            {step < 3 ? (
              <Button
                type="button"
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button 
                type="submit"
                disabled={createOrderMutation.isPending}
              >
                {createOrderMutation.isPending ? 'Creating...' : 'Create Order'}
              </Button>
            )}
          </div>
        </form>
      </div>
    );
  }
  