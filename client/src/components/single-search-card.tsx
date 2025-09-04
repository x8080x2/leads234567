import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Search } from "lucide-react";

const singleSearchSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().min(1, "Company is required"),
});

type SingleSearchForm = z.infer<typeof singleSearchSchema>;

interface SingleSearchCardProps {
  onSearchComplete: () => void;
}

export default function SingleSearchCard({ onSearchComplete }: SingleSearchCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<SingleSearchForm>({
    resolver: zodResolver(singleSearchSchema),
    defaultValues: {
      name: "",
      company: "",
    },
  });

  const searchMutation = useMutation({
    mutationFn: async (data: SingleSearchForm) => {
      const response = await apiRequest("POST", "/api/search/single", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/searches"] });
      onSearchComplete();
      
      if (data.success) {
        toast({
          title: "Email Found Successfully",
          description: `Found email for ${data.result.name}${data.result.confidence ? ` with ${data.result.confidence}% confidence` : ""}`,
        });
      } else {
        toast({
          title: "Email Not Found",
          description: data.error || "No email was found for this contact",
          variant: "destructive",
        });
      }
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Search Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SingleSearchForm) => {
    searchMutation.mutate(data);
  };

  return (
    <Card data-testid="single-search-card">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Search className="text-primary mr-2" />
          Single Email Search
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., Alona Shalieieva"
                      data-testid="input-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., getprospect.com"
                      data-testid="input-company"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={searchMutation.isPending}
              data-testid="button-find-email"
            >
              <Search className="w-4 h-4 mr-2" />
              {searchMutation.isPending ? "Searching..." : "Find Email"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
