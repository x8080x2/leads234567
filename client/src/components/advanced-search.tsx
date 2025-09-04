import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, User, Building, MapPin, Briefcase, Target, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface SearchResult {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string | null;
  company: string;
  email: string | null;
  confidence: number | null;
  title: string | null;
  domain: string | null;
  industry: string | null;
  website: string | null;
  companySize: string | null;
  country: string | null;
  city: string | null;
  emailStatus: string | null;
  status: string;
  createdAt: string;
}

interface AdvancedSearchForm {
  firstName: string;
  lastName: string;
  company: string;
  industry: string;
  jobTitle: string;
  location: string;
  limit: number;
}

export default function AdvancedSearch() {
  const [searchForm, setSearchForm] = useState<AdvancedSearchForm>({
    firstName: "",
    lastName: "",
    company: "",
    industry: "",
    jobTitle: "",
    location: "",
    limit: 10
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch available industries
  const { data: availableIndustries } = useQuery({
    queryKey: ["/api/industries/available"],
  });

  // Advanced search mutation
  const advancedSearchMutation = useMutation({
    mutationFn: async (searchParams: AdvancedSearchForm) => {
      const response = await fetch('/api/search/advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchParams)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Search failed');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Search completed",
        description: `Found ${data.totalFound} contacts matching your criteria`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/searches"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Search failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSearch = () => {
    const hasSearchCriteria = Object.entries(searchForm).some(([key, value]) => 
      key !== 'limit' && value && value.toString().trim() !== ''
    );

    if (!hasSearchCriteria) {
      toast({
        title: "Search criteria required",
        description: "Please enter at least one search parameter",
        variant: "destructive",
      });
      return;
    }

    advancedSearchMutation.mutate(searchForm);
  };

  const updateSearchForm = (field: keyof AdvancedSearchForm, value: string | number) => {
    setSearchForm(prev => ({ ...prev, [field]: value }));
  };

  const clearForm = () => {
    setSearchForm({
      firstName: "",
      lastName: "",
      company: "",
      industry: "",
      jobTitle: "",
      location: "",
      limit: 10
    });
  };

  return (
    <div className="space-y-6">
      {/* Advanced Search Form */}
      <Card data-testid="advanced-search-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="text-primary mr-2" />
            Advanced Contact Search
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Search for contacts using GetProspect API with multiple filters
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center">
                <User className="w-4 h-4 mr-1" />
                First Name
              </label>
              <Input
                placeholder="e.g., John"
                value={searchForm.firstName}
                onChange={(e) => updateSearchForm('firstName', e.target.value)}
                data-testid="input-first-name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center">
                <User className="w-4 h-4 mr-1" />
                Last Name
              </label>
              <Input
                placeholder="e.g., Smith"
                value={searchForm.lastName}
                onChange={(e) => updateSearchForm('lastName', e.target.value)}
                data-testid="input-last-name"
              />
            </div>
          </div>

          {/* Company Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center">
                <Building className="w-4 h-4 mr-1" />
                Company
              </label>
              <Input
                placeholder="e.g., Microsoft"
                value={searchForm.company}
                onChange={(e) => updateSearchForm('company', e.target.value)}
                data-testid="input-company"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center">
                <Building className="w-4 h-4 mr-1" />
                Industry
              </label>
              <Select
                value={searchForm.industry}
                onValueChange={(value) => updateSearchForm('industry', value)}
              >
                <SelectTrigger data-testid="select-industry">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {((availableIndustries as any)?.industries || []).map((industry: string) => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Role and Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center">
                <Briefcase className="w-4 h-4 mr-1" />
                Job Title
              </label>
              <Input
                placeholder="e.g., Sales Manager"
                value={searchForm.jobTitle}
                onChange={(e) => updateSearchForm('jobTitle', e.target.value)}
                data-testid="input-job-title"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                Location
              </label>
              <Input
                placeholder="e.g., New York, USA"
                value={searchForm.location}
                onChange={(e) => updateSearchForm('location', e.target.value)}
                data-testid="input-location"
              />
            </div>
          </div>

          {/* Search Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Results Limit</label>
              <Select
                value={searchForm.limit.toString()}
                onValueChange={(value) => updateSearchForm('limit', parseInt(value))}
              >
                <SelectTrigger data-testid="select-limit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 results</SelectItem>
                  <SelectItem value="10">10 results</SelectItem>
                  <SelectItem value="25">25 results</SelectItem>
                  <SelectItem value="50">50 results</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-4">
            <Button
              onClick={handleSearch}
              disabled={advancedSearchMutation.isPending}
              data-testid="button-search"
            >
              {advancedSearchMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              {advancedSearchMutation.isPending ? "Searching..." : "Search Contacts"}
            </Button>
            <Button variant="outline" onClick={clearForm}>
              Clear Form
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {advancedSearchMutation.data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Search Results</span>
              <Badge variant="secondary">
                {advancedSearchMutation.data.totalFound} contacts found
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {advancedSearchMutation.data.results.map((contact: SearchResult, index: number) => (
                <div
                  key={contact.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  data-testid={`contact-result-${index}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="font-medium text-lg">
                        {contact.fullName || `${contact.firstName} ${contact.lastName}`}
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {contact.title && (
                          <div className="flex items-center">
                            <Briefcase className="w-4 h-4 mr-1" />
                            {contact.title}
                          </div>
                        )}
                        <div className="flex items-center">
                          <Building className="w-4 h-4 mr-1" />
                          {contact.company}
                        </div>
                        {contact.industry && (
                          <div className="flex items-center">
                            <Target className="w-4 h-4 mr-1" />
                            {contact.industry}
                          </div>
                        )}
                        {(contact.city || contact.country) && (
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            {[contact.city, contact.country].filter(Boolean).join(", ")}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      {contact.email && (
                        <Badge
                          variant={contact.emailStatus === 'VALID' ? 'default' : 'secondary'}
                        >
                          {contact.emailStatus || 'Email Found'}
                        </Badge>
                      )}
                      {contact.confidence && (
                        <div className="text-xs text-muted-foreground">
                          {contact.confidence}% confidence
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}