import { ok, fail, Result } from '../../foundation/core/Result';
import {
  FinanceBilling, FinancePayment, FinanceInvoice,
  FinanceLedger, FinanceJournal, FinanceCashFlow,
  FinanceScholarship, FinancePayroll
} from './types';
import { FirestoreRepository } from './repositories';
import { GenericFinanceService } from './coreServices';
import { ErrorCodes, AppError } from '../../foundation/shared/ErrorCatalog';

// Repositories
const billingRepo = new FirestoreRepository<FinanceBilling>('finance_billings');
const paymentRepo = new FirestoreRepository<FinancePayment>('finance_payments');
const invoiceRepo = new FirestoreRepository<FinanceInvoice>('finance_invoices');
const ledgerRepo = new FirestoreRepository<FinanceLedger>('finance_ledgers');
const journalRepo = new FirestoreRepository<FinanceJournal>('finance_journals');
const cashFlowRepo = new FirestoreRepository<FinanceCashFlow>('finance_cash_flows');
const scholarshipRepo = new FirestoreRepository<FinanceScholarship>('finance_scholarships');
const payrollRepo = new FirestoreRepository<FinancePayroll>('finance_payrolls');

// Services (Foundation Layer)
const billingService = new GenericFinanceService<FinanceBilling>(billingRepo);
const paymentService = new GenericFinanceService<FinancePayment>(paymentRepo);
const invoiceService = new GenericFinanceService<FinanceInvoice>(invoiceRepo);
const ledgerService = new GenericFinanceService<FinanceLedger>(ledgerRepo);
const journalService = new GenericFinanceService<FinanceJournal>(journalRepo);
const cashFlowService = new GenericFinanceService<FinanceCashFlow>(cashFlowRepo);
const scholarshipService = new GenericFinanceService<FinanceScholarship>(scholarshipRepo);
const payrollService = new GenericFinanceService<FinancePayroll>(payrollRepo);

// Helper to unwrap Result<T> to keep backward compatibility

// ============================================================================
// Multi-record Collections
// ============================================================================

export const getBillings = async (): Promise<Result<FinanceBilling[]>> => {
  return billingService.getAllResult();
};

export const getPayments = async (): Promise<Result<FinancePayment[]>> => {
  return paymentService.getAllResult();
};

export const getInvoices = async (): Promise<Result<FinanceInvoice[]>> => {
  return invoiceService.getAllResult();
};

export const getLedgers = async (): Promise<Result<FinanceLedger[]>> => {
  return ledgerService.getAllResult();
};

export const getJournals = async (): Promise<Result<FinanceJournal[]>> => {
  return journalService.getAllResult();
};

export const getCashFlows = async (): Promise<Result<FinanceCashFlow[]>> => {
  return cashFlowService.getAllResult();
};

export const getScholarships = async (): Promise<Result<FinanceScholarship[]>> => {
  return scholarshipService.getAllResult();
};

export const getPayrolls = async (): Promise<Result<FinancePayroll[]>> => {
  return payrollService.getAllResult();
};

export const billingEventsRepo = new FirestoreRepository<any>('billing_events');
export const billingEventsService = new GenericFinanceService<any>(billingEventsRepo);



export const getPaymentsByStudentResult = async (studentId: string) => {
  return paymentService.getByFieldResult('studentId', studentId);
};

export const createPaymentResult = async (payment: any) => {
  return paymentService.createResult(payment);
};

export const deletePaymentResult = async (paymentId: string) => {
  return paymentService.deleteResult(paymentId);
};

export const getBillingEventsResult = async () => {
  return billingEventsService.getAllResult();
};

export const getBillingEventsOrderByDateResult = async () => {
  try {
    const res = await billingEventsService.getAllResult();
    if (res.isFailure) return res;
    let items = res.getValue();
    items.sort((a, b) => {
      const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return tb - ta;
    });
    return { isSuccess: true, isFailure: false, getValue: () => items, getError: () => null };
  } catch (e) {
    return { isSuccess: false, isFailure: true, getValue: () => null, getError: () => "Failed" };
  }
};

export const createBillingEventResult = async (data: any) => {
  return billingEventsService.createResult(data);
};

export const updateBillingEventResult = async (id: string, data: any) => {
  return billingEventsService.updateResult(id, data);
};

export const deleteBillingEventResult = async (id: string) => {
  return billingEventsService.deleteResult(id);
};

export const getApprovedPaymentsResult = async () => {
  return paymentService.getByFieldResult('status', 'approved');
};

export const getPendingPaymentsResult = async () => {
  try {
    const res = await paymentService.getAllResult();
    if (res.isFailure) return res;
    let items = res.getValue();
    
    // Sort by createdAt desc
    items.sort((a: any, b: any) => {
      const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return tb - ta;
    });

    return { isSuccess: true, isFailure: false, getValue: () => items, getError: () => null };
  } catch (e) {
    return { isSuccess: false, isFailure: true, getValue: () => null, getError: () => "Failed" };
  }
};

export const updatePaymentResult = async (id: string, data: any) => {
  return paymentService.updateResult(id, data);
};

export const getRecentPaymentsResult = async () => {
  try {
    const res = await paymentService.getAllResult();
    if (res.isFailure) return res;
    let items = res.getValue();
    items.sort((a: any, b: any) => {
      const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return tb - ta;
    });
    return { isSuccess: true, isFailure: false, getValue: () => items.slice(0, 100), getError: () => null };
  } catch (e) {
    return { isSuccess: false, isFailure: true, getValue: () => null, getError: () => "Failed" };
  }
};
export * from './rolloverService';
