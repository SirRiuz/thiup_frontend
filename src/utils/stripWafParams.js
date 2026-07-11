// Cloudflare's WAF/challenge flow sometimes leaves its challenge token in the
// final URL after the redirect (e.g. ?__cf_chl_f_tk=..., ?__cf_chl_tk=...,
// ?__cf_chl_rt_tk=...). It's harmless but looks broken/suspicious in the
// address bar and gets copied into shared links. Cloudflare offers no switch to
// suppress it, so we scrub it CLIENT-SIDE on boot: history.replaceState swaps
// the clean URL in place — no reload, no new history entry, and it runs before
// React/the router mount so nothing downstream ever sees the token.
//
// Only Cloudflare's own params are removed (every challenge param starts with
// "__cf_chl"); real app params (?q=..., etc.) are preserved untouched.

const CF_PARAM_PREFIX = "__cf_chl";

export default function stripWafParams() {
  if (typeof window === "undefined" || !window.history?.replaceState) return;
  const { search } = window.location;
  if (!search || search.indexOf(CF_PARAM_PREFIX) === -1) return;

  try {
    const params = new URLSearchParams(search);
    const toDelete = [];
    params.forEach((value, key) => {
      if (key.startsWith(CF_PARAM_PREFIX)) toDelete.push(key);
    });
    if (toDelete.length === 0) return;
    toDelete.forEach((key) => params.delete(key));

    const query = params.toString();
    const clean =
      window.location.pathname +
      (query ? `?${query}` : "") +
      window.location.hash;
    window.history.replaceState(window.history.state, "", clean);
  } catch (err) {
    /* malformed URL — leave it as-is */
  }
}
