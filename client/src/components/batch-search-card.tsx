import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { parseCsvFile } from "@/lib/csv-utils";
import { Upload, Play, List } from "lucide-react";

interface BatchSearchCardProps {
  onBatchComplete: () => void;
}

export default function BatchSearchCard({ onBatchComplete }: BatchSearchCardProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedContacts, setParsedContacts] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const batchMutation = useMutation({
    mutationFn: async (data: { fileName: string; contacts: any[] }) => {
      const response = await apiRequest("POST", "/api/search/batch", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/searches"] });
      onBatchComplete();
      
      toast({
        title: "Batch Processing Started",
        description: `Processing ${parsedContacts.length} contacts. Check results table for progress.`,
      });
      
      setSelectedFile(null);
      setParsedContacts([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Batch Processing Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Invalid File Type",
        description: "Please select a CSV file.",
        variant: "destructive",
      });
      return;
    }

    try {
      const contacts = await parseCsvFile(file);
      setSelectedFile(file);
      setParsedContacts(contacts);
      
      toast({
        title: "File Loaded Successfully",
        description: `Found ${contacts.length} contacts in the CSV file.`,
      });
    } catch (error) {
      toast({
        title: "File Parse Error",
        description: error instanceof Error ? error.message : "Failed to parse CSV file",
        variant: "destructive",
      });
    }
  };

  const handleStartBatch = () => {
    if (!selectedFile || parsedContacts.length === 0) {
      toast({
        title: "No File Selected",
        description: "Please select and load a CSV file first.",
        variant: "destructive",
      });
      return;
    }

    batchMutation.mutate({
      fileName: selectedFile.name,
      contacts: parsedContacts,
    });
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card data-testid="batch-search-card">
      <CardHeader>
        <CardTitle className="flex items-center">
          <List className="text-primary mr-2" />
          Batch Processing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Upload CSV File
          </label>
          <div 
            className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={triggerFileUpload}
            data-testid="file-upload-area"
          >
            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-2">
              Drop CSV file here or click to browse
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileSelect}
              data-testid="input-csv-file"
            />
            <Button 
              variant="outline" 
              size="sm"
              type="button"
              data-testid="button-choose-file"
            >
              Choose File
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            CSV should contain: first_name, last_name, company columns
          </p>
        </div>

        {selectedFile && (
          <div className="p-3 bg-accent rounded-lg">
            <p className="text-sm font-medium text-foreground">
              {selectedFile.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {parsedContacts.length} contacts ready for processing
            </p>
          </div>
        )}

        <Button 
          className="w-full" 
          onClick={handleStartBatch}
          disabled={!selectedFile || parsedContacts.length === 0 || batchMutation.isPending}
          data-testid="button-start-batch"
        >
          <Play className="w-4 h-4 mr-2" />
          {batchMutation.isPending ? "Starting..." : "Start Batch Processing"}
        </Button>
      </CardContent>
    </Card>
  );
}
