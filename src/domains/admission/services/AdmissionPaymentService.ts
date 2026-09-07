import { Result, ok, fail } from '../../../foundation/core/Result';
import { AppError, ErrorCodes } from '../../../foundation/shared/ErrorCatalog';
import { applicantService } from './ApplicantService';

import { GenericFinanceService } from '../../finance/coreServices';
import { FirestoreRepository } from '../../finance/repositories';
import { FinanceBilling, FinanceInvoice, FinancePayment } from '../../finance/types';

const billingRepo = new FirestoreRepository<FinanceBilling>('finance_billings');
const invoiceRepo = new FirestoreRepository<FinanceInvoice>('finance_invoices');
const paymentRepo = new FirestoreRepository<FinancePayment>('finance_payments');

class AdmissionPaymentService {
  async generateAdmissionInvoice(applicantId: string): Promise<Result<FinanceInvoice>> {
    try {
      // 1. Get Applicant
      const appRes = await applicantService.getById(applicantId);
      if (!appRes) return fail(ErrorCodes.NOT_FOUND);
      const applicant = appRes;

      // 2. Check if invoice already exists
      const existingInvoices = await invoiceRepo.findByQuery('studentId', '==', applicantId);
      const admissionInvoices = existingInvoices.filter(inv => inv.invoiceNumber.startsWith('ADM-'));
      if (admissionInvoices.length > 0) {
        return ok(admissionInvoices[0]);
      }

      // 3. Get Fee Config
      const admissionFee = 150000;

      // 4. Check if Billing exists for this wave and applicantType
      const billingTitle = `Pendaftaran PPDB - ${applicant.registrationNumber || applicantId}`;
      const newBilling: FinanceBilling = {
        type: 'other',
        title: billingTitle,
        amount: admissionFee,
        targetType: 'student',
        targetValue: applicantId,
        dueDate: Date.now() + 7 * 24 * 60 * 60 * 1000, // +7 days
        academicYear: applicant.academicYear,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      const savedBilling = await billingRepo.save(newBilling);

      // 5. Create Invoice
      const newInvoice: FinanceInvoice = {
        billingId: savedBilling.id!,
        studentId: applicantId,
        invoiceNumber: `ADM-${Date.now()}-${applicantId.slice(0, 4).toUpperCase()}`,
        totalAmount: admissionFee,
        status: 'unpaid',
        dueDate: savedBilling.dueDate,
        issuedDate: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const savedInvoice = await invoiceRepo.save(newInvoice);
      return ok(savedInvoice);

    } catch (e: any) {
      return fail(e.message);
    }
  }

  async getApplicantInvoice(applicantId: string): Promise<Result<FinanceInvoice | null>> {
    try {
      const existingInvoices = await invoiceRepo.findByQuery('studentId', '==', applicantId);
      const admissionInvoices = existingInvoices.filter(inv => inv.invoiceNumber.startsWith('ADM-'));
      if (admissionInvoices.length > 0) {
        return ok(admissionInvoices[0]);
      }
      return ok(null);
    } catch (e: any) {
      return fail(e.message);
    }
  }

  async getApplicantPayments(applicantId: string): Promise<Result<FinancePayment[]>> {
    try {
      const payments = await paymentRepo.findByQuery('studentId', '==', applicantId);
      return ok(payments);
    } catch (e: any) {
      return fail(e.message);
    }
  }

  async submitPayment(payment: Partial<FinancePayment>): Promise<Result<FinancePayment>> {
    try {
      const { createPaymentResult } = await import('../../finance/services');
      const saved = await createPaymentResult({
        ...payment,
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return saved;
    } catch (e: any) {
      return fail(e.message);
    }
  }
}

export const admissionPaymentService = new AdmissionPaymentService();
