import { Result, ok, fail } from "../../foundation/core/Result";
import { ErrorCodes } from "../../foundation/shared/ErrorCatalog";
import {
  PrintJob,
  PrinterProfile,
  PrintResult,
  ValidationResult,
  PrinterAdapter,
  PrinterStatus,
  PrinterErrorCode,
} from "./types";

export class UniversalPrintService {
  private registry: Map<string, PrinterProfile> = new Map();
  private adapters: Map<string, PrinterAdapter> = new Map();

  /**
   * Register a printer profile in the universal print engine.
   */
  public registerPrinter(profile: PrinterProfile, adapter: PrinterAdapter): void {
    this.registry.set(profile.id, profile);
    this.adapters.set(profile.id, adapter);
  }

  /**
   * Get a registered printer profile.
   */
  public getPrinterProfile(printerId: string): PrinterProfile | undefined {
    return this.registry.get(printerId);
  }

  /**
   * Print a job through the universal print pipeline.
   * Pipeline steps: Validate Request -> Resolve Printer -> Resolve Output Format -> Queue -> Print
   */
  public async print(job: PrintJob): Promise<Result<PrintResult>> {
    try {
      const printerProfile = this.registry.get(job.printerId);
      const adapter = this.adapters.get(job.printerId);

      if (!printerProfile || !adapter) {
        return fail("PRINTER_NOT_FOUND: Printer is not registered.");
      }

      // Step 1: Validate Job with capabilities
      const validationResult = await this.validateJob(job, printerProfile, adapter);
      if (!validationResult.valid) {
        return fail(`PRINT_FAILED: ${validationResult.errors?.join(", ")}`);
      }

      // Step 2: Push to queue (skipped complex queueing logic for foundation)
      
      // Step 3: Print
      await adapter.initialize();
      const printResult = await adapter.print(job);

      if (!printResult.success) {
        return fail(printResult.message || "Print failed");
      }

      return ok(printResult);
    } catch (error: any) {
      console.error("[UniversalPrintService] Print Error:", error);
      return fail(error.message || "Unknown Print Error");
    }
  }

  /**
   * Validate if the requested print job is compatible with the printer's capabilities.
   */
  private async validateJob(
    job: PrintJob,
    profile: PrinterProfile,
    adapter: PrinterAdapter
  ): Promise<ValidationResult> {
    const caps = profile.capabilities;

    if (job.commands) {
      for (const cmd of job.commands) {
        if (cmd.type === "CUT" && !caps.cutPaper) {
          return { valid: false, errors: ["Printer does not support paper cut."] };
        }
        if (cmd.type === "DRAWER" && !caps.cashDrawer) {
          return { valid: false, errors: ["Printer does not support cash drawer."] };
        }
        if (cmd.type === "QR" && !caps.qrCode) {
          return { valid: false, errors: ["Printer does not support QR code."] };
        }
      }
    }

    // Delegate deeper validation to adapter
    return await adapter.validate(job);
  }

  /**
   * Performs a test print on the requested printer.
   */
  public async testPrint(printerId: string): Promise<Result<PrintResult>> {
    const adapter = this.adapters.get(printerId);
    if (!adapter) {
        return fail("PRINTER_NOT_FOUND");
    }
    try {
        await adapter.initialize();
        const res = await adapter.testPrint();
        if(res.success) {
            return ok(res);
        } else {
            return fail(res.message || "Test print failed");
        }
    } catch (error: any) {
        return fail(error.message || "Test print error");
    }
  }

  /**
   * Get the status of a specific printer.
   */
  public async getPrinterStatus(printerId: string): Promise<Result<PrinterStatus>> {
      const adapter = this.adapters.get(printerId);
      if (!adapter) {
          return fail("PRINTER_NOT_FOUND");
      }
      try {
          const status = await adapter.getStatus();
          return ok(status);
      } catch(e: any) {
          return fail(e.message || "Failed to get printer status");
      }
  }
}

// Global Singleton
export const universalPrintService = new UniversalPrintService();
