// Strict client-side whitelist of accepted media formats. This is a UX
// pre-filter so unsupported files never enter the compress/upload pipeline;
// the backend's Content-Type validation (presign/confirm) remains the real
// security barrier. Edit these lists to add formats — the logic below is generic.

// WebP is accepted too: it's already a compressed format, so it skips the
// canvas re-encode (no quality loss) and only has its EXIF/XMP metadata stripped
// from the container — see imageCompressor's webp passthrough.
export const ALLOWED_IMAGE_EXT = [".png", ".jpg", ".jpeg", ".webp"];
export const ALLOWED_VIDEO_EXT = [".mp4", ".mov"];
export const ALLOWED_IMAGE_MIME = ["image/png", "image/jpeg", "image/webp"];
// MOV is video/quicktime; on iPhone it sometimes arrives with an EMPTY MIME, so
// the extension is the reliable signal (see isAllowedFile).
export const ALLOWED_VIDEO_MIME = ["video/mp4", "video/quicktime"];

const ALLOWED_EXT = [...ALLOWED_IMAGE_EXT, ...ALLOWED_VIDEO_EXT];
const ALLOWED_MIME = [...ALLOWED_IMAGE_MIME, ...ALLOWED_VIDEO_MIME];

// `accept` for the native file picker — only a SUGGESTION, never the real check.
export const ACCEPT_ATTR =
  ".png,.jpg,.jpeg,.webp,.mp4,.mov,image/png,image/jpeg,image/webp,video/mp4,video/quicktime";

// Last (real) extension of a filename, lowercased ("FOTO.JPG" -> ".jpg",
// "imagen.jpg.exe" -> ".exe"). Empty string if none.
export function fileExtension(name) {
  const n = name || "";
  const i = n.lastIndexOf(".");
  return i >= 0 ? n.slice(i).toLowerCase() : "";
}

// Accept iff the extension is whitelisted AND the MIME is either empty (e.g. an
// iPhone .mov) or whitelisted. Anything else is rejected.
export function isAllowedFile(file) {
  if (!file) return false;
  if (!ALLOWED_EXT.includes(fileExtension(file.name))) return false;
  const mime = file.type || "";
  return mime === "" || ALLOWED_MIME.includes(mime);
}

// Some .mov files arrive with an empty MIME, so we sniff by extension too.
const VIDEO_EXT_RE = /\.(mov|mp4|m4v|webm)$/i;

export function isImageFile(file) {
  return !!(file && file.type && file.type.startsWith("image/"));
}

export function isVideoFile(file) {
  if (!file) return false;
  if (file.type && file.type.startsWith("video/")) return true;
  if (file.type && file.type.startsWith("image/")) return false;
  return VIDEO_EXT_RE.test(file.name || "");
}
