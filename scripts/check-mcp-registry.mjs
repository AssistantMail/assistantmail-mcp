#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const server = JSON.parse(readFileSync(join(root, 'server.json'), 'utf8'));

const errors = [];

if (typeof pkg.mcpName !== 'string' || pkg.mcpName.length === 0) {
  errors.push('package.json is missing mcpName.');
} else if (pkg.mcpName !== server.name) {
  errors.push(`package.json mcpName (${pkg.mcpName}) must match server.json name (${server.name}).`);
}

if (pkg.version !== server.version) {
  errors.push(`package.json version (${pkg.version}) must match server.json version (${server.version}).`);
}

if (typeof server.description !== 'string' || server.description.length === 0) {
  errors.push('server.json description is required.');
} else if (server.description.length > 100) {
  errors.push(`server.json description is ${server.description.length} chars (max 100).`);
}

if (server.websiteUrl !== 'https://assistant-mail.ai/docs') {
  errors.push('server.json websiteUrl must be https://assistant-mail.ai/docs.');
}

const npmPkg = server.packages?.find((item) => item.registryType === 'npm');
if (!npmPkg) {
  errors.push('server.json must include an npm package.');
} else {
  if (npmPkg.identifier !== pkg.name) {
    errors.push(`npm identifier (${npmPkg.identifier}) must match package.json name (${pkg.name}).`);
  }
  if (npmPkg.version !== pkg.version) {
    errors.push(`npm package version (${npmPkg.version}) must match package.json version (${pkg.version}).`);
  }
  if (npmPkg.transport?.type !== 'stdio') {
    errors.push('npm package transport.type must be stdio.');
  }
}

if (errors.length > 0) {
  for (const message of errors) {
    console.error(message);
  }
  process.exit(1);
}

console.log('server.json packaging checks passed.');
