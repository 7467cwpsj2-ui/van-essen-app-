// Cliëntzijdige bestandsverwerking vóór upload naar Supabase Storage.
// Poort van readImageCompressed/processUploadedFile uit het prototype
// (projectplanning_1.jsx:201-240), maar levert nu een Blob voor echte
// upload i.p.v. een base64 data-URL voor in-memory opslag.

export interface ProcessedFile {
  blob: Blob;
  fileType: "image" | "pdf";
  fileName: string;
  previewUrl: string;
}

function readImageCompressed(file: File, maxDim = 1600, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Kon het bestand niet lezen."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Kon de afbeelding niet openen."));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Kon de afbeelding niet verwerken."));
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Kon de afbeelding niet verwerken."))),
          "image/jpeg",
          quality
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export async function processUploadedFile(file: File): Promise<ProcessedFile> {
  if (file.type === "application/pdf") {
    if (file.size > 15 * 1024 * 1024) throw new Error("Dit PDF-bestand is te groot (max 15MB).");
    return { blob: file, fileType: "pdf", fileName: file.name, previewUrl: URL.createObjectURL(file) };
  }
  const blob = await readImageCompressed(file);
  return { blob, fileType: "image", fileName: file.name, previewUrl: URL.createObjectURL(blob) };
}
