export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  profile?: UserProfile;
  maxTables?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfile {
  dateOfBirth?: Date;
  gender?: string;
  nationality?: string;
  address?: Address;
  emergencyContact?: EmergencyContact;
  employeeId?: string;
  department?: string;
  position?: string;
  salary?: Salary;
  bankDetails?: BankDetails;
  documents?: Document[];
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface EmergencyContact {
  name?: string;
  relationship?: string;
  phone?: string;
}

export interface Salary {
  amount?: number;
  currency?: string;
  frequency?: string;
}

export interface BankDetails {
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  branchCode?: string;
}

export interface Document {
  type: string;
  name: string;
  url: string;
  uploadedAt: Date;
}

export interface TeamMember extends User {
  department?: string;
  position?: string;
  joinDate?: Date;
  performanceScore?: number;
}