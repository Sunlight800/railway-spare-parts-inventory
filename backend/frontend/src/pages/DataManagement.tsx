import React, { useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Database,
  Info
} from 'lucide-react';
import { api, API_BASE } from '../services/api';

export const DataManagement: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [resetting, setResetting] = useState<boolean>(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadResult(null);
      setErrorMsg(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    try {
      setUploading(true);
      setErrorMsg(null);
      const res = await api.uploadInventoryFile(selectedFile);
      setUploadResult(res);
      setSelectedFile(null);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Import failed. Check file structure.');
    } finally {
      setUploading(false);
    }
  };

  const handleResetDemo = async () => {
    try {
      setResetting(true);
      setResetMsg(null);
      await api.resetDemoData();
      setResetMsg('Database successfully reset to original 200 synthetic items from Excel workbook.');
    } catch (err: any) {
      console.error(err);
      alert('Reset failed');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              STOCK SENTRY — Data Management, Import Validation & Master Reset
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
              Excel / CSV Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Import rolling stock inventory files, execute validation checks, and recompute MUSIC-3D classifications — Team TRACKBYTE.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`${API_BASE}/data-management/download-sample-excel`}
            download="indian_railways_sample_spare_parts.xlsx"
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-white" />
            <span>Download Sample Excel (.xlsx)</span>
          </a>
          <a
            href={`${API_BASE}/data-management/template`}
            download="indian_railways_inventory_template.csv"
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Download CSV Template</span>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Card */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-600" />
              Upload Inventory Dataset (.xlsx / .csv)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Supports Microsoft Excel (.xlsx) workbooks with "Railway_Spare_Parts" sheet or standard comma-separated CSV files.
            </p>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs">
            <div className="flex items-center gap-2 text-emerald-900">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span><strong>Sample Testing File Ready:</strong> Download our pre-configured 50-part Indian Railways Excel dataset to test imports immediately.</span>
            </div>
            <a
              href={`${API_BASE}/data-management/download-sample-excel`}
              download="indian_railways_sample_spare_parts.xlsx"
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-sm text-xs transition flex-shrink-0"
            >
              Download Sample .xlsx
            </a>
          </div>

          {/* Drag & Drop Box */}
          <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-8 text-center space-y-3 bg-slate-50 transition cursor-pointer relative">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto" />
            <div className="text-xs text-slate-600">
              {selectedFile ? (
                <span className="font-bold text-blue-700 block text-sm">{selectedFile.name}</span>
              ) : (
                <>
                  <span className="font-bold text-slate-800 block">Click or drag Excel / CSV file here</span>
                  <span>Minimum required columns: Part_ID, Part_Name, Category, Annual_Usage_Units, Unit_Price_INR, Lead_Time_Days, Current_Stock_Units</span>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              {selectedFile ? `Selected: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)` : 'No file selected'}
            </span>

            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow transition disabled:opacity-50"
            >
              {uploading ? 'Parsing & Classifying...' : 'Import & Recalculate'}
            </button>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success / Result Feedback */}
          {uploadResult && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2 text-xs">
              <div className="font-bold text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Dataset Successfully Imported & Recomputed!
              </div>
              <div className="text-emerald-800">
                Processed <strong>{uploadResult.imported_records}</strong> records into persistent database storage. Rejected <strong>{uploadResult.rejected_records}</strong> records.
              </div>
              {uploadResult.rejection_sample?.length > 0 && (
                <div className="p-2 bg-white/80 rounded border border-emerald-200 text-[11px] text-slate-600 font-mono space-y-0.5">
                  <span className="font-bold text-red-600 block">Rejection Reasons Sample:</span>
                  {uploadResult.rejection_sample.map((r: string, i: number) => (
                    <div key={i}>{r}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reset & Dataset Mode Panel */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" />
              Dataset Provenance & Reset
            </h2>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Active Mode:</span>
                <span className="font-bold text-blue-700">Demonstration Mode</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Workbook Source:</span>
                <span className="font-mono text-slate-800">synthetic_railway_spare_parts_music3d.xlsx</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Record Baseline:</span>
                <span className="font-bold text-slate-800">200 Synthetic SKUs</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              If experimental what-if scenarios or test uploads alter the inventory numbers during presentation, you can restore the clean 200-record benchmark at any time with one click.
            </p>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-100">
            {resetMsg && (
              <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                {resetMsg}
              </div>
            )}

            <button
              onClick={handleResetDemo}
              disabled={resetting}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow transition disabled:opacity-50"
            >
              <RotateCcw className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
              <span>{resetting ? 'Resetting Database...' : 'Restore Benchmark Demo Data'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
