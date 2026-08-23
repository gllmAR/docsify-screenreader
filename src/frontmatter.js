const FM_RE = /^\uFEFF?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/;

export function parseFrontMatter(markdown) {
  const out = {};
  const m = FM_RE.exec(markdown || '');
  if (!m) return out;
  for (let line of m[1].split(/\r?\n/)) {
    line = line.trim();
    if (!line || line.charAt(0) === '#') continue;
    const kv = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line);
    if (!kv) continue;
    let v = kv[2].trim();
    if (v.length > 1 && ((v.charAt(0) === '"' && v.charAt(v.length - 1) === '"') || (v.charAt(0) === "'" && v.charAt(v.length - 1) === "'"))) {
      v = v.slice(1, -1);
    }
    out[kv[1].toLowerCase()] = v;
  }
  return out;
}
