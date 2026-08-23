const NS = 'docsify-screenreader';
const PREFIX = NS + ':';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) {}
}

function remove(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch (e) {}
}

export default { read, write, remove, NS };
