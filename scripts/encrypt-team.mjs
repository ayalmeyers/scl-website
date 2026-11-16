#!/usr/bin/env node
// Encrypts the team page's protected content into team.html.
//
// The protected content (hub link, quick links, notes) never sits in the
// repo as plain text. team.html carries only ciphertext in
// <script type="application/json" id="team-vault">, which team-access.js
// decrypts in the browser with the team password.
//
// Format (must match team-access.js):
//   key  = PBKDF2-HMAC-SHA256(password, salt[16 random bytes], iterations) -> 256-bit AES key
//   data = AES-256-GCM(key, iv[12 random bytes], UTF-8 JSON of the content)
//
// Usage (Node 20+, no dependencies):
//   Change the password, keep the content:
//     node scripts/encrypt-team.mjs --rotate
//   Change the content (edit a JSON file outside the repo, see
//   scripts/team-payload.example.json), with the current or a new password:
//     node scripts/encrypt-team.mjs --in ~/scl-team-payload.json
//   Print the current content so you can edit it:
//     node scripts/encrypt-team.mjs --decrypt > ~/scl-team-payload.json
//
// Passwords are asked for on the terminal (input hidden). For scripted use,
// set TEAM_PASSWORD (and TEAM_PASSWORD_OLD for --rotate / --decrypt reads
// TEAM_PASSWORD). Never commit a password or the plain-text payload file.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import readline from "node:readline";

const { subtle } = globalThis.crypto;
const getRandomValues = (a) => globalThis.crypto.getRandomValues(a);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PAGE = path.join(ROOT, "team.html");
const VAULT_RE = /(<script type="application\/json" id="team-vault">)([\s\S]*?)(<\/script>)/;
const MIN_ITERATIONS = 600000;

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const b64 = (bytes) => Buffer.from(bytes).toString("base64");
const unb64 = (s) => new Uint8Array(Buffer.from(s, "base64"));

async function deriveKey(password, salt, iterations) {
  const base = await subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encrypt(content, password, iterations) {
  const salt = getRandomValues(new Uint8Array(16));
  const iv = getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, iterations);
  const ct = await subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(content)));
  return {
    v: 1,
    kdf: { name: "PBKDF2", hash: "SHA-256", iterations, salt: b64(salt) },
    cipher: { name: "AES-GCM", iv: b64(iv) },
    ct: b64(new Uint8Array(ct))
  };
}

async function decrypt(vault, password) {
  const key = await deriveKey(password, unb64(vault.kdf.salt), vault.kdf.iterations);
  try {
    const pt = await subtle.decrypt({ name: "AES-GCM", iv: unb64(vault.cipher.iv) }, key, unb64(vault.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  } catch {
    throw new Error("Wrong password: the current team.html payload did not decrypt.");
  }
}

function validate(content) {
  const bad = (m) => { throw new Error("Payload: " + m); };
  if (!content || typeof content !== "object") bad("must be a JSON object");
  if (!/^https:\/\//.test(content.hubUrl || "")) bad("hubUrl must be an https:// URL");
  if (!Array.isArray(content.links)) bad("links must be an array");
  content.links.forEach((l, i) => {
    if (!l.label) bad(`links[${i}].label is required`);
    if (l.url && !/^https:\/\//.test(l.url)) bad(`links[${i}].url must be https://`);
    if (l.hash && !/^[a-z]+(\/[a-z]+)?$/.test(l.hash)) bad(`links[${i}].hash must look like "book/checks"`);
  });
  if (content.embedUrl && !/^https:\/\//.test(content.embedUrl)) bad("embedUrl must be https:// or null");
  return content;
}

function ask(question) {
  if (!process.stdin.isTTY) throw new Error("No terminal for a password prompt; set TEAM_PASSWORD instead.");
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.startsWith(question)) process.stdout.write(question); };
    rl.question(question, (answer) => { rl.close(); process.stdout.write("\n"); resolve(answer); });
  });
}

async function newPassword() {
  if (process.env.TEAM_PASSWORD) return process.env.TEAM_PASSWORD;
  const a = await ask("New team password: ");
  const b = await ask("Repeat it: ");
  if (a !== b) throw new Error("The two passwords do not match.");
  return a;
}

function readVault(html) {
  const m = html.match(VAULT_RE);
  if (!m) throw new Error('team.html has no <script type="application/json" id="team-vault"> block.');
  const raw = m[2].trim();
  return raw ? JSON.parse(raw) : null;
}

async function main() {
  const html = readFileSync(PAGE, "utf8");
  const iterations = Math.max(MIN_ITERATIONS, Number(opt("--iterations")) || MIN_ITERATIONS);

  if (flag("--decrypt")) {
    const pw = process.env.TEAM_PASSWORD || (await ask("Current team password: "));
    process.stdout.write(JSON.stringify(await decrypt(readVault(html), pw), null, 2) + "\n");
    return;
  }

  let content;
  if (opt("--in")) {
    content = JSON.parse(readFileSync(opt("--in"), "utf8"));
  } else if (flag("--rotate")) {
    const old = process.env.TEAM_PASSWORD_OLD || (await ask("Current team password: "));
    content = await decrypt(readVault(html), old);
  } else {
    console.error("Usage: node scripts/encrypt-team.mjs --rotate | --in <payload.json> | --decrypt");
    process.exit(2);
  }
  validate(content);

  const pw = await newPassword();
  if (pw.length < 12) throw new Error("Use at least 12 characters (three words and a number works well).");

  const vault = await encrypt(content, pw, iterations);
  const back = await decrypt(vault, pw); // round-trip check before writing
  if (JSON.stringify(back) !== JSON.stringify(content)) throw new Error("Round-trip check failed; nothing written.");

  writeFileSync(PAGE, html.replace(VAULT_RE, `$1${JSON.stringify(vault)}$3`));
  console.log(`team.html updated: ${content.links.length} links, PBKDF2-SHA256 x${iterations}, AES-256-GCM.`);
  console.log("Everyone who chose \"Remember me\" will be asked for the new password on their next visit.");
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
