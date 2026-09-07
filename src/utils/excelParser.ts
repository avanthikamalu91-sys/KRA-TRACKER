// ============================================================
// excelParser.ts – SheetJS Excel parsing utilities
// ============================================================
import * as XLSX from 'xlsx';
import type { RawRow } from './dataUtils';

export interface ParseResult {
  rows: RawRow[];
  sheetName: string;
  totalRows: number;
  headers: string[];
}

export interface ParseError {
  message: string;
}

export async function parseExcelFile(
  file: File
): Promise<ParseResult | ParseError> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        // Optimized reading options for maximum performance
        const workbook = XLSX.read(arrayBuffer, {
          type: 'array',
          cellDates: true,
          dense: true,
          cellFormula: false,
          cellHTML: false,
          cellText: false,
        });

        if (!workbook.SheetNames.length) {
          resolve({ message: 'The Excel file contains no sheets.' });
          return;
        }

        // Use first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Fast conversion to JSON
        const rawData = XLSX.utils.sheet_to_json<RawRow>(worksheet, {
          defval: '',
          blankrows: false,
          raw: false,
        });

        if (!rawData.length) {
          resolve({ message: 'The sheet appears to be empty.' });
          return;
        }

        const headers = Object.keys(rawData[0]);

        // Validate that at minimum we have a Sealer and Style Code column
        const hasSealerCol = headers.some(
          h => h.trim().toLowerCase().includes('sealer')
        );
        const hasStyleCol = headers.some(
          h => h.trim().toLowerCase().includes('style code') ||
               h.trim().toLowerCase() === 'style'
        );

        if (!hasSealerCol) {
          resolve({
            message:
              'Could not find a "Sealer" column in the uploaded file. Please check the column names.',
          });
          return;
        }

        if (!hasStyleCol) {
          resolve({
            message:
              'Could not find a "Style Code" column in the uploaded file. Please check the column names.',
          });
          return;
        }

        resolve({
          rows: rawData as RawRow[],
          sheetName,
          totalRows: rawData.length,
          headers,
        });
      } catch (err) {
        resolve({
          message: `Failed to parse the file: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    };

    reader.onerror = () => {
      resolve({ message: 'Failed to read the file.' });
    };

    reader.readAsArrayBuffer(file);
  });
}

export function isParseError(result: ParseResult | ParseError): result is ParseError {
  return 'message' in result;
}
