// Script to update version.json with current timestamp
const fs = require('fs');
const path = require('path');

const versionFile = path.join(__dirname, 'version.json');
const version = require('./version.json');

// Update build time
version.buildTime = new Date().toISOString();

// Write back
fs.writeFileSync(versionFile, JSON.stringify(version, null, 2) + '\n');

console.log(`✅ Updated version.json: v${version.version} at ${version.buildTime}`);
