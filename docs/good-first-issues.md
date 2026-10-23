# Good first issues

Each task should preserve a reproducible workflow and document assumptions.

1. **Add a second licensed grid dataset.** Pick a country with a complete year of demand and generation, document the licence, reconcile time conventions, and add a validation report.
2. **Compare a dispatch rule.** Add a strategy interface and compare surplus-first dispatch with a clearly described alternative.
3. **Track renewable origin in state of charge.** Keep solar-origin energy separate from configured initial charge and add attribution cases.
4. **Export scenario JSON.** Include source version, assumptions, units, results and a hash of the processed input series.
5. **Improve chart keyboard inspection.** Make hourly points navigable and provide a compact tabular alternative for each chart.
6. **Add full-year conservation checks.** Validate interval and annual energy balances over several efficiencies, state-of-charge bounds and battery sizes.

For any item, include a focused test, update relevant documentation, and keep all units explicit.
