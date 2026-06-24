// Reads image metadata (EXIF/XMP/ICC in JPEG, chunks in PNG and WebP) purely
// for the "before" report. The compressed output is re-encoded through a
// <canvas>, so it never carries any metadata — the "after" is always none.
//
// Ported from the standalone reference demo (image part only). Returns:
//   { format: "JPEG" | "PNG" | "WebP" | <mime-derived>, items: [{ label, value?, sensitive? }] }

function readAscii(view, off, len) {
  let s = "";
  for (let i = 0; i < len && off + i < view.byteLength; i += 1) {
    const c = view.getUint8(off + i);
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  return s;
}

function dedupe(items) {
  const seen = new Set();
  const out = [];
  items.forEach((it) => {
    const key = `${it.label}|${it.value || ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(it);
    }
  });
  return out;
}

function readTagValue(view, tiffStart, e, type, count, u16, u32) {
  if (type === 2) {
    // ASCII
    const off = count <= 4 ? e + 8 : tiffStart + u32(e + 8);
    return readAscii(view, off, count).replace(/\0+$/, "").trim();
  }
  if (type === 3) return u16(e + 8); // SHORT
  if (type === 4) return u32(e + 8); // LONG
  return null;
}

// Reads an IFD, returning tags with readable scalar values (ASCII/num).
function readIFD(view, tiffStart, ifdOffset, u16, u32) {
  const out = {};
  const n = u16(ifdOffset);
  for (let i = 0; i < n; i += 1) {
    const e = ifdOffset + 2 + i * 12;
    const tag = u16(e);
    const type = u16(e + 2);
    const count = u32(e + 4);
    if (tag === 0x8769 || tag === 0x8825) {
      out[tag] = u32(e + 8); // sub-IFD pointers
      // eslint-disable-next-line no-continue
      continue;
    }
    out[tag] = readTagValue(view, tiffStart, e, type, count, u16, u32);
  }
  return out;
}

// Same, but keeps raw offsets for RATIONALs (GPS).
function readIFDRaw(view, tiffStart, ifdOffset, u16, u32) {
  const out = {};
  const n = u16(ifdOffset);
  for (let i = 0; i < n; i += 1) {
    const e = ifdOffset + 2 + i * 12;
    const tag = u16(e);
    const type = u16(e + 2);
    const count = u32(e + 4);
    out[tag] = { type, count, valOff: e + 8 };
  }
  return out;
}

function gpsDecimal(view, tiffStart, coordField, refField, le) {
  try {
    if (!coordField || coordField.type !== 5 || coordField.count < 3) return null;
    const off = tiffStart + view.getUint32(coordField.valOff, le); // 3 RATIONALs -> pointer
    const rat = (p) => {
      const num = view.getUint32(p, le);
      const den = view.getUint32(p + 4, le);
      return den ? num / den : 0;
    };
    const deg = rat(off);
    const min = rat(off + 8);
    const sec = rat(off + 16);
    let dec = deg + min / 60 + sec / 3600;
    let ref = "";
    if (refField && refField.type === 2) ref = readAscii(view, refField.valOff, 2);
    if (ref === "S" || ref === "W") dec = -dec;
    return dec;
  } catch (err) {
    return null;
  }
}

function parseExif(view, tiffStart, items) {
  try {
    const le = readAscii(view, tiffStart, 2) === "II"; // II = little endian
    const u16 = (p) => view.getUint16(p, le);
    const u32 = (p) => view.getUint32(p, le);
    const ifd0 = tiffStart + u32(tiffStart + 4);
    const tags = readIFD(view, tiffStart, ifd0, u16, u32);

    const make = tags[0x010f];
    const model = tags[0x0110];
    const dt = tags[0x0132];
    if (make || model) {
      items.push({
        label: "Camera",
        value: [make, model].filter(Boolean).join(" ").trim(),
      });
    }
    if (dt) items.push({ label: "Date", value: dt });

    // EXIF sub-IFD (original date)
    if (tags[0x8769]) {
      const exTags = readIFD(view, tiffStart, tiffStart + tags[0x8769], u16, u32);
      if (exTags[0x9003] && !dt) items.push({ label: "Date", value: exTags[0x9003] });
    }
    // GPS
    if (tags[0x8825]) {
      const gps = readIFDRaw(view, tiffStart, tiffStart + tags[0x8825], u16, u32);
      const lat = gpsDecimal(view, tiffStart, gps[0x0002], gps[0x0001], le);
      const lon = gpsDecimal(view, tiffStart, gps[0x0004], gps[0x0003], le);
      if (lat != null && lon != null) {
        items.push({
          label: "GPS (location)",
          value: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
          sensitive: true,
        });
      }
    }
  } catch (err) {
    /* malformed EXIF: skip */
  }
}

function parseJPEG(view) {
  const items = [];
  let o = 2;
  while (o < view.byteLength - 1) {
    if (view.getUint8(o) !== 0xff) break;
    const marker = view.getUint8(o + 1);
    if (marker === 0xd9 || marker === 0xda) break; // EOI or start of scan
    const len = view.getUint16(o + 2);
    const segStart = o + 4;
    if (marker === 0xe0) items.push({ label: "JFIF" });
    else if (marker === 0xe1) {
      const sig = readAscii(view, segStart, 6);
      if (sig.startsWith("Exif")) {
        items.push({ label: "EXIF" });
        parseExif(view, segStart + 6, items);
      } else if (sig.startsWith("http")) items.push({ label: "XMP" });
    } else if (marker === 0xe2) {
      if (readAscii(view, segStart, 11).startsWith("ICC")) {
        items.push({ label: "ICC color profile" });
      }
    } else if (marker === 0xed) items.push({ label: "Photoshop / IPTC" });
    else if (marker === 0xee) items.push({ label: "Adobe" });
    else if (marker === 0xfe) items.push({ label: "Comment" });
    o += 2 + len;
  }
  return { format: "JPEG", items: dedupe(items) };
}

function parsePNG(view) {
  const items = [];
  let o = 8;
  while (o < view.byteLength - 8) {
    const len = view.getUint32(o);
    const type = readAscii(view, o + 4, 4);
    if (type === "tEXt" || type === "iTXt" || type === "zTXt") {
      items.push({ label: `Text (${type})` });
    } else if (type === "eXIf") items.push({ label: "EXIF" });
    else if (type === "tIME") items.push({ label: "Modification date" });
    else if (type === "iCCP") items.push({ label: "ICC color profile" });
    else if (type === "gAMA" || type === "cHRM") {
      items.push({ label: `Color data (${type})` });
    }
    if (type === "IEND") break;
    o += 12 + len;
  }
  return { format: "PNG", items: dedupe(items) };
}

function parseWEBP(view) {
  const items = [];
  let o = 12;
  while (o < view.byteLength - 8) {
    const fourcc = readAscii(view, o, 4);
    const len = view.getUint32(o + 4, true);
    if (fourcc === "EXIF") items.push({ label: "EXIF" });
    else if (fourcc === "XMP ") items.push({ label: "XMP" });
    else if (fourcc === "ICCP") items.push({ label: "ICC color profile" });
    o += 8 + len + (len % 2);
  }
  return { format: "WebP", items: dedupe(items) };
}

export function readImageMetadata(buf, mime) {
  const view = new DataView(buf);
  try {
    if (view.byteLength > 3 && view.getUint8(0) === 0xff && view.getUint8(1) === 0xd8) {
      return parseJPEG(view);
    }
    if (view.byteLength > 8 && view.getUint32(0) === 0x89504e47) return parsePNG(view);
    if (
      view.byteLength > 12 &&
      view.getUint32(0) === 0x52494646 &&
      view.getUint32(8) === 0x57454250
    ) {
      return parseWEBP(view);
    }
  } catch (err) {
    /* unreadable header: fall through */
  }
  return { format: mime ? mime.split("/")[1].toUpperCase() : "—", items: [] };
}
