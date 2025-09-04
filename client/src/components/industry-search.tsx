import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Building, Building2, Users, MapPin, Globe, Search, TrendingUp, Loader2, Mail, Briefcase } from "lucide-react";

interface IndustrySearchProps {
  onCompanySelect?: (company: any) => void;
}

interface Company {
  company: string;
  industry: string;
  website?: string;
  companySize?: string;
  country?: string;
  city?: string;
  employees: Array<{
    fullName?: string;
    firstName: string;
    lastName: string;
    email?: string;
    title?: string;
    emailStatus?: string;
  }>;
  totalEmployees: number;
  branches: string[];
  branchCount: number;
}

interface IndustrySearchResult {
  industry: string;
  totalCompanies: number;
  companies: Company[];
}

export default function IndustrySearch({ onCompanySelect }: IndustrySearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [companyDomain, setCompanyDomain] = useState("");
  const [companyResults, setCompanyResults] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch available industries from GetProspect API
  const { data: availableIndustries } = useQuery({
    queryKey: ["/api/industries/available"],
    enabled: !selectedIndustry,
  });

  // Fetch industry statistics from search history
  const { data: industryStats } = useQuery({
    queryKey: ["/api/analytics/industries"],
    enabled: !selectedIndustry,
  });

  // Fetch industry search results
  const { data: industryResults, isLoading, refetch } = useQuery<IndustrySearchResult>({
    queryKey: ["/api/search/industry", selectedIndustry],
    enabled: !!selectedIndustry,
  });

  const handleIndustrySearch = () => {
    if (searchTerm.trim()) {
      setSelectedIndustry(searchTerm.trim());
    }
  };

  const handleIndustrySelect = (industry: string) => {
    setSearchTerm(industry);
    setSelectedIndustry(industry);
  };

  const clearSearch = () => {
    setSelectedIndustry("");
    setSearchTerm("");
  };

  const clearCompanySearch = () => {
    setCompanyDomain("");
    setCompanyResults(null);
  };

  // Company domain search mutation
  const companySearchMutation = useMutation({
    mutationFn: async (searchData: { company?: string; domain?: string }) => {
      const response = await fetch('/api/search/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchData)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Company search failed');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setCompanyResults(data);
      toast({
        title: "Company search completed",
        description: `Found ${data.totalFound} employees at ${data.company}`,
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

  const handleCompanySearch = () => {
    if (!companyDomain.trim()) {
      toast({
        title: "Company name required",
        description: "Please enter a company name or domain",
        variant: "destructive",
      });
      return;
    }

    // Determine if it's a domain or company name
    const isDomain = companyDomain.includes('.') || companyDomain.includes('www');
    const searchData = isDomain 
      ? { domain: companyDomain.replace(/^https?:\/\//, '').replace(/^www\./, '') }
      : { company: companyDomain };
    
    companySearchMutation.mutate(searchData);
  };

  return (
    <div className="space-y-6">
      {/* Search Interface */}
      <Card data-testid="industry-search-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="text-primary mr-2" />
            Industry Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Input
              placeholder="Enter industry (e.g., Technology, Healthcare, Finance)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleIndustrySearch()}
              data-testid="input-industry-search"
            />
            <Button onClick={handleIndustrySearch} disabled={!searchTerm.trim()}>
              <Search className="w-4 h-4 mr-1" />
              Search
            </Button>
            {selectedIndustry && (
              <Button variant="outline" onClick={clearSearch}>
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Company Domain Search */}
      <Card data-testid="company-search-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Globe className="text-primary mr-2" />
            Company Domain Search
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Find all employees from any company using our comprehensive search approach
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Input
              placeholder="Enter company name or domain (e.g., DR Horton, microsoft.com)"
              value={companyDomain}
              onChange={(e) => setCompanyDomain(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCompanySearch()}
              data-testid="input-company-domain"
            />
            <Button 
              onClick={handleCompanySearch} 
              disabled={!companyDomain.trim() || companySearchMutation.isPending}
            >
              {companySearchMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              {companySearchMutation.isPending ? "Searching..." : "Find Employees"}
            </Button>
            {companyResults && (
              <Button variant="outline" onClick={clearCompanySearch}>
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Company Search Results */}
      {companyResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Employees at {companyResults.company}</span>
              <Badge variant="secondary">
                {companyResults.totalFound} employees found
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {companyResults.results.map((employee: any, index: number) => (
                <div
                  key={employee.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  data-testid={`employee-result-${index}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="font-medium text-lg flex items-center">
                        <Users className="w-5 h-5 mr-2 text-primary" />
                        {employee.fullName || `${employee.firstName} ${employee.lastName}`}
                      </div>
                      <div className="space-y-1 text-sm">
                        {employee.email && (
                          <div className="flex items-center text-blue-600">
                            <Mail className="w-4 h-4 mr-2" />
                            <a href={`mailto:${employee.email}`} className="hover:underline">
                              {employee.email}
                            </a>
                          </div>
                        )}
                        {employee.title && (
                          <div className="flex items-center text-muted-foreground">
                            <Briefcase className="w-4 h-4 mr-2" />
                            {employee.title}
                          </div>
                        )}
                        <div className="flex items-center text-muted-foreground">
                          <Building className="w-4 h-4 mr-2" />
                          {employee.company}
                        </div>
                        {(employee.city || employee.country) && (
                          <div className="flex items-center text-muted-foreground">
                            <MapPin className="w-4 h-4 mr-2" />
                            {[employee.city, employee.country].filter(Boolean).join(", ")}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      {employee.email && (
                        <Badge variant={employee.emailStatus === 'VALID' ? 'default' : 'secondary'}>
                          {employee.emailStatus || 'Found'}
                        </Badge>
                      )}
                      {employee.confidence && (
                        <div className="text-xs text-muted-foreground">
                          {employee.confidence}% confidence
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {new Date(employee.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {companyResults.errors && companyResults.errors.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                  Search Notes:
                </div>
                <div className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                  {companyResults.errors.map((error: string, index: number) => (
                    <div key={index}>• {error}</div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Available Industries from GetProspect API */}
      {!selectedIndustry && (availableIndustries as any)?.industries && Array.isArray((availableIndustries as any).industries) && (availableIndustries as any).industries.length > 0 && (
        <Card data-testid="available-industries-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="text-primary mr-2" />
              Available Industries
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Select from {((availableIndustries as any)?.industries?.length || 0)} industries supported by GetProspect API
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {(availableIndustries?.industries || []).map((industry: string) => {
                const hasData = (industryStats as any)?.industries?.find((stat: any) => stat.industry === industry);
                return (
                  <div
                    key={industry}
                    className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
                    onClick={() => handleIndustrySelect(industry)}
                    data-testid={`industry-option-${industry.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <div className="font-medium text-sm group-hover:text-primary transition-colors">{industry}</div>
                    {hasData && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {hasData.totalContacts} contacts • {hasData.totalCompanies} companies
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Industry Search Results */}
      {selectedIndustry && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                Results for "{selectedIndustry}"
                {industryResults && (
                  <Badge variant="secondary" className="ml-2">
                    {industryResults.totalCompanies} companies
                  </Badge>
                )}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="text-muted-foreground">Searching companies...</div>
              </div>
            ) : industryResults && industryResults.companies.length > 0 ? (
              <div className="space-y-4">
                {industryResults.companies.map((company, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-6 hover:bg-accent transition-colors"
                    data-testid={`company-card-${index}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Company Header */}
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Building className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">
                              {company.company}
                            </h3>
                            <div className="text-sm text-muted-foreground">
                              {company.industry}
                            </div>
                          </div>
                        </div>

                        {/* Company Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                          {company.website && (
                            <div className="flex items-center text-sm">
                              <Globe className="w-4 h-4 mr-2 text-blue-500" />
                              <a
                                href={company.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {company.website}
                              </a>
                            </div>
                          )}
                          
                          {company.companySize && (
                            <div className="flex items-center text-sm">
                              <Users className="w-4 h-4 mr-2 text-green-500" />
                              <span>{company.companySize} employees</span>
                            </div>
                          )}

                          <div className="flex items-center text-sm">
                            <Users className="w-4 h-4 mr-2 text-purple-500" />
                            <span>{company.totalEmployees} contacts found</span>
                          </div>

                          {company.branchCount > 0 && (
                            <div className="flex items-center text-sm">
                              <MapPin className="w-4 h-4 mr-2 text-red-500" />
                              <span>{company.branchCount} branch locations</span>
                            </div>
                          )}
                        </div>

                        {/* Branch Addresses */}
                        {company.branches.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-foreground mb-2">
                              Branch Addresses:
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {company.branches.map((branch, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  {branch}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Employee Preview */}
                        <div>
                          <h4 className="text-sm font-medium text-foreground mb-2">
                            Employees ({company.totalEmployees}):
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {company.employees.slice(0, 6).map((employee, empIdx) => (
                              <div
                                key={empIdx}
                                className="flex items-center justify-between p-2 bg-background border rounded text-sm"
                              >
                                <div>
                                  <div className="font-medium">
                                    {employee.fullName || `${employee.firstName} ${employee.lastName}`}
                                  </div>
                                  <div className="text-muted-foreground text-xs">
                                    {employee.title || "No title"}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {employee.email && (
                                    <Badge
                                      variant={employee.emailStatus === 'VALID' ? 'default' : 'secondary'}
                                      className="text-xs"
                                    >
                                      {employee.emailStatus || 'Found'}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                            {company.employees.length > 6 && (
                              <div className="text-sm text-muted-foreground p-2">
                                +{company.employees.length - 6} more employees...
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="ml-4">
                        <Button
                          variant="outline"
                          onClick={() => onCompanySelect?.(company)}
                          data-testid={`button-select-company-${index}`}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Building className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <div className="text-muted-foreground">
                  No companies found for "{selectedIndustry}"
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Try searching for a different industry or perform some searches first
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}