import sys
import pickle
import pandas as pd

# Get command line arguments
commodity_input = sys.argv[1].lower()
quality_input = sys.argv[2].lower()
month = int(sys.argv[3])

# Load encoders
with open("commodity_encoder.pkl", "rb") as f:
    commodity_encoder = pickle.load(f)

with open("quality_encoder.pkl", "rb") as f:
    quality_encoder = pickle.load(f)

# Check if commodity exists in encoder
if commodity_input not in commodity_encoder:
    print(f"Error: Unknown commodity '{commodity_input}'")
    print(f"Available commodities: {list(commodity_encoder.keys())}")
    sys.exit(1)

# Check if quality exists in encoder
if quality_input not in quality_encoder:
    print(f"Error: Unknown quality '{quality_input}'")
    print(f"Available qualities: {list(quality_encoder.keys())}")
    sys.exit(1)

# Get encoded values
commodity = commodity_encoder[commodity_input]
quality = quality_encoder[quality_input]

# Load model
with open("price_model.pkl", "rb") as f:
    model = pickle.load(f)

# Create input dataframe
X = pd.DataFrame(
    [[commodity, quality, month]],
    columns=["commodity", "quality", "arrival_month"]
)

# Make prediction
prediction = model.predict(X)
print(round(float(prediction[0]), 2))