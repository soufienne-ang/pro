import { z } from "zod";

export const createJobSchema = z.object({
  code: z.string().min(1, "Job code is required").max(20),
  titleFr: z.string().min(1, "French title is required").max(200),
  titleAr: z.string().min(1, "Arabic title is required").max(200),
  descriptionFr: z.string().max(10000).optional().default(""),
  descriptionAr: z.string().max(10000).optional().default(""),
  location: z.string().max(200).optional().default(""),
  jobType: z.string().max(100).optional().default(""),
  openings: z.coerce.number().int().positive().optional().default(1),
  deadline: z.string().refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime()) && parsed > new Date();
  }, "Deadline must be a valid future date"),
  requiredDocs: z.string().max(5000).optional().default(""),
  exclusionConditions: z.string().max(10000).optional().default(""),
  pdfUrl: z.string().url().nullable().optional().default(null),
  imageUrl: z.string().url().nullable().optional().default(null),
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED"]).optional().default("DRAFT"),
});

export const updateJobSchema = createJobSchema.partial();

export const applicationFilterSchema = z.object({
  jobId: z.string().optional(),
  status: z.enum(["DRAFT", "PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "ORAL_TEST", "FINAL_LIST"]).optional(),
  governorate: z.string().optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const scoringExportSchema = z.object({
  jobId: z.string(),
  status: z.enum(["DRAFT", "PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "ORAL_TEST", "FINAL_LIST"]).optional(),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type ApplicationFilterInput = z.infer<typeof applicationFilterSchema>;
export type ScoringExportInput = z.infer<typeof scoringExportSchema>;
