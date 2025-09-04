import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const emailSearches = pgTable("email_searches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  fullName: text("full_name"),
  company: text("company").notNull(),
  email: text("email"),
  confidence: integer("confidence"),
  title: text("title"),
  domain: text("domain"),
  industry: text("industry"),
  website: text("website"),
  companySize: text("company_size"),
  country: text("country"),
  city: text("city"),
  emailStatus: text("email_status"), // 'VALID', 'INVALID', 'UNKNOWN'
  status: text("status").notNull(), // 'found', 'not_found', 'error'
  errorMessage: text("error_message"),
  searchType: text("search_type").notNull(), // 'single', 'batch'
  batchId: text("batch_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const apiConfig = pgTable("api_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  apiKey: text("api_key").notNull(),
  isActive: text("is_active").default("true").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const batchJobs = pgTable("batch_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fileName: text("file_name").notNull(),
  totalRecords: integer("total_records").notNull(),
  processedRecords: integer("processed_records").default(0).notNull(),
  successfulRecords: integer("successful_records").default(0).notNull(),
  status: text("status").notNull(), // 'pending', 'processing', 'completed', 'failed', 'cancelled'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertEmailSearchSchema = createInsertSchema(emailSearches).omit({
  id: true,
  createdAt: true,
});

export const insertApiConfigSchema = createInsertSchema(apiConfig).omit({
  id: true,
  createdAt: true,
});

export const insertBatchJobSchema = createInsertSchema(batchJobs).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const singleSearchSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  company: z.string().min(1, "Company is required"),
});

export type EmailSearch = typeof emailSearches.$inferSelect;
export type InsertEmailSearch = z.infer<typeof insertEmailSearchSchema>;
export type ApiConfig = typeof apiConfig.$inferSelect;
export type InsertApiConfig = z.infer<typeof insertApiConfigSchema>;
export type BatchJob = typeof batchJobs.$inferSelect;
export type InsertBatchJob = z.infer<typeof insertBatchJobSchema>;
export type SingleSearchRequest = z.infer<typeof singleSearchSchema>;
