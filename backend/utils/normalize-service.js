function normalizeServiceName(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/inc|llc|ltd|\.com/g, "")
    .replace(/\s+/g, " ");
}

module.exports = normalizeServiceName;