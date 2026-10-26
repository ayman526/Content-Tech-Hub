/**
 * bump-plugin-version.ts
 *
 * Atomically updates the WordPress plugin version in all three locations:
 *   1. lib/wordpress-plugin-version.ts          (PLUGIN_VERSION constant)
 *   2. wordpress-plugin/contentech/contentech.php (Version: header)
 *   3. wordpress-plugin/contentech/contentech.php (CONTENTECH_VERSION constant)
 *
 * Usage:
 *   npx tsx scripts/bump-plugin-version.ts <new-version>
 *
 * Example:
 *   npx tsx scripts/bump-plugin-version.ts 1.1.0
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

function validateSemver(v: string): void {
  if (!/^\d+\.\d+\.\d+$/.test(v)) {
    console.error(`Error: "${v}" is not a valid semver string (expected x.y.z).`);
    process.exit(1);
  }
}

function replaceOnce(content: string, pattern: RegExp, replacement: string, label: string): string {
  const updated = content.replace(pattern, replacement);
  if (updated === content) {
    console.error(`Error: Could not find ${label} to replace.`);
    process.exit(1);
  }
  return updated;
}

function main() {
  const newVersion = process.argv[2];
  if (!newVersion) {
    console.error("Usage: npx tsx scripts/bump-plugin-version.ts <new-version>");
    process.exit(1);
  }
  validateSemver(newVersion);

  const versionFilePath = path.join(ROOT, "lib", "wordpress-plugin-version.ts");
  const phpFilePath = path.join(ROOT, "wordpress-plugin", "contentech", "contentech.php");

  let versionFile = fs.readFileSync(versionFilePath, "utf8");
  let phpFile = fs.readFileSync(phpFilePath, "utf8");

  versionFile = replaceOnce(
    versionFile,
    /^(export const PLUGIN_VERSION = ")[^"]+(";\s*)$/m,
    `$1${newVersion}$2`,
    "PLUGIN_VERSION in lib/wordpress-plugin-version.ts"
  );

  phpFile = replaceOnce(
    phpFile,
    /^( \* Version:\s+)\S+/m,
    `$1${newVersion}`,
    "Version: header in contentech.php"
  );

  phpFile = replaceOnce(
    phpFile,
    /^(define\( 'CONTENTECH_VERSION',\s+')\d+\.\d+\.\d+(' \);)/m,
    `$1${newVersion}$2`,
    "CONTENTECH_VERSION constant in contentech.php"
  );

  fs.writeFileSync(versionFilePath, versionFile, "utf8");
  fs.writeFileSync(phpFilePath, phpFile, "utf8");

  console.log(`Plugin version bumped to ${newVersion} in:`);
  console.log(`  lib/wordpress-plugin-version.ts`);
  console.log(`  wordpress-plugin/contentech/contentech.php`);
}

main();
