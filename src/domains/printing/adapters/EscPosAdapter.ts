import { PrinterAdapter, PrintJob, PrintResult, PrinterStatus, ValidationResult, PrinterTransport, PrintCommand } from "../types";

/**
 * Protocol Adapter for ESC/POS Thermal Printers
 * Separates protocol command generation from the transport layer.
 */
export class EscPosAdapter implements PrinterAdapter {
    private transport: PrinterTransport;
    
    constructor(transport: PrinterTransport) {
        this.transport = transport;
    }

    async initialize(): Promise<void> {
        if (!this.transport.isConnected()) {
            await this.transport.connect();
        }
    }

    async validate(job: PrintJob): Promise<ValidationResult> {
        if (!job.commands || job.commands.length === 0) {
            return { valid: false, errors: ["No print commands provided for thermal printing."] };
        }
        return { valid: true };
    }

    async print(job: PrintJob): Promise<PrintResult> {
        try {
            await this.initialize();
            
            // Generate ESC/POS commands
            const payload = this.buildEscPosPayload(job.commands!);
            
            // Send via transport
            await this.transport.write(payload);
            
            return { success: true, jobId: job.id };
        } catch (error: any) {
            return { success: false, jobId: job.id, message: error.message, errorCode: "PRINT_FAILED" };
        }
    }

    async getStatus(): Promise<PrinterStatus> {
        // Status checks depend on transport (e.g. read bytes from serial/USB)
        // Stub implementation
        return this.transport.isConnected() ? "ONLINE" : "OFFLINE";
    }

    async testPrint(): Promise<PrintResult> {
        try {
            await this.initialize();
            const initCmd = new Uint8Array([0x1B, 0x40]); // ESC @
            const textCmd = new TextEncoder().encode("Test Print ESC/POS\n");
            const feedCmd = new Uint8Array([0x0A, 0x0A, 0x0A]); 
            const cutCmd = new Uint8Array([0x1D, 0x56, 0x00]); // GS V 0

            const payload = new Uint8Array([...initCmd, ...textCmd, ...feedCmd, ...cutCmd]);
            await this.transport.write(payload);
            
            return { success: true, jobId: "test-print" };
        } catch (error: any) {
            return { success: false, jobId: "test-print", message: error.message };
        }
    }

    async disconnect(): Promise<void> {
        await this.transport.disconnect();
    }

    /**
     * Translates agnostic PrintCommands to raw ESC/POS bytes.
     */
    private buildEscPosPayload(commands: PrintCommand[]): Uint8Array {
        let payload: number[] = [0x1B, 0x40]; // Initialize printer

        for (const cmd of commands) {
            switch (cmd.type) {
                case "TEXT":
                    // Handle style (bold, etc.)
                    payload.push(0x1B, 0x45, cmd.bold ? 1 : 0);
                    // Append text
                    const textBytes = Array.from(new TextEncoder().encode(cmd.text));
                    payload.push(...textBytes);
                    // Reset bold
                    if (cmd.bold) payload.push(0x1B, 0x45, 0);
                    break;
                case "ALIGN":
                    const alignVal = cmd.alignment === "LEFT" ? 0 : (cmd.alignment === "CENTER" ? 1 : 2);
                    payload.push(0x1B, 0x61, alignVal); // ESC a n
                    break;
                case "FEED":
                    payload.push(0x1B, 0x64, cmd.lines); // ESC d n
                    break;
                case "CUT":
                    payload.push(0x1D, 0x56, 0x00); // GS V m
                    break;
                case "DRAWER":
                    payload.push(0x1B, 0x70, 0x00, 0x19, 0xFA); // ESC p m t1 t2
                    break;
            }
        }
        
        return new Uint8Array(payload);
    }
}
