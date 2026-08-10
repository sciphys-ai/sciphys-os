#!/usr/bin/env node

const { version } = require("../package.json");

const releaseTag = process.argv[2];
const expectedTag = `v${version}`;

if (!releaseTag) {
  console.error("Usage: node scripts/verify-release-tag.cjs <release-tag>");
  process.exit(2);
}

if (releaseTag !== expectedTag) {
  console.error(
    `Release tag ${JSON.stringify(releaseTag)} does not match package version ${JSON.stringify(expectedTag)}.`,
  );
  process.exit(1);
}

console.log(`Release tag ${releaseTag} matches package version ${version}.`);
