import pandas as pd
import pickle
import os
from sklearn.linear_model import LinearRegression

# Check if data file exists
if not os.path.exists("data/mandi_prices.csv"):
    print("Error: data/mandi_prices.csv not found!")
    print("Please run: python generate_sample_data.py")
    exit(1)

print("Starting training...")

# Load data
try:
    data = pd.read_csv("data/mandi_prices.csv")
    print(f"Loaded {len(data)} rows of data")
except Exception as e:
    print(f"Error loading data: {e}")
    exit(1)

# Encode categorical columns
data["commodity"] = data["commodity"].astype("category")
data["quality"] = data["quality"].astype("category")

# Save encoders
commodity_encoder = {
    category: code
    for code, category in enumerate(data["commodity"].cat.categories)
}

quality_encoder = {
    category: code
    for code, category in enumerate(data["quality"].cat.categories)
}

try:
    with open("commodity_encoder.pkl", "wb") as f:
        pickle.dump(commodity_encoder, f)
    print("Saved commodity encoder")
    
    with open("quality_encoder.pkl", "wb") as f:
        pickle.dump(quality_encoder, f)
    print("Saved quality encoder")
except Exception as e:
    print(f"Error saving encoders: {e}")
    exit(1)

# Apply encoding
data["commodity"] = data["commodity"].map(commodity_encoder)
data["quality"] = data["quality"].map(quality_encoder)

X = data[["commodity", "quality", "arrival_month"]]
y = data["price"]

# Train model
try:
    model = LinearRegression()
    model.fit(X, y)
    print("Model trained successfully")
except Exception as e:
    print(f"Error training model: {e}")
    exit(1)

# Save model
try:
    with open("price_model.pkl", "wb") as f:
        pickle.dump(model, f)
    print("Model saved successfully")
except Exception as e:
    print(f"Error saving model: {e}")
    exit(1)

print("\nTraining complete!")
print("=" * 60)
print(f"Rows used: {len(data)}")
print(f"Commodities learned: {list(commodity_encoder.keys())}")
print(f"Qualities learned: {list(quality_encoder.keys())}")
print("=" * 60)