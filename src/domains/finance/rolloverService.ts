import { ok, fail, Result } from '../../foundation/core/Result';
import { FinanceBilling, FinanceInvoice } from './types';
import { FirestoreRepository } from './repositories';
import { AcademicYear, AcademicSemesterMaster } from '../academic/types';

const billingRepo = new FirestoreRepository<FinanceBilling>('finance_billings');
const invoiceRepo = new FirestoreRepository<FinanceInvoice>('finance_invoices');

export class FinanceRolloverService {
  /**
   * Preview Fee Configuration Carry Forward
   * Gets the billings from a previous academic year to review before carrying forward.
   */
  async getFeeConfigurationPreview(previousAcademicYearId: string): Promise<Result<FinanceBilling[]>> {
    try {
      const billings = await billingRepo.findByQuery('academicYearId', '==', previousAcademicYearId);
      return ok(billings);
    } catch (e) {
      return fail('Gagal memuat konfigurasi biaya sebelumnya.');
    }
  }

  /**
   * Carry Forward Fee Configuration
   * Copies previous fee configurations to the new academic year and semester.
   */
  async carryForwardFeeConfiguration(
    previousAcademicYearId: string,
    newAcademicYearId: string,
    newSemesterId: string
  ): Promise<Result<FinanceBilling[]>> {
    try {
      // 1. Get previous fee configs
      const billingsRes = await this.getFeeConfigurationPreview(previousAcademicYearId);
      if (!billingsRes.isSuccess) return fail((billingsRes as any).getError());

      const previousBillings = billingsRes.getValue();
      const carriedBillings: FinanceBilling[] = [];

      // 2. Prepare new configs
      for (const billing of previousBillings) {
        const newBilling: FinanceBilling = {
          ...billing,
          id: undefined,
          academicYearId: newAcademicYearId,
          semesterId: newSemesterId,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        const saved = await billingRepo.save(newBilling);
        carriedBillings.push(saved);
      }

      return ok(carriedBillings);
    } catch (e) {
      return fail('Gagal menyalin konfigurasi biaya.');
    }
  }

  /**
   * Preview Outstanding Balances from Previous Periods
   * Unpaid, Partial, Overdue invoices are retained in history but can be viewed here.
   */
  async getOutstandingBalances(studentId?: string): Promise<Result<FinanceInvoice[]>> {
    try {
      let invoices: FinanceInvoice[] = [];
      const allInvoices = await invoiceRepo.findAll();
      invoices = allInvoices.filter(inv => inv.status === 'unpaid' || inv.status === 'partial');

      if (studentId) {
        invoices = invoices.filter(inv => inv.studentId === studentId);
      }

      return ok(invoices);
    } catch (e) {
      return fail('Gagal memuat outstanding balances.');
    }
  }

  /**
   * Initialize Billing For New Period
   * Evaluates active fee configs for the given period and student, then generates new invoices.
   */
  async initializeBillingForPeriod(
    studentId: string,
    academicYearId: string,
    semesterId: string
  ): Promise<Result<FinanceInvoice[]>> {
    try {
      // 1. Load Fee Configuration for the period
      const billingsRes = await billingRepo.findByQuery('academicYearId', '==', academicYearId);
      const activeBillings = billingsRes.filter(b => b.semesterId === semesterId || !b.semesterId);

      // 2. Load existing invoices to prevent duplicates
      const existingInvoicesRes = await invoiceRepo.findByQuery('academicYearId', '==', academicYearId);
      const existingInvoices = existingInvoicesRes.filter(i => i.studentId === studentId && (i.semesterId === semesterId || !i.semesterId));

      const newInvoices: FinanceInvoice[] = [];

      // 3. Prepare new billing
      for (const billing of activeBillings) {
        // Simple check: does an invoice for this billingId exist for this student in this period?
        const alreadyBilled = existingInvoices.some(inv => inv.billingId === billing.id);
        
        if (!alreadyBilled) {
          const newInvoice: FinanceInvoice = {
            billingId: billing.id!,
            studentId,
            invoiceNumber: `INV-${Date.now()}-${Math.floor(Math.random()*1000)}`,
            totalAmount: billing.amount,
            status: 'unpaid',
            dueDate: billing.dueDate || (Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days if empty
            issuedDate: Date.now(),
            academicYearId,
            semesterId,
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          
          const saved = await invoiceRepo.save(newInvoice);
          newInvoices.push(saved);
        }
      }

      return ok(newInvoices);
    } catch (e) {
      return fail('Gagal inisialisasi billing.');
    }
  }
}

export const financeRolloverService = new FinanceRolloverService();
