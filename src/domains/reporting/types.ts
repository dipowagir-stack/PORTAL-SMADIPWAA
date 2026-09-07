export type ExportFormat = 'pdf' | 'excel' | 'csv';

export type ReportModule = 'academic' | 'finance' | 'attendance' | 'teacher' | 'student';

export interface ReportColumn<T> {
  header: string;
  key: keyof T | string;
  render?: (row: T) => string | number;
  width?: number; // Optional width constraint for PDF columns
}

export interface ReportConfig<T> {
  module: ReportModule;
  title: string;
  filename: string;
  columns: ReportColumn<T>[];
  data: T[];
  metadata?: Record<string, string>; // Extra context like "Date Range", "Filter"
}
