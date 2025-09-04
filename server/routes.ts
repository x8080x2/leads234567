import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { singleSearchSchema, insertApiConfigSchema } from "@shared/schema";
import { z } from "zod";

interface GetProspectResponse {
  email?: string;
  confidence?: number;
  title?: string;
  domain?: string;
  error?: string;
}

async function findEmailWithGetProspect(
  name: string,
  company: string,
  apiKey: string
): Promise<GetProspectResponse> {
  const url = `https://api.getprospect.com/public/v1/email/find?name=${encodeURIComponent(name)}&company=${encodeURIComponent(company)}&apiKey=${apiKey}`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Invalid API key");
      } else if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      } else if (response.status === 402) {
        throw new Error("Insufficient credits. Please upgrade your plan.");
      } else {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
    }

    const data = await response.json();
    
    // Parse GetProspect response - adjust based on actual API response format
    if (data.email) {
      return {
        email: data.email,
        confidence: data.confidence || data.score || 0,
        title: data.title || data.position,
        domain: data.domain || company,
      };
    } else {
      return {
        error: "No email found",
      };
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Save API configuration
  app.post("/api/config", async (req, res) => {
    try {
      const validatedData = insertApiConfigSchema.parse(req.body);
      const config = await storage.saveApiConfig(validatedData);
      res.json({ success: true, config: { id: config.id, isActive: config.isActive } });
    } catch (error) {
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "Invalid configuration" 
      });
    }
  });

  // Get active API configuration
  app.get("/api/config", async (req, res) => {
    try {
      const config = await storage.getActiveApiConfig();
      if (config) {
        res.json({ 
          hasApiKey: true, 
          isActive: config.isActive === "true" 
        });
      } else {
        res.json({ hasApiKey: false, isActive: false });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to get configuration" });
    }
  });

  // Single email search
  app.post("/api/search/single", async (req, res) => {
    try {
      const validatedData = singleSearchSchema.parse(req.body);
      const apiConfig = await storage.getActiveApiConfig();
      
      if (!apiConfig) {
        return res.status(400).json({ error: "API key not configured" });
      }

      const result = await findEmailWithGetProspect(
        validatedData.name,
        validatedData.company,
        apiConfig.apiKey
      );

      const searchRecord = await storage.createEmailSearch({
        name: validatedData.name,
        company: validatedData.company,
        email: result.email || null,
        confidence: result.confidence || null,
        title: result.title || null,
        domain: result.domain || null,
        status: result.error ? "not_found" : "found",
        errorMessage: result.error || null,
        searchType: "single",
        batchId: null,
      });

      res.json({
        success: !result.error,
        result: searchRecord,
        error: result.error,
      });
    } catch (error) {
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "Search failed" 
      });
    }
  });

  // Start batch processing
  app.post("/api/search/batch", async (req, res) => {
    try {
      const { fileName, contacts } = req.body;
      
      if (!Array.isArray(contacts) || contacts.length === 0) {
        return res.status(400).json({ error: "No contacts provided" });
      }

      const apiConfig = await storage.getActiveApiConfig();
      if (!apiConfig) {
        return res.status(400).json({ error: "API key not configured" });
      }

      // Create batch job
      const batchJob = await storage.createBatchJob({
        fileName,
        totalRecords: contacts.length,
        processedRecords: 0,
        successfulRecords: 0,
        status: "processing",
      });

      // Process contacts asynchronously
      setTimeout(async () => {
        let processed = 0;
        let successful = 0;

        for (const contact of contacts) {
          try {
            const validatedContact = singleSearchSchema.parse(contact);
            const result = await findEmailWithGetProspect(
              validatedContact.name,
              validatedContact.company,
              apiConfig.apiKey
            );

            await storage.createEmailSearch({
              name: validatedContact.name,
              company: validatedContact.company,
              email: result.email || null,
              confidence: result.confidence || null,
              title: result.title || null,
              domain: result.domain || null,
              status: result.error ? "not_found" : "found",
              errorMessage: result.error || null,
              searchType: "batch",
              batchId: batchJob.id,
            });

            if (!result.error) {
              successful++;
            }
            processed++;

            // Update batch job progress
            await storage.updateBatchJob(batchJob.id, {
              processedRecords: processed,
              successfulRecords: successful,
            });

            // Add delay to respect rate limits
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            processed++;
            await storage.createEmailSearch({
              name: contact.name || "Unknown",
              company: contact.company || "Unknown",
              email: null,
              confidence: null,
              title: null,
              domain: null,
              status: "error",
              errorMessage: "Invalid contact data",
              searchType: "batch",
              batchId: batchJob.id,
            });
          }
        }

        // Mark batch as completed
        await storage.updateBatchJob(batchJob.id, {
          status: "completed",
          processedRecords: processed,
          successfulRecords: successful,
        });
      }, 100);

      res.json({ 
        success: true, 
        batchId: batchJob.id,
        message: "Batch processing started" 
      });
    } catch (error) {
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "Batch processing failed" 
      });
    }
  });

  // Get search results
  app.get("/api/searches", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const searches = await storage.getEmailSearches(limit, offset);
      res.json({ searches });
    } catch (error) {
      res.status(500).json({ error: "Failed to get search results" });
    }
  });

  // Get batch job status
  app.get("/api/batch/:id", async (req, res) => {
    try {
      const job = await storage.getBatchJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: "Batch job not found" });
      }
      res.json({ job });
    } catch (error) {
      res.status(500).json({ error: "Failed to get batch job" });
    }
  });

  // Get batch results
  app.get("/api/batch/:id/results", async (req, res) => {
    try {
      const results = await storage.getEmailSearchesByBatchId(req.params.id);
      res.json({ results });
    } catch (error) {
      res.status(500).json({ error: "Failed to get batch results" });
    }
  });

  // Clear search results
  app.delete("/api/searches", async (req, res) => {
    try {
      await storage.clearEmailSearches();
      res.json({ success: true, message: "Search results cleared" });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear search results" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
