"use client";

import { useState, useRef, useCallback, DragEvent, ChangeEvent } from "react";

export interface UploadedFile {
  id?: string;
  type: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

interface FileDropzoneProps {
  candidateId?: string | null;
  docType?: string;
  accept?: string;
  maxSizeMB?: number;
  multiple?: boolean;
  value: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  locale?: "ar" | "fr";
  disabled?: boolean;
  label?: { ar: string; fr: string };
  hint?: { ar: string; fr: string };
}

const DEFAULT_ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
const ALLOWED_MIME = new Set(["application/pdf", "image/jpeg", "image/jpg", "image/png"]);

function t(value: { ar: string; fr: string } | undefined, locale: "ar" | "fr", fallback = ""): string {
  if (!value) return fallback;
  return value[locale] || value.fr || value.ar || fallback;
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function FileDropzone({
  candidateId,
  docType = "misc",
  accept = DEFAULT_ACCEPT,
  maxSizeMB = 5,
  multiple = true,
  value,
  onChange,
  locale = "fr",
  disabled = false,
  label,
  hint,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>("");

  const isRTL = locale === "ar";

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!ALLOWED_MIME.has(file.type)) {
        return isRTL ? "نوع الملف غير مسموح" : "Type de fichier non autorisé";
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        return isRTL
          ? `الملف يتجاوز ${maxSizeMB} ميغابايت`
          : `Le fichier dépasse ${maxSizeMB} Mo`;
      }
      return null;
    },
    [maxSizeMB, isRTL]
  );

  const uploadOne = useCallback(
    async (file: File): Promise<UploadedFile | null> => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return null;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", docType);
      formData.append("candidateId", candidateId || "temp");

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Upload failed");
        }
        const data = await res.json();
        return {
          id: data.id,
          type: data.type || docType,
          fileName: data.fileName,
          fileUrl: data.url,
          fileSize: data.size,
          mimeType: data.mimeType,
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Upload error";
        const friendly = msg.includes("413") || msg.includes("too large")
          ? (isRTL ? "الملف كبير جدًا. الحد الأقصى هو 4 ميغابايت." : "Fichier trop volumineux. La limite est de 4 Mo.")
          : msg;
        setError(friendly);
        return null;
      }
    },
    [candidateId, docType, validateFile, isRTL]
  );

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      setError("");
      const files = Array.from(fileList);
      if (files.length === 0) return;
      if (!multiple && value.length > 0) {
        setError(isRTL ? "ملف واحد فقط مسموح" : "Un seul fichier autorisé");
        return;
      }

      setUploading(true);
      try {
        const results: UploadedFile[] = [];
        for (const file of multiple ? files : [files[0]]) {
          const uploaded = await uploadOne(file);
          if (uploaded) results.push(uploaded);
        }
        if (results.length > 0) {
          onChange(multiple ? [...value, ...results] : results);
        }
      } finally {
        setUploading(false);
      }
    },
    [multiple, value, onChange, uploadOne, isRTL]
  );

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
    if (disabled || uploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || uploading) return;
    setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const removeFile = async (index: number) => {
    const file = value[index];
    if (file.id) {
      try {
        await fetch(`/api/documents/${file.id}`, { method: "DELETE", credentials: "include" });
      } catch (e) {
        console.error(e);
      }
    }
    onChange(value.filter((_, i) => i !== index));
  };

  const openPicker = () => {
    if (disabled || uploading) return;
    inputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPicker();
          }
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragEnter={onDragOver}
        onDragLeave={onDragLeave}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer select-none ${
          isDragging
            ? "border-blue-500 bg-blue-50 ring-4 ring-blue-200"
            : disabled
            ? "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
            : "border-slate-300 bg-slate-50/50 hover:border-blue-400 hover:bg-blue-50/30"
        }`}
        aria-disabled={disabled || uploading}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={onInputChange}
          className="hidden"
          disabled={disabled || uploading}
        />

        <div className="flex flex-col items-center gap-3">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              isDragging ? "bg-blue-100" : "bg-slate-100"
            }`}
          >
            <svg
              className={`w-7 h-7 ${isDragging ? "text-blue-600" : "text-slate-500"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">
              {t(label, locale) || (isRTL ? "انقر أو اسحب الملفات هنا" : "Cliquez ou glissez les fichiers ici")}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {t(hint, locale) || "PDF, JPG, PNG (max 5MB)"}
            </p>
          </div>
          {uploading && (
            <div className="flex items-center gap-2 text-xs text-blue-600">
              <div className="animate-spin h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full" />
              {isRTL ? "جاري الرفع..." : "Téléversement..."}
            </div>
          )}
        </div>

        {isDragging && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-blue-500/10 rounded-xl">
            <span className="text-sm font-bold text-blue-700">
              {isRTL ? "أفلت الملفات هنا" : "Déposez les fichiers ici"}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0L3.16 16.25A2 2 0 005 19z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((file, index) => (
            <li
              key={file.id || `${file.fileName}-${index}`}
              className="flex items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <a
                    href={file.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-slate-800 hover:text-blue-600 truncate block"
                  >
                    {file.fileName}
                  </a>
                  <p className="text-xs text-slate-500">
                    {humanSize(file.fileSize)} · {file.mimeType}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="shrink-0 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                disabled={uploading}
              >
                {isRTL ? "حذف" : "Supprimer"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
