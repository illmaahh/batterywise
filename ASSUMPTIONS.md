# Assumptions and limits

- The default solar share is 40% of measured annual demand. The browser scales the measured profile by `share × annual demand / annual estimated solar`. It is an adjustable scenario, not a forecast.
- The web simulator uses 8,784 consecutive hourly-average MW values in UTC. For a one-hour interval, MW average is numerically equal to MWh energy.
- Demand is NESO National Demand (`ND`). Embedded solar output is NESO’s estimate, not directly metered PV generation.
- Battery inputs are grid-scale MWh capacity and MW power. Dispatch starts at the configured state of charge and obeys configured minimum and maximum bounds.
- Initial stored energy is treated as non-solar. Solar-origin energy is tracked separately when estimating solar served. The battery is mixed as a homogeneous pool when solar and initial energy coexist.
- Charging only uses coincident solar surplus; discharge only serves coincident demand deficit. There is no grid charging.
- Default charge and discharge efficiencies are each 100%, an optimistic lossless upper bound. Both are editable; round-trip efficiency is their product. Losses are reported.
- Equivalent full cycles are annual battery-to-load energy divided by nameplate capacity.
- Residual demand is demand supplied by other sources, not a blackout.
- The model is an unconstrained GB-wide balance. It does not model location, transmission limits, degradation, reserve dispatch, forecast uncertainty, price formation, investment costs, or reliability.
- This analysis does not imply a battery at one site can access all national surplus or establish project economics.
