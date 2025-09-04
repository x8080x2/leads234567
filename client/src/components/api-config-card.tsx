import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Key, Eye, EyeOff, Save } from "lucide-react";

const apiConfigSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
});

type ApiConfigForm = z.infer<typeof apiConfigSchema>;

export default function ApiConfigCard() {
  const [showApiKey, setShowApiKey] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: configData } = useQuery({
    queryKey: ["/api/config"],
  });

  const form = useForm<ApiConfigForm>({
    resolver: zodResolver(apiConfigSchema),
    defaultValues: {
      apiKey: "",
    },
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (data: ApiConfigForm) => {
      const response = await apiRequest("POST", "/api/config", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/config"] });
      toast({
        title: "Configuration Saved",
        description: "Your API key has been saved successfully.",
      });
      form.reset({ apiKey: "" });
    },
    onError: (error: Error) => {
      toast({
        title: "Configuration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ApiConfigForm) => {
    saveConfigMutation.mutate(data);
  };

  return (
    <Card data-testid="api-config-card">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Key className="text-primary mr-2" />
          API Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showApiKey ? "text" : "password"}
                        placeholder="Enter your GetProspect API key"
                        data-testid="input-api-key"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowApiKey(!showApiKey)}
                        data-testid="button-toggle-api-key"
                      >
                        {showApiKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    Your API key is stored securely and encrypted
                  </p>
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full" 
              disabled={saveConfigMutation.isPending}
              data-testid="button-save-config"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveConfigMutation.isPending ? "Saving..." : "Save Configuration"}
            </Button>
          </form>
        </Form>

        {configData?.hasApiKey && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
            <p className="text-sm text-green-800 dark:text-green-200">
              ✓ API key configured and ready to use
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
