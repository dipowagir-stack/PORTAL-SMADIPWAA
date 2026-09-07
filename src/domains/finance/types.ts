export interface FinanceBilling {
  id?: string;
  type: 'spp' | 'gedung' | 'seragam' | 'buku' | 'kegiatan' | 'other';
  title: string;
  amount: number;
  targetType: 'all' | 'class' | 'student';
  targetValue: string; // 'all' or classId or studentId
  dueDate: number;
  academicYear?: string; // legacy
  semester?: number; // legacy
  academicYearId?: string;
  semesterId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface FinancePayment {
  id?: string;
  billingId: string;
  billingEventTitle?: string;
  invoiceId?: string;
  studentId: string;
  studentName?: string;
  nisn?: string;
  studentClass?: string;
  isInstallment?: boolean;
  amount: number;
  method: 'transfer' | 'cash' | 'qris';
  proofUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  recordedBy?: string; // admin/bendahara name
  month?: string;
  year?: string;
  academicYearId?: string;
  semesterId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface FinanceInvoice {
  id?: string;
  billingId: string;
  studentId: string;
  invoiceNumber: string;
  totalAmount: number;
  status: 'unpaid' | 'partial' | 'paid';
  dueDate: number;
  issuedDate: number;
  paidDate?: number;
  academicYearId?: string;
  semesterId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface FinanceLedger {
  id?: string;
  accountId: string;
  accountName: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  balance: number;
  createdAt: number;
  updatedAt: number;
}

export interface FinanceJournal {
  id?: string;
  transactionDate: number;
  description: string;
  referenceId?: string; // e.g. paymentId, invoiceId, payrollId
  entries: {
    accountId: string;
    type: 'debit' | 'credit';
    amount: number;
  }[];
  recordedBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface FinanceCashFlow {
  id?: string;
  type: 'inflow' | 'outflow';
  category: 'operating' | 'investing' | 'financing';
  amount: number;
  date: number;
  description: string;
  journalId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface FinanceScholarship {
  id?: string;
  studentId: string;
  studentName?: string;
  type: 'academic' | 'athletic' | 'need_based' | 'other';
  provider: string;
  amount: number;
  startDate: number;
  endDate: number;
  status: 'active' | 'expired' | 'revoked';
  createdAt: number;
  updatedAt: number;
}

export interface FinancePayroll {
  id?: string;
  teacherId: string;
  teacherName?: string;
  periodMonth: number;
  periodYear: number;
  baseSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: 'draft' | 'processed' | 'paid';
  paidDate?: number;
  createdAt: number;
  updatedAt: number;
}
