import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { exportToCsv } from "@/lib/csv-utils";
import { Table, Trash2, Download, Copy, CheckCircle, Plus, Activity, User } from "lucide-react";
import type { EmailSearch } from "@shared/schema";

interface ResultsTableProps {
  searches: EmailSearch[];
  refreshTrigger: number;
  onRefresh: () => void;
}

export default function ResultsTable({ searches, refreshTrigger, onRefresh }: ResultsTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const clearMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/searches");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/searches"] });
      onRefresh();
      toast({
        title: "Results Cleared",
        description: "All search results have been cleared.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Clear Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleExportCsv = () => {
    if (searches.length === 0) {
      toast({
        title: "No Data to Export",
        description: "Perform some searches first to export results.",
        variant: "destructive",
      });
      return;
    }

    const csvData = searches.map(search => ({
      full_name: search.fullName || `${search.firstName} ${search.lastName}`,
      first_name: search.firstName,
      last_name: search.lastName,
      company: search.company,
      email: search.email || "",
      confidence: search.confidence || "",
      title: search.title || "",
      domain: search.domain || "",
      industry: search.industry || "",
      website: search.website || "",
      company_size: search.companySize || "",
      country: search.country || "",
      city: search.city || "",
      email_status: search.emailStatus || "",
      status: search.status,
      search_date: search.createdAt ? (typeof search.createdAt === 'string' ? search.createdAt.split('T')[0] : search.createdAt.toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
    }));

    exportToCsv(csvData, `email-search-results-${new Date().toISOString().split('T')[0]}.csv`);

    toast({
      title: "Export Successful",
      description: `Exported ${searches.length} search results to CSV.`,
    });
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${type} copied to clipboard`,
        duration: 2000,
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    if (!firstName || !lastName) return "??";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getConfidenceBadge = (search: EmailSearch) => {
    if (search.status === "not_found" || search.status === "error") {
      return (
        <Badge variant="destructive" className="text-xs">
          {search.status === "error" ? "Error" : "Not Found"}
        </Badge>
      );
    }

    if (!search.confidence) {
      return (
        <Badge variant="secondary" className="text-xs">
          Unknown
        </Badge>
      );
    }

    if (search.confidence >= 80) {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">
          {search.confidence}% High
        </Badge>
      );
    } else if (search.confidence >= 50) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs">
          {search.confidence}% Medium
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs">
          {search.confidence}% Low
        </Badge>
      );
    }
  };

  return (
    <Card data-testid="results-table">
      {/* Status Bar */}
      <div className="bg-card rounded-t-lg border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-foreground">API Connected</span>
            </div>
            <div className="text-sm text-muted-foreground">
              <Activity className="w-4 h-4 inline mr-1" />
              Ready for searches
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Last updated:</span>
            <span className="text-sm font-medium text-foreground">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Table className="text-primary mr-2" />
            Search Results
            <Badge variant="secondary" className="ml-2">
              {searches.length} found
            </Badge>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearMutation.mutate()}
              disabled={clearMutation.isPending || searches.length === 0}
              data-testid="button-clear-results"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Clear
            </Button>
            <Button
              size="sm"
              onClick={handleExportCsv}
              disabled={searches.length === 0}
              data-testid="button-export-csv"
            >
              <Download className="w-4 h-4 mr-1" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Company Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {searches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <div className="text-muted-foreground">
                      <Table className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No search results yet</p>
                      <p className="text-xs">Start by searching for an email above</p>
                    </div>
                  </td>
                </tr>
              ) : (
                searches.map((search) => (
                  <tr
                    key={search.id}
                    className="hover:bg-accent transition-colors"
                    data-testid={`row-search-${search.id}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground">
                            {search.fullName || `${search.firstName} ${search.lastName}`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {search.title || (search.fullName && search.fullName !== `${search.firstName} ${search.lastName}` ? search.fullName : "Employee")}
                          </div>
                          {search.industry && (
                            <div className="text-xs text-blue-600 dark:text-blue-400">
                              {search.industry}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {search.email ? (
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-foreground font-mono">
                              {search.email}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => copyToClipboard(search.email!, "Email")}
                              data-testid={`button-copy-email-${search.id}`}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          {search.emailStatus && (
                            <div className="mt-1">
                              <Badge
                                variant={search.emailStatus === 'VALID' ? 'default' : 'secondary'}
                                className={`text-xs ${
                                  search.emailStatus === 'VALID'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                }`}
                              >
                                {search.emailStatus}
                              </Badge>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {search.errorMessage || "No email found"}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-foreground font-medium">{search.company}</div>
                      <div className="text-xs text-muted-foreground">
                        {search.domain || search.company}
                      </div>
                      {search.website && (
                        <div className="text-xs text-blue-600 dark:text-blue-400">
                          {search.website}
                        </div>
                      )}
                      {search.companySize ? (
                        <div className="text-xs text-green-600 dark:text-green-400">
                          {search.companySize} employees
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          Size unknown
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {search.city && search.country ? (
                        <div>
                          <div className="text-sm text-foreground">{search.city}</div>
                          <div className="text-xs text-muted-foreground">{search.country}</div>
                        </div>
                      ) : search.domain ? (
                        <div>
                          <div className="text-sm text-foreground">{search.domain}</div>
                          <div className="text-xs text-muted-foreground">Domain based</div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Location not available</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {getConfidenceBadge(search)}
                        {search.emailStatus && (
                          <Badge
                            variant={search.emailStatus === 'VALID' ? 'default' : 'secondary'}
                            className={`text-xs ${
                              search.emailStatus === 'VALID'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                            }`}
                          >
                            {search.emailStatus}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        {search.email && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              data-testid={`button-verify-email-${search.id}`}
                            >
                              <CheckCircle className="h-4 w-4 text-primary" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              data-testid={`button-add-to-list-${search.id}`}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {searches.length > 0 && (
          <div className="px-6 py-3 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing <span className="font-medium">1</span> to{" "}
                <span className="font-medium">{searches.length}</span> of{" "}
                <span className="font-medium">{searches.length}</span> results
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  data-testid="button-previous-page"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  data-testid="button-next-page"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}