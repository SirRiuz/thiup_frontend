// Strips EXIF + XMP metadata from a WebP file WITHOUT re-encoding the image, so
// an already-compressed WebP keeps its exact pixels/quality and only loses its
// (potentially sensitive: GPS, camera, dates) metadata. The ICC color profile
// (ICCP) is preserved.
//
// WebP is a RIFF container: "RIFF" + u32 size + "WEBP" + a sequence of chunks,
// each = 4-byte FourCC + u32 little-endian size + payload + 1 pad byte when the
// size is odd. Metadata lives in the "EXIF" and "XMP " chunks (extended/VP8X
// format only). We drop those chunks AND clear their flag bits in the VP8X
// header so decoders don't expect them.

// VP8X flags byte (first payload byte): Rsv Rsv ICC Alpha EXIF XMP Anim Rsv
const VP8X_FLAG_EXIF = 0x08;
const VP8X_FLAG_XMP = 0x04;

const fourccAt = (bytes, offset) =>
  String.fromCharCode(
    bytes[offset],
    bytes[offset + 1],
    bytes[offset + 2],
    bytes[offset + 3]
  );

/**
 * @param {ArrayBuffer} arrayBuffer  the original WebP bytes
 * @returns {{ blob: Blob, removed: string[] }}  stripped blob + which metadata
 *   chunks were removed (e.g. ["EXIF", "XMP"]). On a non-WebP / metadata-free /
 *   malformed buffer it returns the original bytes unchanged with removed: [].
 */
export function stripWebpMetadata(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const asIs = () => ({
    blob: new Blob([arrayBuffer], { type: "image/webp" }),
    removed: [],
  });

  // Validate "RIFF"…"WEBP".
  if (
    bytes.length < 12 ||
    fourccAt(bytes, 0) !== "RIFF" ||
    fourccAt(bytes, 8) !== "WEBP"
  ) {
    return asIs();
  }

  const view = new DataView(arrayBuffer);
  const kept = []; // { start, fourcc, padded }
  const removed = [];
  let offset = 12;

  while (offset + 8 <= bytes.length) {
    const fourcc = fourccAt(bytes, offset);
    const size = view.getUint32(offset + 4, true);
    if (offset + 8 + size > bytes.length) break; // malformed → stop walking
    const padded = size + (size & 1); // chunks are padded to an even length
    if (fourcc === "EXIF" || fourcc === "XMP ") {
      removed.push(fourcc.trim());
    } else {
      kept.push({ start: offset, fourcc, padded });
    }
    offset += 8 + padded;
  }

  // Nothing sensitive in the container → leave the file byte-for-byte intact.
  if (removed.length === 0) return asIs();

  // Rebuild: "RIFF" + new size + "WEBP" + the kept chunks.
  let bodySize = 4; // the "WEBP" tag
  kept.forEach((c) => {
    bodySize += 8 + c.padded;
  });

  const out = new Uint8Array(8 + bodySize);
  const outView = new DataView(out.buffer);
  out.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
  outView.setUint32(4, bodySize, true);
  out.set([0x57, 0x45, 0x42, 0x50], 8); // "WEBP"

  let w = 12;
  kept.forEach((c) => {
    // Copy the chunk header (8 bytes) + payload (padded). subarray clamps if the
    // source omitted a trailing pad byte at EOF; the missing byte stays 0.
    out.set(bytes.subarray(c.start, c.start + 8 + c.padded), w);
    if (c.fourcc === "VP8X") {
      // Clear the EXIF/XMP flag bits now that those chunks are gone.
      out[w + 8] = out[w + 8] & ~VP8X_FLAG_EXIF & ~VP8X_FLAG_XMP;
    }
    w += 8 + c.padded;
  });

  return { blob: new Blob([out], { type: "image/webp" }), removed };
}
