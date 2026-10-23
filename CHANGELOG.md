# Changelog

## 0.3.0 — Detailed interactive field note
- Added the selectable one-week story chart with demand, scaled solar, residual demand and data-derived annotations.
- Added editable battery and advanced dispatch inputs, live reference-capacity comparison, hourly state-of-charge view, losses and CSV export.
- Added a marginal-energy curve, full dispatch equations, limits, data quality table, contribution roadmap and live recalculation metadata.
- Added a browser model that tracks solar-origin energy separately from configured initial stored energy.

## 0.2.0 — Great Britain data-backed simulator
- Selected NESO’s openly licensed Great Britain dataset and validated the complete 2024 year.
- Converted 17,568 half-hour periods into 8,784 consecutive UTC-hour averages, preserving clock-change coverage.
- Rebuilt the front end as a compact static website with no runtime API requests or third-party dependencies.
