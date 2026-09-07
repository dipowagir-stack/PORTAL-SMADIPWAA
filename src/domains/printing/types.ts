export type PrinterType =
  | "THERMAL"
  | "INKJET"
  | "LASER"
  | "DOT_MATRIX"
  | "LABEL"
  | "PHOTO"
  | "VIRTUAL"
  | "OTHER";

export type ConnectionType =
  | "USB"
  | "NETWORK"
  | "BLUETOOTH"
  | "SERIAL"
  | "SYSTEM"
  | "CLOUD"
  | "BRIDGE";

export type DriverType =
  | "OS_DRIVER"
  | "RAW_PROTOCOL"
  | "NATIVE_API"
  | "BRIDGE"
  | "UNKNOWN";

export type ProtocolType =
  | "ESC_POS"
  | "TSPL"
  | "ZPL"
  | "CPCL"
  | "IPP"
  | "RAW"
  | "POSTSCRIPT"
  | "PCL"
  | "PDF"
  | "SYSTEM"
  | "UNKNOWN"
  | "OTHER";

export interface PrinterCapabilities {
  printText: boolean;
  printImage: boolean;
  printColor: boolean;
  grayscale: boolean;
  duplex: boolean;
  borderless: boolean;
  barcode: boolean;
  qrCode: boolean;
  cutPaper: boolean;
  cashDrawer: boolean;
  multipleCopies: boolean;
  pageRange: boolean;
  customPaperSize: boolean;
  paperTypes?: string[];
  maxResolutionDpi?: number;
}

export interface PrinterProfile {
  id: string;
  name: string;
  manufacturer?: string;
  model?: string;
  printerType: PrinterType;
  connectionType: ConnectionType;
  driverType?: DriverType;
  protocol?: ProtocolType;
  
  paperWidthMm?: number;
  paperWidthDots?: number;
  encoding?: string;
  configuration?: Record<string, unknown>;

  capabilities: PrinterCapabilities;
}

export type PrintCommandType = 
  | "TEXT"
  | "ALIGN"
  | "STYLE"
  | "IMAGE"
  | "BARCODE"
  | "QR"
  | "LINE"
  | "FEED"
  | "CUT"
  | "DRAWER";

export interface BasePrintCommand {
  type: PrintCommandType;
}

export interface TextCommand extends BasePrintCommand {
  type: "TEXT";
  text: string;
  bold?: boolean;
  underline?: boolean;
  doubleWidth?: boolean;
  doubleHeight?: boolean;
}

export interface AlignCommand extends BasePrintCommand {
  type: "ALIGN";
  alignment: "LEFT" | "CENTER" | "RIGHT";
}

export interface FeedCommand extends BasePrintCommand {
  type: "FEED";
  lines: number;
}

export interface CutCommand extends BasePrintCommand {
  type: "CUT";
  fullCut?: boolean;
}

export interface DrawerCommand extends BasePrintCommand {
  type: "DRAWER";
}

export interface QrCommand extends BasePrintCommand {
  type: "QR";
  data: string;
  size?: number;
}

export type PrintCommand = 
  | TextCommand 
  | AlignCommand 
  | FeedCommand 
  | CutCommand 
  | DrawerCommand 
  | QrCommand;

export interface PageRange {
  start: number;
  end: number;
}

export type DocumentType = 
  | "RECEIPT"
  | "INVOICE"
  | "TICKET"
  | "LABEL"
  | "REPORT"
  | "DOCUMENT"
  | "CUSTOM";

export interface PrintJob {
  id: string;
  printerId: string;
  documentType: DocumentType;
  copies: number;
  pageRange?: PageRange;
  commands?: PrintCommand[];
  renderedDocument?: Uint8Array | string; // For raw data or PDF blob
  priority?: number;
  createdAt: string;
  idempotencyKey?: string;
}

export type PrinterStatus = 
  | "ONLINE"
  | "OFFLINE"
  | "BUSY"
  | "PAPER_LOW"
  | "PAPER_OUT"
  | "ERROR"
  | "UNKNOWN"
  | "COVER_OPEN"
  | "OVERHEATED"
  | "CUTTER_ERROR"
  | "INK_LOW"
  | "TONER_LOW"
  | "JAM"
  | "DOOR_OPEN";

export type PrinterErrorCode =
  | "PRINTER_NOT_FOUND"
  | "PRINTER_OFFLINE"
  | "PRINTER_BUSY"
  | "DRIVER_ERROR"
  | "PROTOCOL_ERROR"
  | "CONNECTION_ERROR"
  | "TIMEOUT"
  | "PAPER_ERROR"
  | "INK_ERROR"
  | "TONER_ERROR"
  | "JAM_ERROR"
  | "UNSUPPORTED_CAPABILITY"
  | "INVALID_PRINT_JOB"
  | "RENDER_ERROR"
  | "ENCODING_ERROR"
  | "PRINT_FAILED";

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  errorCode?: PrinterErrorCode;
}

export interface PrintResult {
  success: boolean;
  jobId: string;
  errorCode?: PrinterErrorCode;
  message?: string;
}

export interface PrinterAdapter {
  initialize(): Promise<void>;
  validate(job: PrintJob): Promise<ValidationResult>;
  print(job: PrintJob): Promise<PrintResult>;
  getStatus(): Promise<PrinterStatus>;
  testPrint(): Promise<PrintResult>;
  disconnect(): Promise<void>;
}

export interface PrinterDiscovery {
  discover(): Promise<PrinterProfile[]>;
}

export interface PrinterTransport {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  write(data: Uint8Array | string): Promise<void>;
  read?(): Promise<Uint8Array>;
  isConnected(): boolean;
}
