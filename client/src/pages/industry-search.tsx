import { useState } from "react";
import IndustrySearch from "@/components/industry-search";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function IndustrySearchPage() {
  const [, setLocation] = useLocation();
  const [selectedCompany, setSelectedCompany] = useState(null);

  const handleCompanySelect = (company: any) => {
    setSelectedCompany(company);
  };

  const goBack = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Button 
              variant="ghost" 
              onClick={goBack}
              className="mb-4"
              data-testid="button-back-to-main"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Email Finder
            </Button>
            <h1 className="text-3xl font-bold text-foreground">Industry Search</h1>
            <p className="text-muted-foreground mt-2">
              Search for companies by industry and view employee information, branch addresses, and contact details.
            </p>
          </div>
        </div>

        {/* Industry Search Component */}
        <IndustrySearch onCompanySelect={handleCompanySelect} />

        {/* Selected Company Details Modal/Panel could be added here */}
        {selectedCompany && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-background rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Company Details</h2>
                <Button 
                  variant="ghost" 
                  onClick={() => setSelectedCompany(null)}
                  data-testid="button-close-company-details"
                >
                  ×
                </Button>
              </div>
              {/* Company details would go here */}
              <pre className="text-sm bg-muted p-4 rounded overflow-x-auto">
                {JSON.stringify(selectedCompany, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}