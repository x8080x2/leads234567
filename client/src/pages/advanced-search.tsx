import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AdvancedSearch from "@/components/advanced-search";
import { ArrowLeft, Search, Building, Target } from "lucide-react";

export default function AdvancedSearchPage() {
  const [location, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Navigation Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => navigate("/")} className="p-2">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Advanced Search</h1>
                <p className="text-muted-foreground">
                  Use multiple filters to find contacts with GetProspect API
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-2">
            <Link href="/">
              <Button variant={location === "/" ? "default" : "outline"} size="sm">
                <Search className="w-4 h-4 mr-2" />
                Email Finder
              </Button>
            </Link>
            <Link href="/industry-search">
              <Button variant={location === "/industry-search" ? "default" : "outline"} size="sm">
                <Building className="w-4 h-4 mr-2" />
                Industry Search
              </Button>
            </Link>
            <Link href="/advanced-search">
              <Button variant={location === "/advanced-search" ? "default" : "outline"} size="sm">
                <Target className="w-4 h-4 mr-2" />
                Advanced Search
              </Button>
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <AdvancedSearch />
      </div>
    </div>
  );
}