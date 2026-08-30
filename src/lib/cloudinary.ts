import crypto from "crypto";

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  uploadFolder: string;
}

export function getCloudinaryConfig(): CloudinaryConfig | null {
  // .trim() pe fiecare, nu din exces de prudenta: un singur spatiu sau enter
  // lipit la finalul secretului cand e copiat in panoul de variabile face
  // SHA1-ul sa iasa altfel, iar Cloudinary respinge TOATE incarcarile cu
  // "Invalid Signature". Simptomul e exact cel raportat — niciun client nu
  // reuseste sa urce poze — si nu se vede nicaieri in log.
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) return null;
  return {
    cloudName,
    apiKey,
    apiSecret,
    // Fara "/" la capete: folderul intra direct in semnatura, iar un slash in
    // plus schimba si semnatura, si calea din Cloudinary.
    uploadFolder: (process.env.CLOUDINARY_FOLDER?.trim() || "mediaexpres").replace(/^\/+|\/+$/g, ""),
  };
}

// Signs upload params for direct-from-browser signed upload.
// Reference: https://cloudinary.com/documentation/signatures#using_cloudinary_backend_sdks_to_generate_sha_authentication_signatures
export function signUploadParams(params: Record<string, string | number>) {
  const cfg = getCloudinaryConfig();
  if (!cfg) return null;

  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  const signature = crypto
    .createHash("sha1")
    .update(sorted + cfg.apiSecret)
    .digest("hex");

  return {
    ...params,
    signature,
    api_key: cfg.apiKey,
    cloud_name: cfg.cloudName,
  };
}
