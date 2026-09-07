import { PrinterTransport } from "../types";

export class WebUsbTransport implements PrinterTransport {
    private device: any = null;
    private interfaceNumber: number = 0;
    private endpointOut: number = 0;

    async connect(): Promise<void> {
        if (typeof navigator === "undefined" || !(navigator as any).usb) {
            throw new Error("WebUSB is not supported in this browser.");
        }

        try {
            // In a real app, this prompts the user or re-connects to a known device
            // this.device = await (navigator as any).usb.requestDevice({ filters: [{ classCode: 0x07 }] });
            // await this.device.open();
            // await this.device.selectConfiguration(1);
            // await this.device.claimInterface(this.interfaceNumber);
        } catch (error) {
            throw new Error(`USB Connection failed: ${error}`);
        }
    }

    async disconnect(): Promise<void> {
        if (this.device) {
            try {
                // await this.device.close();
            } catch (e) {
                console.error(e);
            }
            this.device = null;
        }
    }

    async write(data: Uint8Array | string): Promise<void> {
        if (!this.isConnected()) {
            throw new Error("Cannot write to disconnected USB device.");
        }
        
        let payload: Uint8Array;
        if (typeof data === "string") {
            payload = new TextEncoder().encode(data);
        } else {
            payload = data;
        }

        // await this.device.transferOut(this.endpointOut, payload);
    }

    isConnected(): boolean {
        // return this.device?.opened ?? false;
        return true; // Stubbed for now
    }
}
