export function normalize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u00C0-\u024F\u4e00-\u9fff\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}