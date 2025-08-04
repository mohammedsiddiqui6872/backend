import { z } from 'zod';

// Address schema
export const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
});

// Emergency contact schema
export const emergencyContactSchema = z.object({
  name: z.string().optional(),
  relationship: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
});

// Salary schema
export const salarySchema = z.object({
  amount: z.number().min(0).optional(),
  currency: z.string().default('AED'),
  type: z.enum(['monthly', 'hourly', 'daily']).optional(),
});

// Bank details schema
export const bankDetailsSchema = z.object({
  accountName: z.string().optional(),
  accountNumber: z.string().optional(),
  bankName: z.string().optional(),
  iban: z.string().optional(),
});

// Document schema
export const documentSchema = z.object({
  type: z.string(),
  name: z.string(),
  url: z.string().url(),
  uploadedAt: z.string().datetime(),
  expiryDate: z.string().datetime().optional(),
});

// Team member schema
export const teamMemberSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  role: z.enum(['admin', 'manager', 'chef', 'sous_chef', 'line_cook', 'waiter', 'cashier', 'host', 'bartender', 'cleaner']),
  phone: z.string().optional(),
  isActive: z.boolean().default(true),
  profile: z.object({
    dateOfBirth: z.string().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    nationality: z.string().optional(),
    address: addressSchema.optional(),
    emergencyContact: emergencyContactSchema.optional(),
    employeeId: z.string().optional(),
    department: z.string().optional(),
    position: z.string().optional(),
    joiningDate: z.string().optional(),
    salary: salarySchema.optional(),
    bankDetails: bankDetailsSchema.optional(),
    documents: z.array(documentSchema).optional(),
  }).optional(),
});

// Create team member schema (requires password)
export const createTeamMemberSchema = teamMemberSchema.extend({
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// Update team member schema (password optional)
export const updateTeamMemberSchema = teamMemberSchema;

// Search/filter schema
export const teamFilterSchema = z.object({
  search: z.string().optional(),
  role: z.string().optional(),
  department: z.string().optional(),
  isActive: z.boolean().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

export type TeamMember = z.infer<typeof teamMemberSchema>;
export type CreateTeamMember = z.infer<typeof createTeamMemberSchema>;
export type UpdateTeamMember = z.infer<typeof updateTeamMemberSchema>;
export type TeamFilter = z.infer<typeof teamFilterSchema>;