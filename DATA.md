# Data and validation

## Chosen case: Great Britain, 2024

**Primary source:** National Energy System Operator (NESO), [Historic Demand Data 2024](https://www.neso.energy/data-portal/historic-demand-data/historic_demand_data_2024), licensed under the [NESO Open Data Licence v1.0](https://www.neso.energy/data-portal/neso-open-licence). The source describes `ND` as National Demand in MW and `EMBEDDED_SOLAR_GENERATION` as NESO’s estimate of GB embedded PV generation in MW. The solar series is an estimate because embedded PV is not directly visible to NESO’s transmission metering.

Raw source file: `data/raw/demanddata_2024.csv` (downloaded 2026-10-24 from NESO’s CSV resource). The raw folder is excluded from Git; the processed app data is `web/data.js`.

## Validation and conversion

- 17,568 source rows; each date has the correct settlement-period sequence for its clock-change day.
- No missing values in either selected field; no negative values.
- 2024 is a leap year; the final series contains 8,784 consecutive UTC-hour averages.
- Each half-hour value is average power in MW. The two half-hour MW values in a UTC hour are averaged to produce that hour’s average MW. For one hour, energy in MWh is numerically equal to average MW.
- 2024 demand total: 230.90 TWh. NESO estimated embedded solar total: 13.95 TWh.
- The browser app scales the measured solar profile so its annual energy equals the selected share of annual demand. This scaling is an adjustable scenario, not observed or forecast generation.

Recreate the derived JavaScript data by downloading the source to `data/raw/demanddata_2024.csv` and running `python scripts/process_neso.py`. The conversion script rejects missing, negative, incomplete, or misaligned data.
