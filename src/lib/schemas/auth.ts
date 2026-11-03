import { z } from "zod";

const diplomaSchema = z.object({
  studyLevel: z.string().min(1),
  diploma: z.string().min(1),
  institution: z.string().min(1),
  grade: z.string().min(1),
  noteGenerale: z.string().optional(),
  graduationYear: z.number().int().min(1960),
});

const experienceSchema = z.object({
  company: z.string().min(1),
  position: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  isCurrent: z.boolean(),
  description: z.string().optional(),
});

export const candidateRegistrationSchema = z.object({
  email: z.string().email("Email must be valid"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  fullName: z.string().min(3, "Full name must be at least 3 characters"),
  cin: z
    .string()
    .length(8, "CIN must be exactly 8 digits")
    .regex(/^\d+$/, "CIN must contain only numbers"),
  dateOfBirth: z.string().refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime()) && parsed < new Date();
  }, "Date of birth must be a valid date in the past"),
  gender: z.enum(["MALE", "FEMALE"], { errorMap: () => ({ message: "Gender must be MALE or FEMALE" }) }),
  phone: z.string().regex(/^\d{8}$/, "Phone must be exactly 8 digits"),
  governorate: z.string().min(1, "Governorate is required"),
  delegation: z.string().min(1, "Delegation is required"),
  address: z.string().optional().default(""),
  smsOptIn: z.boolean().optional().default(true),
  diplomas: z.array(diplomaSchema).optional().default([]),
  hasExperience: z.boolean().optional().default(false),
  experiences: z.array(experienceSchema).optional().default([]),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const candidateLoginSchema = z.object({
  email: z.string().email("invalidEmail"),
  password: z.string().min(1, "Password is required"),
});

export const adminLoginSchema = z.object({
  email: z.string().email("invalidEmail"),
  password: z.string().min(1, "Password is required"),
});

export const verifyEmailSchema = z.object({
  candidateId: z.string().min(1, "Candidate ID is required"),
  code: z.string().length(6, "Code must be 6 digits").regex(/^\d+$/, "Code must contain only numbers"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("invalidEmail"),
});

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  code: z.string().length(6),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type CandidateRegistration = z.infer<typeof candidateRegistrationSchema>;
export type CandidateLogin = z.infer<typeof candidateLoginSchema>;
export type AdminLogin = z.infer<typeof adminLoginSchema>;
export type VerifyEmail = z.infer<typeof verifyEmailSchema>;
export type ForgotPassword = z.infer<typeof forgotPasswordSchema>;
export type ResetPassword = z.infer<typeof resetPasswordSchema>;