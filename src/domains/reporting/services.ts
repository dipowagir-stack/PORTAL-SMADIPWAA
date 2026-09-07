import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { ReportConfig, ExportFormat } from './types';
import { Result, ok, fail } from '../../foundation/core/Result';
import { ErrorCodes } from '../../foundation/shared/ErrorCatalog';

export class ReportingEngine {
  /**
   * Main entry point to export reports. 
   * Triggers a browser download of the generated file.
   */
  static async exportReport<T>(config: ReportConfig<T>, format: ExportFormat): Promise<Result<void>> {
    try {
      if (!config || !config.data || config.data.length === 0) {
        return fail(ErrorCodes.VALIDATION_ERROR);
      }

      switch(format) {
        case 'pdf':
          this.exportToPDF(config);
          break;
        case 'excel':
          this.exportToExcel(config);
          break;
        case 'csv':
          this.exportToCSV(config);
          break;
        default:
          return fail(ErrorCodes.VALIDATION_ERROR);
      }
      return ok(undefined);
    } catch (e: any) {
      return fail(ErrorCodes.INTERNAL_ERROR);
    }
  }

  /**
   * Normalizes the generic data array into a 2D string/number matrix based on column definitions.
   */
  private static processData<T>(config: ReportConfig<T>): any[][] {
    return config.data.map(row => 
      config.columns.map(col => {
        if (col.render) {
          return col.render(row);
        }
        return (row as any)[col.key] ?? '-';
      })
    );
  }

  private static exportToPDF<T>(config: ReportConfig<T>): void {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.text(config.title, 14, 22);

    // Metadata
    let startY = 30;
    if (config.metadata) {
      doc.setFontSize(10);
      Object.entries(config.metadata).forEach(([key, value]) => {
        doc.text(`${key}: ${value}`, 14, startY);
        startY += 6;
      });
      startY += 4;
    }

    const headers = config.columns.map(c => c.header);
    const body = this.processData(config);

    autoTable(doc, {
      startY,
      head: [headers],
      body: body,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] }
    });

    doc.save(`${config.filename}.pdf`);
  }

  private static exportToExcel<T>(config: ReportConfig<T>): void {
    const headers = config.columns.map(c => c.header);
    const body = this.processData(config);
    
    // Inject metadata at the top if present
    const worksheetData: any[][] = [];
    if (config.metadata) {
      Object.entries(config.metadata).forEach(([key, value]) => {
        worksheetData.push([`${key}:`, value]);
      });
      worksheetData.push([]); // Empty row before data
    }
    
    worksheetData.push(headers);
    worksheetData.push(...body);
    
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${config.filename}.xlsx`);
  }

  private static exportToCSV<T>(config: ReportConfig<T>): void {
    const headers = config.columns.map(c => c.header);
    const body = this.processData(config);
    
    const csvData = [headers, ...body];
    const csv = Papa.unparse(csvData);
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    
    if (typeof window !== 'undefined') {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `${config.filename}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}
