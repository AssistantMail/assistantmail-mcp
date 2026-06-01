# Contributing to assistantmail-mcp

Thanks for your interest in contributing.

## Prerequisites

- Node.js 24 or newer
- npm

## Local development

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Run checks:

   ```bash
   npm run lint
   npm run build
   ```

3. Run the server locally:

   ```bash
   npm start
   ```

## Coding guidelines

- Keep changes focused and minimal.
- Follow the existing code style and module structure.
- Avoid introducing breaking changes unless discussed first.
- Update docs when behavior or usage changes.

## Pull request process

1. Create a branch from `main`.
2. Make your changes and run:

   ```bash
   npm run lint
   npm run build
   ```

3. Open a pull request targeting `main`.
4. Include a clear description of:
   - What changed
   - Why it changed
   - Any user-facing impact

## Reporting issues

When filing a bug, include:

- Steps to reproduce
- Expected behavior
- Actual behavior
- Relevant logs or errors
- Node.js version
