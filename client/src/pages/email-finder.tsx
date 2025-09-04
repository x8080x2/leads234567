import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import ApiConfigCard from "@/components/api-config-card";
import SingleSearchCard from "@/components/single-search-card";
import BatchSearchCard from "@/components/batch-search-card";
import ResultsTable from "@/components/results-table";
import SearchHistory from "@/components/search-history";
import { Settings, Mail, CreditCard } from "lucide-react";

export default function EmailFinder() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { data: configData } = useQuery({
    queryKey: ["/api/config"],
  });

  const { data: searchData, refetch: refetchSearches } = useQuery({
    queryKey: ["/api/searches", refreshTrigger],
  });

  const handleSearchComplete = () => {
    setRefreshTrigger(prev => prev + 1);
    refetchSearches();
  };

  return (
    <div className="min-h-screen bg-background" data-testid="email-finder-page">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
                <Mail className="text-primary-foreground text-lg" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground" data-testid="page-title">
                  GetProspect Email Finder
                </h1>
                <p className="text-sm text-muted-foreground">
                  Professional B2B email discovery tool
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground flex items-center">
                  <CreditCard className="w-4 h-4 mr-1" />
                  API Ready
                </p>
                <p className="text-xs text-muted-foreground">
                  {configData?.hasApiKey ? "Configured" : "Not configured"}
                </p>
              </div>
              <button 
                className="p-2 rounded-lg hover:bg-accent transition-colors"
                data-testid="settings-button"
              >
                <Settings className="text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Search Panel */}
          <div className="lg:col-span-1 space-y-6">
            <ApiConfigCard />
            <SingleSearchCard onSearchComplete={handleSearchComplete} />
            <BatchSearchCard onBatchComplete={handleSearchComplete} />
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2">
            <ResultsTable 
              searches={searchData?.searches || []} 
              refreshTrigger={refreshTrigger}
              onRefresh={handleSearchComplete}
            />
          </div>
        </div>

        {/* Search History */}
        <SearchHistory searches={searchData?.searches || []} />
      </main>
    </div>
  );
}
