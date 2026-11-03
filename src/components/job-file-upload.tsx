"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";


interface JobFileUploadProps {
  accept: string;
  label: string;
  hint: string;
  value: string;
  onChange: (url: string) => void;
  uploading: boolean;
  onUploadingChange: (v: boolean) => void;
  type: "pdf" | "image";
  isRTL: boolean;
}

export function JobFileUpload({
  accept,
  label,
  hint,
  value,
  onChange,
  uploading,
  onUploadingChange,
  type,
  isRTL,
}: JobFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");

  const handleUpload = async (file: File) => {
    setError("");
    onUploadingChange(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", type);
      const res = await fetch("/api/jobs/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || (isRTL ? "فشل الرفع" : "Échec du téléchargement"));
      }
      const data = await res.json();
      onChange(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : isRTL ? "خطأ في الرفع" : "Erreur de téléchargement");
    } finally {
      onUploadingChange(false);
    }
  };

  const handleFiles = (files: FileList | File[]) => {
    const file = Array.from(files)[0];
    if (!file) return;
    handleUpload(file);
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = "";
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (uploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading) setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {!value ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => !uploading && inputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } }}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragEnter={onDragOver}
          onDragLeave={onDragLeave}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer select-none ${
            isDragging
              ? "border-blue-500 bg-blue-50 ring-4 ring-blue-200"
              : uploading
              ? "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
              : "border-slate-300 bg-slate-50/50 hover:border-blue-400 hover:bg-blue-50/30"
          }`}
        >
          <input ref={inputRef} type="file" accept={accept} onChange={onInputChange} className="hidden" disabled={uploading} />
          <div className="flex flex-col items-center gap-3">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isDragging ? "bg-blue-100" : "bg-slate-100"}`}>
              <svg className={`w-7 h-7 ${isDragging ? "text-blue-600" : "text-slate-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">
                {isDragging
                  ? (isRTL ? "أفلت الملف هنا" : "Déposez le fichier ici")
                  : (isRTL ? "انقر أو اسحب الملف هنا" : "Cliquez ou glissez le fichier ici")}
              </p>
              <p className="text-xs text-slate-500 mt-1">{hint}</p>
            </div>
            {uploading && (
              <div className="flex items-center gap-2 text-xs text-blue-600">
                <div className="animate-spin h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full" />
                {isRTL ? "جاري الرفع..." : "Téléversement..."}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
              {type === "image" ? (
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
            </div>
            <div className="min-w-0 flex-1">
              {type === "image" ? (
                <img src={value} alt="Uploaded" className="h-16 w-auto object-contain rounded border bg-white" />
              ) : (
                <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-slate-800 hover:text-blue-600 truncate block">
                  {value.split("/").pop() || value}
                </a>
              )}
            </div>
          </div>
          <button type="button" onClick={() => onChange("")} className="shrink-0 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors">
            {isRTL ? "حذف" : "Supprimer"}
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
