const SERVICE_CATEGORIES = require("./subscription-categories");
const normalizeServiceName = require("./normalize-service");

function ruleBasedCategory(serviceName) {
  const normalized = normalizeServiceName(serviceName);

  if (SERVICE_CATEGORIES[normalized]) {
    return SERVICE_CATEGORIES[normalized];
  }

  return null;
}

module.exports = ruleBasedCategory;