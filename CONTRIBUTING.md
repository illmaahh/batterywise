# Contributing

Keep source provenance, units and assumptions explicit. Do not invent values or silently interpolate observations. For substantial changes, open an issue or start with one from [the good first issue list](docs/good-first-issues.md).

## Development checks

- Python reference: `python -m pytest`
- Browser model parity: from `web`, run `node --test ../tests/web_model.test.cjs`
- Static site build: from `web`, run `node build.mjs`

No Node package installation is required.
