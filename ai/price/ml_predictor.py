import pickle
import pandas as pd

class MLPredictor:
    def __init__(self):
        """Load the trained model and encoders"""
        with open("price_model.pkl", "rb") as f:
            self.model = pickle.load(f)
        with open("commodity_encoder.pkl", "rb") as f:
            self.commodity_encoder = pickle.load(f)
        with open("quality_encoder.pkl", "rb") as f:
            self.quality_encoder = pickle.load(f)
    
    def predict(self, commodity, quality, month):
        """
        Predict price for given commodity, quality, and month
        
        Args:
            commodity (str): Commodity name (e.g., 'tomato', 'onion')
            quality (str): Quality level ('premium', 'good', 'average', 'basic')
            month (int): Month number (1-12)
        
        Returns:
            float: Predicted price in rupees
        
        Raises:
            ValueError: If commodity or quality is unknown
        """
        commodity = commodity.lower()
        quality = quality.lower()
        
        if commodity not in self.commodity_encoder:
            raise ValueError(
                f"Unknown commodity: '{commodity}'. "
                f"Available: {list(self.commodity_encoder.keys())}"
            )
        
        if quality not in self.quality_encoder:
            raise ValueError(
                f"Unknown quality: '{quality}'. "
                f"Available: {list(self.quality_encoder.keys())}"
            )
        
        commodity_code = self.commodity_encoder[commodity]
        quality_code = self.quality_encoder[quality]
        
        X = pd.DataFrame(
            [[commodity_code, quality_code, month]],
            columns=["commodity", "quality", "arrival_month"]
        )
        
        prediction = self.model.predict(X)
        return round(float(prediction[0]), 2)
    
    def get_available_commodities(self):
        """Return list of commodities the model knows"""
        return list(self.commodity_encoder.keys())
    
    def get_available_qualities(self):
        """Return list of quality levels the model knows"""
        return list(self.quality_encoder.keys())


# Example usage
if __name__ == "__main__":
    predictor = MLPredictor()
    
    print("Testing ML Predictor...")
    print(f"Available commodities: {predictor.get_available_commodities()}")
    print(f"Available qualities: {predictor.get_available_qualities()}")
    
    # Test prediction
    price = predictor.predict('tomato', 'good', 6)
    print(f"\nPredicted price for tomato (good quality, June): Rs.{price}")