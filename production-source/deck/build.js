// Deck build dispatcher: DEMO_LANG=en (default) | ko  ->  deck/<lang>/build.js
// Usage: node build.js [out.pptx]      e.g. DEMO_LANG=ko node build.js ../out-ko.pptx
const fs = require("fs");
const path = require("path");

const lang = (process.env.DEMO_LANG || "en").toLowerCase();
const entry = path.join(__dirname, lang, "build.js");
if (!fs.existsSync(entry)) {
  console.error(`Unsupported DEMO_LANG=${lang}: ${entry} not found`);
  process.exit(1);
}
require(entry);
