import { type EmailSearch, type InsertEmailSearch, type ApiConfig, type InsertApiConfig, type BatchJob, type InsertBatchJob } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Email searches
  createEmailSearch(search: InsertEmailSearch): Promise<EmailSearch>;
  getEmailSearches(limit?: number, offset?: number): Promise<EmailSearch[]>;
  getEmailSearchesByBatchId(batchId: string): Promise<EmailSearch[]>;
  clearEmailSearches(): Promise<void>;

  // API configuration
  saveApiConfig(config: InsertApiConfig): Promise<ApiConfig>;
  getActiveApiConfig(): Promise<ApiConfig | undefined>;

  // Batch jobs
  createBatchJob(job: InsertBatchJob): Promise<BatchJob>;
  getBatchJob(id: string): Promise<BatchJob | undefined>;
  updateBatchJob(id: string, updates: Partial<BatchJob>): Promise<BatchJob | undefined>;
  getBatchJobs(limit?: number): Promise<BatchJob[]>;
}

export class MemStorage implements IStorage {
  private emailSearches: Map<string, EmailSearch>;
  private apiConfigs: Map<string, ApiConfig>;
  private batchJobs: Map<string, BatchJob>;

  constructor() {
    this.emailSearches = new Map();
    this.apiConfigs = new Map();
    this.batchJobs = new Map();
  }

  async createEmailSearch(insertSearch: InsertEmailSearch): Promise<EmailSearch> {
    const id = randomUUID();
    const search: EmailSearch = {
      ...insertSearch,
      id,
      createdAt: new Date(),
      title: insertSearch.title || null,
      email: insertSearch.email || null,
      confidence: insertSearch.confidence || null,
      domain: insertSearch.domain || null,
      errorMessage: insertSearch.errorMessage || null,
      batchId: insertSearch.batchId || null,
    };
    this.emailSearches.set(id, search);
    return search;
  }

  async getEmailSearches(limit = 50, offset = 0): Promise<EmailSearch[]> {
    const searches = Array.from(this.emailSearches.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);
    return searches;
  }

  async getEmailSearchesByBatchId(batchId: string): Promise<EmailSearch[]> {
    return Array.from(this.emailSearches.values())
      .filter(search => search.batchId === batchId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async clearEmailSearches(): Promise<void> {
    this.emailSearches.clear();
  }

  async saveApiConfig(insertConfig: InsertApiConfig): Promise<ApiConfig> {
    // Deactivate existing configs
    this.apiConfigs.forEach(config => {
      config.isActive = "false";
    });

    const id = randomUUID();
    const config: ApiConfig = {
      ...insertConfig,
      id,
      createdAt: new Date(),
      isActive: insertConfig.isActive || "true",
    };
    this.apiConfigs.set(id, config);
    return config;
  }

  async getActiveApiConfig(): Promise<ApiConfig | undefined> {
    return Array.from(this.apiConfigs.values()).find(config => config.isActive === "true");
  }

  async createBatchJob(insertJob: InsertBatchJob): Promise<BatchJob> {
    const id = randomUUID();
    const job: BatchJob = {
      ...insertJob,
      id,
      createdAt: new Date(),
      completedAt: null,
      processedRecords: insertJob.processedRecords || 0,
      successfulRecords: insertJob.successfulRecords || 0,
    };
    this.batchJobs.set(id, job);
    return job;
  }

  async getBatchJob(id: string): Promise<BatchJob | undefined> {
    return this.batchJobs.get(id);
  }

  async updateBatchJob(id: string, updates: Partial<BatchJob>): Promise<BatchJob | undefined> {
    const job = this.batchJobs.get(id);
    if (!job) return undefined;

    const updatedJob = { ...job, ...updates };
    if (updates.status === 'completed' || updates.status === 'failed') {
      updatedJob.completedAt = new Date();
    }
    
    this.batchJobs.set(id, updatedJob);
    return updatedJob;
  }

  async getBatchJobs(limit = 10): Promise<BatchJob[]> {
    return Array.from(this.batchJobs.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
}

export const storage = new MemStorage();
