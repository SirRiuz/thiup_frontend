// Extracts pasted FILES (e.g. a copied screenshot or a copied image) from a
// paste event. Most browsers populate clipboardData.files directly; Firefox
// only exposes a pasted image via clipboardData.items (kind "file") — try
// both before concluding the paste was plain text.
export function filesFromClipboard(e) {
  const dt = e.clipboardData || window.clipboardData;
  if (!dt) return [];
  if (dt.files && dt.files.length > 0) return Array.from(dt.files);
  if (dt.items) {
    return Array.from(dt.items)
      .filter((it) => it.kind === "file")
      .map((it) => it.getAsFile())
      .filter(Boolean);
  }
  return [];
}
