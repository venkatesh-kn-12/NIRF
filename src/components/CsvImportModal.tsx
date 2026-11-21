"use client";

import React, { useState } from "react";
import {
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  FileSpreadsheet,
  Loader2,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleName:
    | "students"
    | "faculty"
    | "publications"
    | "patents"
    | "finance"
    | "projects"
    | "placements"
    | "graduation-outcomes"
    | "doctoral-awards";
  moduleTitle: string;
  onImportSuccess: () => void;
}

export function CsvImportModal({
  isOpen,
  onClose,
  moduleName,
  moduleTitle,
  onImportSuccess,
}: CsvImportModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = useState<string>("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    window.open(`/api/csv/template?module=${moduleName}`, "_blank");
  };

  const parseCsvText = (text: string) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      throw new Error("CSV file must contain at least a header row and one data row.");
    }

    // Parse CSV line handling commas within quotes
    const parseLine = (line: string): string[] => {
      const entries: string[] = [];
      let inQuote = false;
      let entry = "";
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          if (inQuote && line[i + 1] === '"') {
            entry += '"';
            i++;
          } else {
            inQuote = !inQuote;
          }
        } else if (c === "," && !inQuote) {
          entries.push(entry.trim());
          entry = "";
        } else {
          entry += c;
        }
      }
      entries.push(entry.trim());
      return entries;
    };

    const headerRow = parseLine(lines[0]);
    const cleanHeaders = headerRow.map((h) => h.replace(/^["']|["']$/g, "").trim());

    const rows: Record<string, any>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      if (values.length === 1 && !values[0]) continue;
      const rowObj: Record<string, any> = {};
      cleanHeaders.forEach((header, idx) => {
        let val = values[idx] || "";
        val = val.replace(/^["']|["']$/g, "").trim();
        rowObj[header] = val;
      });
      rows.push(rowObj);
    }

    return { headers: cleanHeaders, rows };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const { headers: h, rows: r } = parseCsvText(content);
        setHeaders(h);
        setParsedRows(r);
        setStep(2); // Go to Preview
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to parse CSV file");
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/csv/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: moduleName,
          rows: parsedRows,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to import CSV data");
      }

      setImportResult(data);
      setStep(3); // Result step
      onImportSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "Error importing records");
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setStep(1);
    setFileName("");
    setHeaders([]);
    setParsedRows([]);
    setImportResult(null);
    setErrorMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-6 space-y-4 my-8 border border-slate-200">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="text-emerald-600" size={22} />
              CSV Data Import — {moduleTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Batch import departmental records directly into the simulation dataset.
            </p>
          </div>
          <button
            onClick={resetModal}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
          >
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: Upload & Download Template */}
        {step === 1 && (
          <div className="space-y-5 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl gap-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-800">1. Download Template</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Use our standardized CSV template with pre-formatted headers.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <Download size={14} />
                Download {moduleTitle} Template
              </button>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-indigo-400 transition-colors">
              <Upload className="mx-auto text-slate-400 mb-2" size={36} />
              <p className="text-sm font-medium text-slate-700">Select or drop CSV file</p>
              <p className="text-xs text-slate-500 mt-1">Accepts UTF-8 encoded .csv files</p>
              <label className="mt-4 inline-block px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg cursor-pointer hover:bg-indigo-700 shadow-sm transition-colors">
                Browse CSV File
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        {/* STEP 2: Preview Rows */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>
                File: <strong className="text-slate-800">{fileName}</strong> •{" "}
                <strong className="text-indigo-600">{parsedRows.length} rows</strong> parsed
              </span>
              <button
                onClick={() => setStep(1)}
                className="text-xs text-indigo-600 hover:underline"
              >
                Choose another file
              </button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-72">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 font-semibold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-slate-500">#</th>
                    {headers.slice(0, 6).map((h) => (
                      <th key={h} className="px-3 py-2 text-slate-700">
                        {h}
                      </th>
                    ))}
                    {headers.length > 6 && (
                      <th className="px-3 py-2 text-slate-400">+{headers.length - 6} more</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {parsedRows.slice(0, 10).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-400 font-sans">{idx + 1}</td>
                      {headers.slice(0, 6).map((h) => (
                        <td key={h} className="px-3 py-2 truncate max-w-[150px]">
                          {String(row[h] || "—")}
                        </td>
                      ))}
                      {headers.length > 6 && (
                        <td className="px-3 py-2 text-slate-400">...</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {parsedRows.length > 10 && (
              <p className="text-[11px] text-slate-500 text-center">
                Showing preview of first 10 rows of {parsedRows.length} rows total.
              </p>
            )}

            <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50"
              >
                Back
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleExecuteImport}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 shadow-sm disabled:opacity-50 transition-colors"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                Confirm & Import {parsedRows.length} Records
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Results */}
        {step === 3 && importResult && (
          <div className="space-y-4 py-2">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
              <CheckCircle2 className="mx-auto text-emerald-600 mb-1" size={32} />
              <h3 className="text-sm font-bold text-emerald-900">Import Complete</h3>
              <p className="text-xs text-emerald-700 mt-1">
                Successfully recorded <strong>{importResult.imported}</strong> records into MongoDB.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-500 block">Total Rows</span>
                <span className="text-lg font-bold text-slate-800">{importResult.total}</span>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="text-emerald-700 block">Imported</span>
                <span className="text-lg font-bold text-emerald-800">{importResult.imported}</span>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <span className="text-amber-700 block">Skipped / Dupes</span>
                <span className="text-lg font-bold text-amber-800">{importResult.skippedDuplicates}</span>
              </div>
            </div>

            {importResult.errors?.length > 0 && (
              <div className="border border-red-200 rounded-lg p-3 bg-red-50/50 max-h-40 overflow-y-auto space-y-1">
                <h5 className="text-xs font-semibold text-red-900">
                  Errors ({importResult.errors.length} rows failed validation):
                </h5>
                {importResult.errors.map((err: any, idx: number) => (
                  <div key={idx} className="text-[11px] text-red-700">
                    Row {err.row}: {err.error}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={resetModal}
                className="px-5 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
