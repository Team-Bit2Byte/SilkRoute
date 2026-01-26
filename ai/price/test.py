import subprocess
import os

print("=" * 60)
print("TESTING PRICE PREDICTION SYSTEM")
print("=" * 60)

# Check if model files exist
print("\n1. Checking Required Files...")
required_files = [
    'price_model.pkl',
    'commodity_encoder.pkl',
    'quality_encoder.pkl',
    'data/mandi_prices.csv'
]

all_files_exist = True
for file in required_files:
    exists = os.path.exists(file)
    status = "OK" if exists else "MISSING"
    print(f"   [{status}] {file}")
    if not exists:
        all_files_exist = False

if not all_files_exist:
    print("\nWarning: Missing files! Run these commands first:")
    print("   1. python generate_sample_data.py")
    print("   2. python train_price_model.py")
    exit(1)

# Test ML Predictions
print("\n2. Testing ML Model Predictions:")
print("-" * 60)

test_cases = [
    ('tomato', 'good', 6),
    ('onion', 'premium', 3),
    ('potato', 'average', 12),
    ('wheat', 'good', 8),
    ('rice', 'premium', 1),
    ('cabbage', 'basic', 10)
]

for commodity, quality, month in test_cases:
    try:
        result = subprocess.run(
            ['python', 'predict_price.py', commodity, quality, str(month)],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0:
            price = result.stdout.strip()
            print(f"   [OK] {commodity.capitalize():12} ({quality:8}, Month {month:2}): Rs.{price}")
        else:
            print(f"   [ERROR] {commodity.capitalize():12} Error: {result.stderr.strip()}")
    except Exception as e:
        print(f"   [ERROR] {commodity.capitalize():12} Error: {str(e)}")

# Test Python Module (if exists)
print("\n3. Testing ML Predictor Module:")
print("-" * 60)

if os.path.exists('ml_predictor.py'):
    try:
        from ml_predictor import MLPredictor
        
        predictor = MLPredictor()
        price = predictor.predict('tomato', 'good', 6)
        
        print(f"   [OK] ML Predictor module working!")
        print(f"   [OK] Test prediction: Rs.{price}")
        print(f"   [OK] Available commodities: {predictor.get_available_commodities()}")
    except Exception as e:
        print(f"   [ERROR] {str(e)}")
else:
    print("   [SKIP] ml_predictor.py not found")

# Test JavaScript Fair Price Calculator
print("\n4. Testing Fair Price Calculator (JavaScript):")
print("-" * 60)

if os.path.exists('priceestimator.js'):
    try:
        result = subprocess.run(
            ['node', 'priceestimator.js'],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0:
            print("   [OK] JavaScript calculator working!")
            print("\n" + result.stdout)
        else:
            print(f"   [ERROR] {result.stderr}")
    except FileNotFoundError:
        print("   [SKIP] Node.js not installed or not in PATH")
    except Exception as e:
        print(f"   [ERROR] {str(e)}")
else:
    print("   [SKIP] priceestimator.js not found")

print("=" * 60)
print("TEST COMPLETE!")
print("=" * 60)