"use client";

import { useState } from "react";
import { Image as ImageIcon, Loader2, X, Upload } from "lucide-react";

export interface UploadedPhoto {
  id: string;
  url: string;
  publicId: string;
}

interface Props {
  articleId: string;
  initial?: UploadedPhoto[];
  max?: number;
}

export function PhotoUploader({ articleId, initial = [], max = 3 }: Props) {
  const [photos, setPhotos] = useState<UploadedPhoto[]>(initial);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = max - photos.length;

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Fisierul trebuie sa fie imagine");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Maxim 10 MB per poza");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const signRes = await fetch("/api/upload/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId }),
      });
      const sign = await signRes.json();
      if (!signRes.ok || !sign.ok) throw new Error(sign.error || "Semnatura esuata");

      const form = new FormData();
      form.append("file", file);
      form.append("api_key", sign.apiKey);
      form.append("timestamp", String(sign.timestamp));
      form.append("folder", sign.folder);
      form.append("signature", sign.signature);

      const upRes = await fetch(
        `https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`,
        { method: "POST", body: form }
      );
      const up = await upRes.json();
      if (!upRes.ok || !up.public_id) throw new Error(up?.error?.message || "Upload esuat");

      const regRes = await fetch(`/api/articles/${articleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cloudinaryPublicId: up.public_id,
          url: up.secure_url,
          width: up.width,
          height: up.height,
          bytes: up.bytes,
        }),
      });
      const reg = await regRes.json();
      if (!regRes.ok || !reg.ok) throw new Error(reg.error || "Inregistrarea a esuat");

      setPhotos([...photos, { id: reg.id, url: up.secure_url, publicId: up.public_id }]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Eroare necunoscuta");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ImageIcon className="h-5 w-5 text-brand-navy" />
        <h3 className="font-semibold text-brand-navy">
          Poze articol ({photos.length}/{max})
        </h3>
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {photos.map((p) => (
            <div
              key={p.id}
              className="relative aspect-video overflow-hidden rounded-md border border-slate-200 bg-slate-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="Poza articol" className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      )}

      {remaining > 0 && (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white px-4 py-6 text-sm hover:border-brand-red hover:bg-slate-50">
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Se incarca...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Adauga poza (mai poti urca {remaining})
            </>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </label>
      )}

      {error && (
        <p className="text-xs text-red-600 flex items-start gap-1">
          <X className="h-3.5 w-3.5 mt-0.5" />
          {error}
        </p>
      )}
    </div>
  );
}
