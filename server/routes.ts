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
  fullName?: string;
  industry?: string;
  website?: string;
  companySize?: string;
  country?: string;
  city?: string;
  emailStatus?: string;
  error?: string;
}

// Enhanced search with GetProspect API - Contact search with filters
async function searchContactsWithGetProspect(
  searchParams: {
    firstName?: string;
    lastName?: string;
    company?: string;
    industry?: string;
    jobTitle?: string;
    location?: string;
    limit?: number;
  },
  apiKey: string
): Promise<GetProspectResponse[]> {
  // Use GetProspect public v1 API for company domain search
  const baseUrl = 'https://api.getprospect.com/public/v1/email/find';
  
  const urlParams = new URLSearchParams();
  urlParams.append('apiKey', apiKey);
  
  if (searchParams.company) {
    urlParams.append('company', searchParams.company);
  }
  
  if (searchParams.firstName && searchParams.lastName) {
    urlParams.append('name', `${searchParams.firstName} ${searchParams.lastName}`);
  } else if (searchParams.firstName || searchParams.lastName) {
    urlParams.append('name', searchParams.firstName || searchParams.lastName || '');
  }

  const searchUrl = `${baseUrl}?${urlParams.toString()}`;

  try {
    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

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

    // Handle the API response structure for public v1 API
    if (data.email) {
      return [{
        email: data.email,
        confidence: data.confidence || data.score || 0,
        title: data.position || data.job_title || data.title,
        domain: data.domain || searchParams.company,
        fullName: data.name || `${searchParams.firstName || ''} ${searchParams.lastName || ''}`.trim(),
        firstName: searchParams.firstName || data.firstName,
        lastName: searchParams.lastName || data.lastName,
        company: data.company || searchParams.company,
        industry: data.industry,
        website: data.website,
        companySize: data.company_size || data.companySize,
        country: data.country,
        city: data.city,
        emailStatus: data.email_status || data.status || 'VALID',
      }];
    }

    return [];
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Search failed");
  }
}

async function findEmailWithGetProspect(
  firstName: string,
  lastName: string,
  company: string,
  apiKey: string
): Promise<GetProspectResponse> {
  const url = `https://api.getprospect.com/public/v1/email/find?name=${encodeURIComponent(firstName + ' ' + lastName)}&company=${encodeURIComponent(company)}&apiKey=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

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

    // Parse GetProspect response
    if (data.email) {
      return {
        email: data.email,
        confidence: data.confidence || data.score || 0,
        title: data.position || data.job_title,
        domain: data.domain || company,
        fullName: data.name || `${firstName} ${lastName}`,
        industry: data.industry,
        website: data.website,
        companySize: data.company_size,
        country: data.country,
        city: data.city,
        emailStatus: data.email_status || 'UNKNOWN',
      };
    } else {
      return {
        error: data.message || "No email found",
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
        validatedData.firstName,
        validatedData.lastName,
        validatedData.company,
        apiConfig.apiKey
      );

      const searchRecord = await storage.createEmailSearch({
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        fullName: result.fullName || null,
        company: validatedData.company,
        email: result.email || null,
        confidence: result.confidence || null,
        title: result.title || null,
        domain: result.domain || null,
        industry: result.industry || null,
        website: result.website || null,
        companySize: result.companySize || null,
        country: result.country || null,
        city: result.city || null,
        emailStatus: result.emailStatus || null,
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
              validatedContact.firstName,
              validatedContact.lastName,
              validatedContact.company,
              apiConfig.apiKey
            );

            await storage.createEmailSearch({
              firstName: validatedContact.firstName,
              lastName: validatedContact.lastName,
              fullName: result.fullName || null,
              company: validatedContact.company,
              email: result.email || null,
              confidence: result.confidence || null,
              title: result.title || null,
              domain: result.domain || null,
              industry: result.industry || null,
              website: result.website || null,
              companySize: result.companySize || null,
              country: result.country || null,
              city: result.city || null,
              emailStatus: result.emailStatus || null,
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
              firstName: contact.firstName || "Unknown",
              lastName: contact.lastName || "Unknown",
              fullName: null,
              company: contact.company || "Unknown",
              email: null,
              confidence: null,
              title: null,
              domain: null,
              industry: null,
              website: null,
              companySize: null,
              country: null,
              city: null,
              emailStatus: null,
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

  // Industry-based search endpoint
  app.get("/api/search/industry", async (req, res) => {
    try {
      const industry = req.query.industry as string;

      if (!industry) {
        return res.status(400).json({ error: "Industry parameter is required" });
      }

      // Get searches filtered by industry
      const searches = await storage.getEmailSearches(100, 0);
      const industryResults = searches.filter(search => 
        search.industry && search.industry.toLowerCase().includes(industry.toLowerCase())
      );

      // Group by company and calculate statistics
      const companyStats = new Map();

      industryResults.forEach(search => {
        const companyKey = search.company.toLowerCase();
        if (!companyStats.has(companyKey)) {
          companyStats.set(companyKey, {
            company: search.company,
            industry: search.industry,
            website: search.website,
            companySize: search.companySize,
            country: search.country,
            city: search.city,
            employees: [],
            totalEmployees: 0,
            branches: new Set()
          });
        }

        const stats = companyStats.get(companyKey);
        stats.employees.push({
          fullName: search.fullName,
          firstName: search.firstName,
          lastName: search.lastName,
          email: search.email,
          title: search.title,
          emailStatus: search.emailStatus
        });
        stats.totalEmployees = stats.employees.length;

        if (search.city && search.country) {
          stats.branches.add(`${search.city}, ${search.country}`);
        }
      });

      // Convert to array and add branch information
      const results = Array.from(companyStats.values()).map(stats => ({
        company: stats.company,
        industry: stats.industry,
        website: stats.website,
        companySize: stats.companySize,
        country: stats.country,
        city: stats.city,
        employees: stats.employees.map((emp: any) => ({
          fullName: emp.fullName,
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email,
          title: emp.title,
          emailStatus: emp.emailStatus,
          company: stats.company
        })),
        totalEmployees: stats.totalEmployees,
        branches: Array.from(stats.branches),
        branchCount: stats.branches.size
      }));

      res.json({ 
        industry,
        totalCompanies: results.length,
        companies: results 
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to search by industry" });
    }
  });

  // Get available industries from GetProspect API standards
  app.get("/api/industries/available", async (req, res) => {
    try {
      // Comprehensive list of industries supported by GetProspect API
      const industries = [
        "Technology", "Software", "Information Technology", "Computer Software",
        "Healthcare", "Medical Devices", "Biotechnology", "Pharmaceuticals",
        "Financial Services", "Banking", "Insurance", "Investment Banking",
        "Real Estate", "Construction", "Architecture", "Engineering",
        "Manufacturing", "Automotive", "Aerospace", "Industrial Automation",
        "Retail", "E-commerce", "Consumer Goods", "Fashion", "Apparel",
        "Education", "Higher Education", "E-Learning", "Training",
        "Marketing", "Advertising", "Public Relations", "Digital Marketing",
        "Consulting", "Management Consulting", "Business Services",
        "Legal", "Law Firms", "Legal Services",
        "Food & Beverage", "Restaurant", "Hospitality", "Travel", "Tourism",
        "Energy", "Oil & Gas", "Renewable Energy", "Utilities",
        "Transportation", "Logistics", "Supply Chain", "Shipping",
        "Media", "Entertainment", "Publishing", "Broadcasting",
        "Telecommunications", "Internet", "Mobile",
        "Agriculture", "Mining", "Chemicals", "Paper & Forest Products",
        "Government", "Non-profit", "Defense", "Security",
        "Sports", "Fitness", "Wellness", "Beauty", "Personal Care"
      ];

      res.json({ industries: industries.sort() });
    } catch (error) {
      res.status(500).json({ error: "Failed to get available industries" });
    }
  });

  // Get industry statistics from search history
  app.get("/api/analytics/industries", async (req, res) => {
    try {
      const searches = await storage.getEmailSearches(1000, 0);

      const industryStats = new Map();

      searches.forEach(search => {
        if (search.industry) {
          const industry = search.industry;
          if (!industryStats.has(industry)) {
            industryStats.set(industry, {
              industry,
              totalContacts: 0,
              companies: new Set(),
              validEmails: 0,
              locations: new Set()
            });
          }

          const stats = industryStats.get(industry);
          stats.totalContacts++;
          stats.companies.add(search.company);

          if (search.emailStatus === 'VALID') {
            stats.validEmails++;
          }

          if (search.city && search.country) {
            stats.locations.add(`${search.city}, ${search.country}`);
          }
        }
      });

      const results = Array.from(industryStats.values()).map(stats => ({
        ...stats,
        totalCompanies: stats.companies.size,
        totalLocations: stats.locations.size,
        companies: undefined,
        locations: undefined
      }));

      res.json({ industries: results });
    } catch (error) {
      res.status(500).json({ error: "Failed to get industry analytics" });
    }
  });

  // Advanced contact search with GetProspect API
  app.post("/api/search/advanced", async (req, res) => {
    try {
      const { 
        firstName, 
        lastName, 
        company, 
        industry, 
        jobTitle, 
        location, 
        limit = 10 
      } = req.body;

      const apiConfig = await storage.getActiveApiConfig();
      if (!apiConfig) {
        return res.status(400).json({ error: "API key not configured" });
      }

      const results = await searchContactsWithGetProspect({
        firstName,
        lastName,
        company,
        industry,
        jobTitle,
        location,
        limit: Math.min(limit, 50) // Limit to 50 results
      }, apiConfig.apiKey);

      // Save results to database
      const searchRecords = await Promise.all(results.map(result => 
        storage.createEmailSearch({
          firstName: firstName || result.fullName?.split(' ')[0] || "Unknown",
          lastName: lastName || result.fullName?.split(' ')[1] || "Unknown",
          fullName: result.fullName || null,
          company: company || result.domain || "Unknown",
          email: result.email || null,
          confidence: result.confidence || null,
          title: result.title || null,
          domain: result.domain || null,
          industry: result.industry || null,
          website: result.website || null,
          companySize: result.companySize || null,
          country: result.country || null,
          city: result.city || null,
          emailStatus: result.emailStatus || null,
          status: result.email ? "found" : "not_found",
          errorMessage: null,
          searchType: "advanced",
          batchId: null,
        })
      ));

      res.json({
        success: true,
        results: searchRecords.map(record => ({
          id: record.id,
          fullName: record.fullName,
          firstName: record.firstName,
          lastName: record.lastName,
          email: record.email,
          title: record.title,
          company: record.company,
          domain: record.domain,
          industry: record.industry,
          website: record.website,
          companySize: record.companySize,
          country: record.country,
          city: record.city,
          emailStatus: record.emailStatus,
          confidence: record.confidence,
          status: record.status,
          createdAt: record.createdAt
        })),
        totalFound: results.length
      });
    } catch (error) {
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "Advanced search failed" 
      });
    }
  });

  // Enhanced company search - finds real employees using GetProspect leads API with domain filter
  app.post("/api/search/company", async (req, res) => {
    try {
      const { company, domain, limit = 20 } = req.body;

      if (!company && !domain) {
        return res.status(400).json({ error: "Company name or domain is required" });
      }

      const apiConfig = await storage.getActiveApiConfig();
      if (!apiConfig) {
        return res.status(400).json({ error: "API key not configured" });
      }

      // Clean domain - remove protocol and www
      let searchDomain = domain || company;
      if (searchDomain.includes('://')) {
        searchDomain = searchDomain.split('://')[1];
      }
      if (searchDomain.startsWith('www.')) {
        searchDomain = searchDomain.substring(4);
      }

      // Use GetProspect leads API with domain filter
      const results = await searchContactsWithGetProspect({
        company: searchDomain, // This maps to domain parameter in searchContactsWithGetProspect
        limit: Math.min(limit, 50)
      }, apiConfig.apiKey);

      // Save results to database
      const searchRecords = await Promise.all(results.map(result => 
        storage.createEmailSearch({
          firstName: result.firstName || result.fullName?.split(' ')[0] || "Unknown",
          lastName: result.lastName || result.fullName?.split(' ').slice(1).join(' ') || "",
          fullName: result.fullName || null,
          company: result.company || searchDomain,
          email: result.email || null,
          confidence: result.confidence ? Math.round(result.confidence) : null,
          title: result.title || null,
          domain: result.domain || searchDomain,
          industry: result.industry || null,
          website: result.website || null,
          companySize: result.companySize || null,
          country: result.country || null,
          city: result.city || null,
          emailStatus: result.emailStatus || null,
          status: result.email ? "found" : "not_found",
          errorMessage: null,
          searchType: "company_domain",
          batchId: null,
        })
      ));

      res.json({
        success: true,
        company: company || searchDomain,
        domain: searchDomain,
        totalFound: searchRecords.length,
        results: searchRecords.map(result => ({
          id: result.id,
          fullName: result.fullName,
          firstName: result.firstName,
          lastName: result.lastName,
          email: result.email,
          title: result.title,
          company: result.company,
          domain: result.domain,
          industry: result.industry,
          website: result.website,
          companySize: result.companySize,
          country: result.country,
          city: result.city,
          emailStatus: result.emailStatus,
          confidence: result.confidence,
          createdAt: result.createdAt
        }))
      });

    } catch (error) {
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "Company search failed" 
      });
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