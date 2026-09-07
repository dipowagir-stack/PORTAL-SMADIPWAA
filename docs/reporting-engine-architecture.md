# Reporting Engine Architecture

## 1. Overview
The Reporting Engine is a specialized, client-side data extraction and formatting module. It is designed to take structured JSON data from any domain (Academic, Finance, Attendance, Teacher, Student) and compile it into standardized business reports (PDF, Excel, CSV).

## 2. Core Components
- **`ReportingEngine` (`services.ts`)**: A static utility class orchestrating document generation. It abstracts away the complexities of third-party libraries (`jspdf`, `xlsx`, `papaparse`).
- **`ReportConfig<T>` (`types.ts`)**: A generic configuration interface defining how data `T` should be mapped into columns. It enforces consistent headers, metadata mapping, and formatting functions.

## 3. Workflows
1. **Data Gathering**: A business module (e.g., Finance Module) fetches raw data from Firestore.
2. **Configuration Definition**: The module defines a `ReportConfig` object mapping the raw data keys to human-readable columns, providing custom `render` functions for formatting (e.g., currency formatting).
3. **Execution**: The module calls `ReportingEngine.exportReport(config, format)`.
4. **Processing**: The Engine normalizes the data into a 2D matrix.
5. **Output Generation**:
   - **PDF**: Uses `jspdf` and `jspdf-autotable` to draw grid layouts and metadata headers.
   - **Excel**: Uses `xlsx` to build worksheets, injecting metadata at the top.
   - **CSV**: Uses `papaparse` to unparse the 2D matrix into raw CSV strings.
6. **Delivery**: The browser triggers an automated download of the generated Blob.

## 4. Dependencies
- **jspdf / jspdf-autotable**: For high-fidelity PDF grid rendering.
- **xlsx**: For true `.xlsx` spreadsheet generation (compatible with Excel/Google Sheets).
- **papaparse**: For robust, RFC-compliant CSV parsing/unparsing.

## 5. Extensibility
The engine operates entirely independent of the backend. By defining custom `render` functions in the `ReportConfig`, any nested or complex object can be flattened into a reportable scalar value before export.
