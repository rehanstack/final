import pandas as pd
import numpy as np

req_data = [
    {"date": "2021-01-01", "sales": 100},
    {"date": "2021-01-02", "sales": 110},
    {"date": "2021-01-03", "sales": 105},
]

time_col = "date"
metric_col = "sales"
steps = 5

df = pd.DataFrame(req_data)

original_time = df[time_col].copy()
df['parsed_time'] = pd.to_datetime(df[time_col], errors='coerce')
is_date = df['parsed_time'].notna().sum() > len(df) * 0.5

if is_date:
    df = df.dropna(subset=['parsed_time', metric_col]).sort_values('parsed_time')
    time_series = df['parsed_time']
else:
    df = df.dropna(subset=[metric_col]) 
    time_series = original_time.iloc[df.index]

y = df[metric_col].values
x = np.arange(len(y))

coef = np.polyfit(x, y, 1)
poly1d = np.poly1d(coef)

historical = []
for i, (idx, row) in enumerate(df.iterrows()):
    if is_date:
        t_val = str(row['parsed_time'].date())
    else:
        t_val = str(row[time_col])
        
    historical.append({
        "date": t_val,
        "actual": float(row[metric_col]),
        "trend": float(poly1d(len(historical)))
    })

forecast = []

if is_date and len(df) > 1:
    last_date = df['parsed_time'].iloc[-1]
    diffs = df['parsed_time'].diff().dropna()
    avg_delta = diffs.mean() if not diffs.empty else pd.Timedelta(days=1)
else:
    last_date = None
    avg_delta = None
    
for i in range(1, steps + 1):
    if is_date and last_date is not None:
        next_date = last_date + (avg_delta * i)
        date_label = str(next_date.date())
    else:
        date_label = f"Future +{i}"
        
    next_idx = len(historical) + i - 1
    pred = float(poly1d(next_idx))
    
    std = float(np.std(y)) if len(y) > 0 else 0
    
    forecast.append({
        "date": date_label,
        "predicted": pred,
        "lower": pred - (std * 0.5),
        "upper": pred + (std * 0.5)
    })
    
print("historical:", historical)
print("forecast:", forecast)
