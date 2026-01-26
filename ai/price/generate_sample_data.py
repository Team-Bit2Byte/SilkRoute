import pandas as pd
import random
import os

# Create data folder if it doesn't exist
if not os.path.exists('data'):
    os.makedirs('data')

print("Generating sample mandi price data...")

# Sample Indian commodities - MUST MATCH EXACTLY
commodities = ['tomato', 'onion', 'potato', 'wheat', 'rice', 'cabbage', 'cauliflower']
qualities = ['premium', 'good', 'average', 'basic']
markets = ['Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Kolkata', 'Agra', 'Jaipur']

# Base prices (in rupees per kg)
base_prices = {
    'tomato': 35,
    'onion': 25,
    'potato': 20,
    'wheat': 28,
    'rice': 45,
    'cabbage': 22,
    'cauliflower': 38
}

# Generate sample data
data = []
print("\nGenerating data for each commodity:")

for commodity in commodities:
    base = base_prices[commodity]
    count = 0
    
    for month in range(1, 13):  # 12 months
        for quality in qualities:
            # Generate 3 entries per quality per month for variety
            for _ in range(3):
                # Quality multiplier
                quality_mult = {
                    'premium': 1.25,
                    'good': 1.0,
                    'average': 0.85,
                    'basic': 0.75
                }
                
                # Seasonal variation (prices vary by season)
                seasonal = 1.0 + (0.15 * ((month % 6) - 2.5) / 2.5)
                
                # Random market variation
                noise = random.uniform(0.92, 1.08)
                
                # Calculate final price
                price = base * quality_mult[quality] * seasonal * noise
                
                data.append({
                    'commodity': commodity,
                    'quality': quality,
                    'arrival_month': month,
                    'price': round(price, 2),
                    'market': random.choice(markets)
                })
                count += 1
    
    print(f"  ✓ {commodity}: {count} entries")

# Create DataFrame
df = pd.DataFrame(data)

# Verify all commodities are present
print("\nVerifying data:")
print(f"Total rows: {len(df)}")
print(f"Commodities: {sorted(df['commodity'].unique())}")
print(f"Qualities: {sorted(df['quality'].unique())}")

# Save to CSV
csv_path = 'data/mandi_prices.csv'
df.to_csv(csv_path, index=False)

print(f"\n✓ Successfully saved to: {csv_path}")
print(f"\nSample data:")
print(df.head(15))

# Show price ranges per commodity
print("\nPrice ranges by commodity:")
for commodity in commodities:
    prices = df[df['commodity'] == commodity]['price']
    print(f"  {commodity:12}: ₹{prices.min():.2f} - ₹{prices.max():.2f} (avg: ₹{prices.mean():.2f})")