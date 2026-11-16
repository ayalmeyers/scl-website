#!/usr/bin/env node
// Builds the plain-text payload for gifts.html from the scl-gifts repo
// (js/config.js and js/products.js). Print it to a file OUTSIDE this repo,
// then encrypt it with scripts/encrypt-team.mjs --page gifts.
//
//   node scripts/gifts-payload.mjs ../scl-gifts > ~/scl-gifts-payload.json
//   GIFTS_PASSWORD=... node scripts/encrypt-team.mjs --page gifts --in ~/scl-gifts-payload.json
//
// Photos that live in scl-gifts (images/products/<file>) are served from
// gifts-images/<file> in this repo; copy any new ones there. Photos that
// are https:// URLs are left alone. Never commit the payload file.

import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

const repo = process.argv[2];
if (!repo) {
  console.error("Usage: node scripts/gifts-payload.mjs <path to the scl-gifts repo>");
  process.exit(2);
}

const sandbox = { window: {} };
vm.createContext(sandbox);
for (const f of ["js/config.js", "js/products.js"]) {
  vm.runInContext(readFileSync(path.join(repo, f), "utf8"), sandbox, { filename: f });
}
const config = sandbox.window.SCL_GIFTS_CONFIG;
const products = sandbox.window.SCL_GIFTS_PRODUCTS;
if (!config || !Array.isArray(products)) {
  console.error("Could not read SCL_GIFTS_CONFIG and SCL_GIFTS_PRODUCTS from " + repo);
  process.exit(1);
}

const local = (u) => (/^https:\/\//.test(u) ? u : u.replace(/^images\/products\//, "gifts-images/"));
const out = {
  config: { ...config, orderEndpoint: "" },
  products: JSON.parse(JSON.stringify(products)).map((p) => {
    if (p.images) p.images = p.images.map(local);
    if (p.colorImages) for (const k of Object.keys(p.colorImages)) p.colorImages[k] = local(p.colorImages[k]);
    return p;
  })
};
process.stdout.write(JSON.stringify(out, null, 2) + "\n");
