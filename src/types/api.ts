export interface AuthUser {
  id: number;
  name: string;
  surname: string;
  email: string;
  phone: string;
  role?: string;
  userType?: 'LANDLORD' | 'TENANT' | string;
  credit: number;
}

export interface Property {
  id: number;
  name: string;
  address?: string | null;
  apartmentCount: number;
  apartments?: Apartment[];
}

export interface Apartment {
  id: number;
  doorNumber?: string | null;
  floor?: string | null;
  roomCount?: string | null;
  property?: Property | null;
  isOccupied: boolean;
  tenantId?: number | null;
  tenantName?: string | null;
}

export interface Payment {
  id: number;
  tenantId?: number;
  month: number;
  amount: number;
  isPaid: boolean;
  paidAmount?: number | null;
  paymentDate?: string | null;
}

export interface Tenant {
  id: number;
  type: number | string; // 1 / 'HOUSE' | 2 / 'WORKPLACE'
  name: string;
  surname: string;
  address?: string | null;
  contractDuration: number;
  phone?: string | null;
  rentAmount: number;
  depositAmount: number;
  startDate: string;
  description?: string | null;
  isArchived: boolean;
  isLocked?: boolean;
  payments: Payment[];
  apartment?: Apartment | null;
}

export interface UpcomingPaymentStat {
  id: number;
  tenantName: string;
  amount: number;
  paymentDate: string;
  daysUntilDue: number;
}

export interface FinancialMetrics {
  totalDue: number;
  totalPaid: number;
  outstandingBalance: number;
  monthlyPotentialIncome: number;
  annualProjectedRevenue: number;
}

export interface UserStatsResponse {
  summary?: {
    totalIncome?: number;
    averageRent?: number;
    collectionRate?: number;
    occupancyRate?: number;
    activeTenants?: number;
    totalTenants?: number;
  };
  upcomingPayments?: UpcomingPaymentStat[];
  financialMetrics?: FinancialMetrics;
}

export interface UserSession {
  id: string;
  deviceName?: string | null;
  platform?: string | null;
  osVersion?: string | null;
  ipAddress?: string | null;
  lastActiveAt?: string | null;
  createdAt?: string | null;
  current?: boolean;
}
