"use client";

import { FileText, X } from "lucide-react";

export function FilePreview({
  previewUrl,
  fileType,
  fileName,
  onClear,
}: {
  previewUrl: string | null;
  fileType: "image" | "pdf" | null;
  fileName: string | null;
  onClear: () => void;
}) {
  if (!previewUrl) return null;
  return (
    <div className="file-preview">
      {fileType === "pdf" ? (
        <div className="file-preview-pdf">
          <FileText size={16} /> {fileName || "PDF-bestand"}
        </div>
      ) : (
        <img src={previewUrl} alt="" className="file-preview-img" />
      )}
      <button type="button" className="icon-btn danger ghost" onClick={onClear}>
        <X size={13} />
      </button>
    </div>
  );
}
