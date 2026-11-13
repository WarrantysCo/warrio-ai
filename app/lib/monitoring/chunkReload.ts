// After a new deploy, a visitor who already has the site open can click
// something that needs a JS file from the OLD build — the file is gone, so
// the click fails with "Loading chunk ... failed" and the page goes dead.
// The fix is a normal page reload: it fetches the current build fresh. We
// only do this once per page load (sessionStorage guard) so a genuinely
// broken chunk can't reload forever.

const RELOAD_FLAG = "warrio_chunk_reload";

export function isChunkLoadError(error: { name?: string; message?: string } | undefined | null) {
  if (!error) return false;
  const text = `${error.name ?? ""} ${error.message ?? ""}`;
  return /ChunkLoadError|Loading chunk .* failed|Importing a module script failed/i.test(text);
}

export function reloadForChunkError() {
  if (typeof window === "undefined") return false;
  try {
    if (window.sessionStorage.getItem(RELOAD_FLAG)) return false;
    window.sessionStorage.setItem(RELOAD_FLAG, "1");
  } catch {
    // If sessionStorage is unavailable, still reload once; worst case the
    // user sees the normal error screen next time.
  }
  window.location.reload();
  return true;
}
