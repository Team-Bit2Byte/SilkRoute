import pickle
import pandas as pd

# Load trained model
with open("price_model.pkl", "rb") as f:
    model = pickle.load(f)

# Create test input
# commodity codes depend on training, but order usually is:
# tomato = 0, onion = 1, potato = 2
test_data = pd.DataFrame([{
    "commodity": 1,      # tomato
    "quality": 0,        # good
    "arrival_month": 1   # June
}])

# Predict price
predicted_price = model.predict(test_data)

print("Predicted price:", round(predicted_price[0], 2))
