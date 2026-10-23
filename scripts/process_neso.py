import csv
import hashlib
import json
import math
from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data/raw/demanddata_2024.csv"
OUTPUT = ROOT / "web/data.js"
CHART = ROOT / "docs/great-britain-summer-week.svg"
YEAR = 2024
EXPECTED_DAYS = [date(YEAR, 1, 1) + timedelta(days=i) for i in range(366)]
ZONE = ZoneInfo("Europe/London")

with SOURCE.open(newline="", encoding="utf-8-sig") as stream:
    source_rows = list(csv.DictReader(stream))

required = {"SETTLEMENT_DATE", "SETTLEMENT_PERIOD", "ND", "EMBEDDED_SOLAR_GENERATION"}
if not source_rows or not required.issubset(source_rows[0]):
    raise ValueError(f"Source file is missing required columns: {sorted(required)}")

by_date = defaultdict(list)
for row in source_rows:
    day = datetime.strptime(row["SETTLEMENT_DATE"], "%d-%b-%Y").date()
    by_date[day].append(row)
if set(by_date) != set(EXPECTED_DAYS):
    raise ValueError("Source does not contain exactly every date in 2024")

hourly = []
for day in EXPECTED_DAYS:
    day_rows = sorted(by_date[day], key=lambda row: int(row["SETTLEMENT_PERIOD"]))
    start = datetime.combine(day, time(), ZONE).astimezone(timezone.utc)
    end = datetime.combine(day + timedelta(days=1), time(), ZONE).astimezone(timezone.utc)
    slots = []
    cursor = start
    while cursor < end:
        slots.append(cursor)
        cursor += timedelta(minutes=30)

    periods = [int(row["SETTLEMENT_PERIOD"]) for row in day_rows]
    if periods != list(range(1, len(slots) + 1)):
        raise ValueError(f"{day}: settlement periods do not match its local clock-change day")

    values = []
    for row in day_rows:
        demand_text, solar_text = row["ND"], row["EMBEDDED_SOLAR_GENERATION"]
        if not demand_text or not solar_text:
            raise ValueError(f"Missing demand or solar at {day}")
        demand_mw, solar_mw = float(demand_text), float(solar_text)
        if not math.isfinite(demand_mw) or not math.isfinite(solar_mw) or demand_mw < 0 or solar_mw < 0:
            raise ValueError(f"Invalid demand or solar value at {day}")
        values.append((demand_mw, solar_mw))

    for i in range(0, len(values), 2):
        if slots[i].minute != 0 or i + 1 >= len(values):
            raise ValueError(f"Settlement periods do not align to UTC hours on {day}")
        demand = (values[i][0] + values[i + 1][0]) / 2
        solar = (values[i][1] + values[i + 1][1]) / 2
        hourly.append((slots[i], demand, solar))

if len(source_rows) != 17_568 or len(hourly) != 8_784:
    raise ValueError(f"Unexpected source/output lengths: {len(source_rows)} / {len(hourly)}")
if any(hourly[i][0] + timedelta(hours=1) != hourly[i + 1][0] for i in range(len(hourly) - 1)):
    raise ValueError("Processed UTC series contains a gap or duplicate hour")

payload = {
    "year": YEAR,
    "timezone": "UTC",
    "interval": "1h",
    "unit": "MW average",
    "source": "National Energy System Operator (NESO), Historic Demand Data 2024",
    "sourceUrl": "https://www.neso.energy/data-portal/historic-demand-data/historic_demand_data_2024",
    "downloadDate": "2026-10-24",
    "sourceSha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
    "solarNote": "Embedded solar generation is an estimate from NESO, not directly metered output.",
    "utcStart": hourly[0][0].isoformat().replace("+00:00", "Z"),
    "demandMw": [round(row[1], 3) for row in hourly],
    "solarMw": [round(row[2], 3) for row in hourly],
}
OUTPUT.write_text("window.BATTERYWISE_DATA=" + json.dumps(payload, separators=(",", ":")) + ";\n", encoding="utf-8")

# Editorial preview: the actual July 1–7 UTC week with solar scaled to 40% of annual demand.
share = 0.40
scale = share * sum(row[1] for row in hourly) / sum(row[2] for row in hourly)
week = hourly[182 * 24 : 182 * 24 + 168]
demand = [row[1] for row in week]
solar = [row[2] * scale for row in week]
maximum = math.ceil(max(max(demand), max(solar)) / 5000) * 5000
left, top, width, height = 78, 38, 790, 285

def point(i, value):
    x = left + i * width / (len(week) - 1)
    y = top + height - value / maximum * height
    return x, y

def line_path(values):
    return " ".join(("M" if i == 0 else "L") + f"{point(i, value)[0]:.1f},{point(i, value)[1]:.1f}" for i, value in enumerate(values))

surpluses = [(solar[i] - demand[i], i) for i in range(len(week)) if solar[i] > demand[i]]
deficits = [(demand[i] - solar[i], i) for i in range(len(week)) if demand[i] > solar[i]]
annotations = []
for kind, candidates, label in (("surplus", surpluses, "Largest solar surplus"), ("deficit", deficits, "Largest hourly demand gap")):
    if candidates:
        amount, index = max(candidates)
        x, y = point(index, solar[index] if kind == "surplus" else demand[index])
        text_y = top + 17 if kind == "surplus" else top + height - 14
        text_x = max(left + 6, min(left + width - 205, x + 10))
        annotations.append(f'<line x1="{x:.1f}" y1="{top}" x2="{x:.1f}" y2="{top+height}" class="guide {kind}"/><circle cx="{x:.1f}" cy="{y:.1f}" r="4" class="dot {kind}"/><text x="{text_x:.1f}" y="{text_y}" class="note {kind}">{label} · {amount:,.0f} MW</text>')

grid = []
for tick in range(5):
    value = maximum * tick / 4
    y = top + height - tick * height / 4
    grid.append(f'<line x1="{left}" y1="{y:.1f}" x2="{left+width}" y2="{y:.1f}" class="grid"/><text x="{left-10}" y="{y+4:.1f}" text-anchor="end" class="axis">{value:,.0f}</text>')
xdays = []
for day_index in range(8):
    x = left + day_index * 24 * width / (len(week) - 1)
    if day_index == 7:
        label = "08 JUL"
    else:
        label = (date(YEAR, 7, 1) + timedelta(days=day_index)).strftime("%a %d").upper()
    xd=xdays.append(f'<line x1="{x:.1f}" y1="{top+height}" x2="{x:.1f}" y2="{top+height+5}" class="axis-line"/><text x="{x:.1f}" y="{top+height+24}" text-anchor="middle" class="axis">{label}</text>')

svg_doc = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 390" role="img" aria-labelledby="title desc"><title id="title">Great Britain hourly demand and scaled solar, July 1–7, 2024</title><desc id="desc">Measured NESO national demand and NESO estimated embedded solar scaled to 40 percent of annual demand. Annotation marks the highest solar surplus and demand gap in this week.</desc><rect width="1000" height="390" fill="#f4f1e8"/><text x="{left}" y="20" class="unit">AVERAGE POWER / MW · UTC</text><text x="882" y="81" class="direct demand">Demand</text><text x="882" y="105" class="direct solar">Solar · 40% scenario</text>{''.join(grid)}{''.join(xdays)}<path d="{line_path(demand)}" class="line demand"/><path d="{line_path(solar)}" class="line solar"/>{''.join(annotations)}<line x1="{left}" y1="{top+height}" x2="{left+width}" y2="{top+height}" class="axis-line"/><text x="{left}" y="378" class="caption">Measured demand · source: NESO Historic Demand Data 2024</text><text x="999" y="378" text-anchor="end" class="caption">Solar output is estimated and scaled for this scenario.</text><style>.unit,.axis,.caption{{font-family:Consolas,monospace;fill:#625f55}}.unit{{font-size:10px;letter-spacing:1px}}.axis{{font-size:10px}}.caption{{font-size:9px}}.grid{{stroke:#d2cec1;stroke-width:1}}.axis-line{{stroke:#8c887c;stroke-width:1}}.line{{fill:none;stroke-width:2}}.demand{{stroke:#25251f}}.solar{{stroke:#93430f}}.direct{{font:11px Consolas,monospace}}.direct.demand,.note.deficit{{fill:#25251f}}.direct.solar,.note.surplus{{fill:#93430f}}.guide{{stroke-width:1;stroke-dasharray:3 4;opacity:.7}}.guide.surplus,.dot.surplus{{stroke:#93430f}}.guide.deficit,.dot.deficit{{stroke:#45685e}}.dot{{fill:#f4f1e8;stroke-width:2}}.note{{font:10px Consolas,monospace;paint-order:stroke;stroke:#f4f1e8;stroke-width:4px;stroke-linejoin:round}}</style></svg>'''
CHART.write_text(svg_doc, encoding="utf-8")
print(f"Validated {len(source_rows):,} half-hours and wrote {len(hourly):,} continuous UTC hours")
print(f"Demand: {sum(row[1] for row in hourly):,.0f} MWh; estimated solar: {sum(row[2] for row in hourly):,.0f} MWh")
print(f"Wrote {OUTPUT} ({OUTPUT.stat().st_size:,} bytes) and {CHART}")
