// Content-based file-type verification ("magic bytes"). The whitelist in
// allowedFormats.js trusts the filename/MIME, so a .txt renamed to .png sails
// through it — this module reads the first bytes of the file and checks the
// REAL container signature, so only genuine PNG/JPEG/WebP/MP4/MOV content
// enters the compress/upload pipeline. Like the whitelist, this is a UX
// pre-filter: the backend's validation remains the security barrier.

import {
  fileExtension,
  ALLOWED_IMAGE_EXT,
  ALLOWED_VIDEO_EXT,
} from "./allowedFormats";

// Longest offset we need: WebP ("WEBP" at 8) and the ftyp major brand (8–12).
const HEADER_BYTES = 16;

// Read the first HEADER_BYTES of the file. FileReader (not Blob.arrayBuffer)
// for maximum browser compat. Resolves null on any read error — the caller
// treats an unreadable file as unverified.
function readHeader(file) {
  return new Promise((resolve) => {
    let blob;
    try {
      blob = file.slice(0, HEADER_BYTES);
    } catch (err) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result));
    reader.onerror = () => resolve(null);
    reader.readAsArrayBuffer(blob);
  });
}

// True iff `bytes` contains exactly `expected` starting at `offset`.
function bytesAt(bytes, offset, expected) {
  if (bytes.length < offset + expected.length) return false;
  return expected.every((b, i) => bytes[offset + i] === b);
}

// Four ASCII chars at `offset` ("" if out of bounds) — ISO-BMFF box/brand ids.
function fourcc(bytes, offset) {
  if (bytes.length < offset + 4) return "";
  return String.fromCharCode(
    bytes[offset],
    bytes[offset + 1],
    bytes[offset + 2],
    bytes[offset + 3]
  );
}

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIG = [0xff, 0xd8, 0xff];
const RIFF_SIG = [0x52, 0x49, 0x46, 0x46]; // "RIFF"
const WEBP_SIG = [0x57, 0x45, 0x42, 0x50]; // "WEBP"

// ISO-BMFF ftyp brands that are IMAGES in an MP4-like container (HEIC/AVIF).
// They must NOT pass as video — the player can't decode them.
const BMFF_IMAGE_BRANDS = ["heic", "heix", "hevc", "hevx", "mif1", "msf1", "avif", "avis"];

// Top-level boxes legacy QuickTime files may start with instead of ftyp.
const QT_LEGACY_BOXES = ["moov", "mdat", "free", "skip", "wide", "pnot"];

// Sniff the real media type from the file's leading bytes. Resolves one of the
// allowed MIME types, or null when the content is not a recognized allowed
// format (including unreadable/too-short files).
export async function sniffMediaType(file) {
  const bytes = await readHeader(file);
  if (!bytes) return null;
  if (bytesAt(bytes, 0, PNG_SIG)) return "image/png";
  if (bytesAt(bytes, 0, JPEG_SIG)) return "image/jpeg";
  if (bytesAt(bytes, 0, RIFF_SIG) && bytesAt(bytes, 8, WEBP_SIG)) {
    return "image/webp";
  }
  // MP4/MOV (ISO-BMFF / QuickTime): the first box is usually ftyp; its major
  // brand tells the family apart. Old QuickTime files may lead with another
  // top-level box.
  const box = fourcc(bytes, 4);
  if (box === "ftyp") {
    const brand = fourcc(bytes, 8);
    if (BMFF_IMAGE_BRANDS.includes(brand.toLowerCase())) return null;
    return brand.startsWith("qt") ? "video/quicktime" : "video/mp4";
  }
  if (QT_LEGACY_BOXES.includes(box)) return "video/quicktime";
  return null;
}

// True iff the file's REAL content matches the category its extension claims
// (image ext → image signature, video ext → video signature). Deliberately
// category-level, not format-exact: a JPEG saved as .png is common and
// harmless (images are re-encoded to WebP client-side; videos play by content),
// but a text/HEIC/anything-else renamed to an allowed extension is rejected.
export async function matchesDeclaredType(file) {
  if (!file) return false;
  const sniffed = await sniffMediaType(file);
  if (!sniffed) return false;
  const ext = fileExtension(file.name);
  if (ALLOWED_IMAGE_EXT.includes(ext)) return sniffed.startsWith("image/");
  if (ALLOWED_VIDEO_EXT.includes(ext)) return sniffed.startsWith("video/");
  return false;
}
