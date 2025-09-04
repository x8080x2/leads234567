import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building, Building2, Users, MapPin, Globe, Search, TrendingUp } from "lucide-react";

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

interface AvailableIndustriesResponse {
  industries: string[];
}

interface IndustryStatsResponse {
  industries: Array<{
    industry: string;
    totalContacts: number;
    totalCompanies: number;
    totalLocations: number;
    validEmails: number;
  }>;
}

export default function IndustrySearch({ onCompanySelect }: IndustrySearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("");

  // Fetch available industries from GetProspect API
  const { data: availableIndustries } = useQuery<AvailableIndustriesResponse>({
    queryKey: ["/api/industries/available"],
    enabled: !selectedIndustry,
  });

  // Fetch industry statistics from search history
  const { data: industryStats } = useQuery<IndustryStatsResponse>({
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

      {/* Available Industries from GetProspect API */}
      {!selectedIndustry && availableIndustries?.industries && (
        <Card data-testid="available-industries-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="text-primary mr-2" />
              Available Industries
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Select from {availableIndustries.industries.length} industries supported by GetProspect API
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {availableIndustries.industries.map((industry: string) => {
                const hasData = industryStats?.industries?.find((stat: any) => stat.industry === industry);
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