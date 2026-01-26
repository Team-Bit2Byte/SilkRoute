import pickle
import pandas as pd

print("=" * 60)
print("DEBUGGING TRAINING DATA")
print("=" * 60)

# Check what's in the CSV
print("\n1. Checking CSV Data:")
print("-" * 60)
try:
    df = pd.read_csv('data/mandi_prices.csv')
    print(f"Total rows: {len(df)}")
    print(f"\nCommodities in CSV:")
    print(df['commodity'].unique())
    print(f"\nValue counts:")
    print(df['commodity'].value_counts())
except Exception as e:
    print(f"Error reading CSV: {e}")

# Check what's in the encoders
print("\n2. Checking Trained Encoders:")
print("-" * 60)
try:
    with open("commodity_encoder.pkl", "rb") as f:
        commodity_encoder = pickle.load(f)
    print(f"Commodities in encoder: {list(commodity_encoder.keys())}")
    
    with open("quality_encoder.pkl", "rb") as f:
        quality_encoder = pickle.load(f)
    print(f"Qualities in encoder: {list(quality_encoder.keys())}")
except Exception as e:
    print(f"Error loading encoders: {e}")

# Test specific predictions
print("\n3. Testing Individual Predictions:")
print("-" * 60)
import subprocess

test_commodities = ['tomato', 'onion', 'potato', 'wheat', 'rice', 'cabbage']
for commodity in test_commodities:
    result = subprocess.run(
        ['python', 'predict_price.py', commodity, 'good', '6'],
        capture_output=True,
        text=True
    )
    if result.returncode == 0:
        print(f"OK {commodity}: {result.stdout.strip()}")
    else:
        print(f"ERROR {commodity}: {result.stderr.strip()}")

print("=" * 60)