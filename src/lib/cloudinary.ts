import crypto from "crypto";

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  uploadFolder: string;
}

export function getCloudinaryConfig(): CloudinaryConfig | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;
  return {
    cloudName,
    apiKey,
    apiSecret,
    uploadFolder: process.env.CLOUDINARY_FOLDER || "mediaexpres",
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
