import pandas as pd

def normalize_hourly(frame,timestamp,demand,solar):
    required=[timestamp,demand,solar]; missing=[c for c in required if c not in frame.columns]
    if missing: raise ValueError('missing columns: '+', '.join(missing))
    out=frame[required].copy(); out[timestamp]=pd.to_datetime(out[timestamp],utc=True,errors='coerce')
    if out[timestamp].isna().any(): raise ValueError('invalid timestamps')
    if out[timestamp].duplicated().any(): raise ValueError('duplicate timestamps')
    for col in (demand,solar):
        out[col]=pd.to_numeric(out[col],errors='coerce')
        if out[col].isna().any(): raise ValueError('missing or nonnumeric '+col+'; no interpolation')
        if (out[col]<0).any(): raise ValueError('negative values in '+col)
    return out.sort_values(timestamp).set_index(timestamp).rename(columns={demand:'demand_kwh',solar:'solar_kwh'})
