import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, RotateCcw, Download } from "lucide-react";
import type { EmailSearch } from "@shared/schema";

interface SearchHistoryProps {
  searches: EmailSearch[];
}

export default function SearchHistory({ searches }: SearchHistoryProps) {
  const recentSearches = searches
    .slice(0, 5)
    .filter((search, index, self) => 
      index === self.findIndex(s => 
        s.firstName === search.firstName && 
        s.lastName === search.lastName && 
        s.company === search.company
      )
    );

  const formatTimeAgo = (date: Date | string) => {
    const now = new Date();
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const diffInHours = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }
  };

  const getStatusBadge = (search: EmailSearch) => {
    if (search.status === "found") {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">
          Found
        </Badge>
      );
    } else if (search.status === "not_found") {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs">
          Not Found
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive" className="text-xs">
          Error
        </Badge>
      );
    }
  };

  if (recentSearches.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <Card data-testid="search-history">
        <CardHeader>
          <CardTitle className="flex items-center">
            <History className="text-primary mr-2" />
            Recent Searches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentSearches.map((search) => (
              <div 
                key={search.id} 
                className="flex items-center justify-between p-3 bg-accent rounded-lg"
                data-testid={`history-item-${search.id}`}
              >
                <div className="flex items-center space-x-3">
                  <div className="text-sm">
                    <span className="font-medium text-foreground">
                      {search.firstName} {search.lastName} @ {search.company}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      {formatTimeAgo(search.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(search)}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    data-testid={`button-repeat-search-${search.id}`}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
