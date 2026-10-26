#!/usr/bin/env bash
# Build script — packages the Contentech WordPress plugin into a distributable zip.
#
# Usage:
#   bash wordpress-plugin/build.sh [output-dir]
#
# The zip is placed in the output directory (default: wordpress-plugin/dist/).
# The plugin directory inside the zip is always named "contentech" so WordPress
# extracts it correctly.
#
# Requirements: Node.js (uses a small inline Node script to zip).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$SCRIPT_DIR/contentech"
OUTPUT_DIR="${1:-$SCRIPT_DIR/dist}"
VERSION="1.0.0"
OUT_FILE="$OUTPUT_DIR/contentech-${VERSION}.zip"

mkdir -p "$OUTPUT_DIR"

# Use Node.js (adm-zip) to create the zip — no system zip required.
node - "$PLUGIN_DIR" "$OUT_FILE" << 'NODEJS'
const AdmZip = require('adm-zip');
const fs     = require('fs');
const path   = require('path');

const [,, pluginDir, outFile] = process.argv;

if (!fs.existsSync(pluginDir)) {
    console.error('Plugin directory not found:', pluginDir);
    process.exit(1);
}

const zip = new AdmZip();

function addDir(dir, prefix) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full   = path.join(dir, entry.name);
        const target = prefix + '/' + entry.name;
        if (entry.isDirectory()) {
            addDir(full, target);
        } else {
            zip.addLocalFile(full, prefix);
        }
    }
}

addDir(pluginDir, 'contentech');
zip.writeZip(outFile);
console.log('Plugin zip written to:', outFile);
NODEJS
