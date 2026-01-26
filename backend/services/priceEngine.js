// backend/services/priceEngine.js

const MANDI_DATA = [
    { item: 'Potato', price: 20, unit: 'kg', trend: 'up' },
    { item: 'Onion', price: 35, unit: 'kg', trend: 'down' },
    { item: 'Tomato', price: 40, unit: 'kg', trend: 'up' },
    { item: 'Rice', price: 50, unit: 'kg', trend: 'stable' },
];

function getMandiRates() {
    return MANDI_DATA;
}

function calculateFairPrice(item, offerPrice) {
    const marketItem = MANDI_DATA.find(i => i.item.toLowerCase() === item.toLowerCase());
    if (!marketItem) return null;

    const marketPrice = marketItem.price;
    const diff = offerPrice - marketPrice;
    
    // Simple logic: within 10% is fair
    const fairness = Math.abs(diff) < (marketPrice * 0.1) ? 'Fair' : (diff > 0 ? 'High' : 'Low');
    
    return {
        marketPrice,
        fairness,
        aiSuggestion: fairness === 'High' ? `Ask for ₹${marketPrice}` : 'Good deal!'
    };
}

module.exports = { getMandiRates, calculateFairPrice };
