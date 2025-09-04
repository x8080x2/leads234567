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

async function findEmailWithGetProspect(
  firstName: string,
  lastName: string,
  company: string,
  apiKey: string
): Promise<GetProspectResponse> {
  const name = `${firstName} ${lastName}`;
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
        fullName: data.full_name || data.fullName || `${firstName} ${lastName}`,
        industry: data.industry,
        website: data.website,
        companySize: data.company_size || data.companySize,
        country: data.country,
        city: data.city,
        emailStatus: data.email_status || data.emailStatus || 'UNKNOWN',
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
        ...stats,
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

  // Get available industries from GetProspect API by testing their search endpoint
  app.get("/api/industries/available", async (req, res) => {
    try {
      const apiConfig = await storage.getActiveApiConfig();
      
      if (!apiConfig) {
        // Return basic B2B industries if no API key configured
        const basicIndustries = [
          "Accounting", "Advertising", "Agriculture", "Airlines", "Apparel & Fashion",
          "Automotive", "Banking", "Biotechnology", "Broadcasting", "Building Materials",
          "Business Supplies", "Chemicals", "Computer Hardware", "Computer Software",
          "Construction", "Consumer Electronics", "Consumer Goods", "Consulting",
          "Defense & Space", "Design", "E-Learning", "Education Management",
          "Electrical/Electronic Manufacturing", "Entertainment", "Environmental Services",
          "Events Services", "Financial Services", "Food & Beverages", "Government Administration",
          "Government Relations", "Graphic Design", "Health, Wellness and Fitness",
          "Healthcare", "Higher Education", "Hospitality", "Human Resources",
          "Information Technology", "Insurance", "Internet", "Investment Banking",
          "Legal Services", "Logistics", "Management Consulting", "Manufacturing",
          "Marketing", "Media Production", "Medical Devices", "Mining & Metals",
          "Non-Profit Organization Management", "Oil & Energy", "Online Media",
          "Pharmaceuticals", "Public Relations", "Real Estate", "Retail",
          "Semiconductors", "Telecommunications", "Textiles", "Transportation",
          "Travel & Tourism", "Utilities", "Venture Capital", "Wholesale"
        ];
        return res.json({ industries: basicIndustries });
      }

      // Test common industries with GetProspect's search API to see which ones return results
      const testIndustries = [
        "Technology", "Healthcare", "Finance", "Manufacturing", "Retail",
        "Education", "Construction", "Transportation", "Energy", "Media",
        "Government", "Non-profit", "Legal", "Consulting", "Real Estate",
        "Automotive", "Aerospace", "Agriculture", "Mining", "Utilities"
      ];

      const workingIndustries = [];
      
      // Test a few industries by trying to search with them
      for (const industry of testIndustries.slice(0, 5)) { // Limit to avoid rate limits
        try {
          // Try to search for companies in this industry using GetProspect
          const searchUrl = `https://api.getprospect.com/public/v1/search?industry=${encodeURIComponent(industry)}&limit=1&apiKey=${apiConfig.apiKey}`;
          
          const response = await fetch(searchUrl);
          if (response.ok) {
            const data = await response.json();
            if (data && (data.results || data.companies || data.data)) {
              workingIndustries.push(industry);
            }
          }
        } catch (error) {
          // Industry test failed, skip it
          continue;
        }
        
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // If we found working industries, return them along with common ones
      if (workingIndustries.length > 0) {
        const allIndustries = Array.from(new Set([...workingIndustries, ...testIndustries]));
        res.json({ industries: allIndustries.sort() });
      } else {
        // Fallback to comprehensive industry list based on GetProspect's documented filters
        const getProspectIndustries = [
          "Accounting", "Advertising", "Aerospace", "Agriculture", "Airlines",
          "Alternative Medicine", "Animation", "Apparel & Fashion", "Architecture & Planning",
          "Arts and Crafts", "Automotive", "Aviation & Aerospace", "Banking",
          "Biotechnology", "Broadcast Media", "Building Materials", "Business Supplies",
          "Capital Markets", "Chemicals", "Civic & Social Organization", "Civil Engineering",
          "Commercial Real Estate", "Computer & Network Security", "Computer Games",
          "Computer Hardware", "Computer Networking", "Computer Software", "Construction",
          "Consumer Electronics", "Consumer Goods", "Consumer Services", "Cosmetics",
          "Dairy", "Defense & Space", "Design", "Education Management", "E-Learning",
          "Electrical/Electronic Manufacturing", "Entertainment", "Environmental Services",
          "Events Services", "Executive Office", "Facilities Services", "Farming",
          "Financial Services", "Fine Art", "Fishery", "Food & Beverages", "Food Production",
          "Fund-Raising", "Furniture", "Gambling & Casinos", "Glass, Ceramics & Concrete",
          "Government Administration", "Government Relations", "Graphic Design",
          "Health, Wellness and Fitness", "Healthcare", "Higher Education", "Hospital & Health Care",
          "Hospitality", "Human Resources", "Import and Export", "Individual & Family Services",
          "Industrial Automation", "Information Services", "Information Technology",
          "Insurance", "International Affairs", "International Trade", "Internet",
          "Investment Banking", "Investment Management", "Judiciary", "Law Enforcement",
          "Legal Services", "Leisure, Travel & Tourism", "Libraries", "Logistics",
          "Luxury Goods & Jewelry", "Machinery", "Management Consulting", "Maritime",
          "Marketing", "Market Research", "Mechanical or Industrial Engineering", "Media Production",
          "Medical Devices", "Medical Practice", "Mental Health Care", "Military",
          "Mining & Metals", "Motion Pictures and Film", "Museums and Institutions",
          "Music", "Nanotechnology", "Newspapers", "Non-Profit Organization Management",
          "Nuclear Energy", "Nursing Care", "Oil & Energy", "Online Media", "Outsourcing",
          "Package/Freight Delivery", "Packaging and Containers", "Paper & Forest Products",
          "Performing Arts", "Pharmaceuticals", "Philanthropy", "Photography", "Plastics",
          "Political Organization", "Primary/Secondary Education", "Printing", "Professional Training",
          "Program Development", "Public Policy", "Public Relations", "Public Safety",
          "Publishing", "Railroad Manufacture", "Ranching", "Real Estate", "Recreational Facilities",
          "Religious Institutions", "Renewables & Environment", "Research", "Restaurants",
          "Retail", "Security and Investigations", "Semiconductors", "Shipbuilding",
          "Sporting Goods", "Sports", "Staffing and Recruiting", "Supermarkets",
          "Telecommunications", "Textiles", "Think Tanks", "Tobacco", "Translation and Localization",
          "Transportation", "Utilities", "Venture Capital", "Veterinary", "Warehousing",
          "Wholesale", "Wine and Spirits", "Wireless", "Writing and Editing"
        ];
        
        res.json({ industries: getProspectIndustries });
      }
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
