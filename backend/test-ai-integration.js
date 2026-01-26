#!/usr/bin/env node

// Simple test script to verify AI integration
const path = require('path');

// Test Price Estimator
console.log('Testing Price Estimator...');
try {
    const PriceEstimator = require('../ai/price/priceEstimator.js');
    const priceEstimator = new PriceEstimator();
    
    const testPrices = [
        { price: 100, date: new Date() },
        { price: 120, date: new Date() },
        { price: 90, date: new Date() },
        { price: 110, date: new Date() }
    ];
    
    const fairPrice = priceEstimator.calculateFairPrice(testPrices, 'median');
    console.log('✅ Price Estimator working! Fair price:', fairPrice);
} catch (error) {
    console.error('❌ Price Estimator failed:', error.message);
}

// Test Translation Service
console.log('\nTesting Translation Service...');
try {
    const SimpleTranslationService = require('./services/SimpleTranslationService.js');
    const translationService = new SimpleTranslationService();
    
    // Test translation
    translationService.translate('Hello world', 'en', 'hi').then(result => {
        console.log('✅ Translation Service working! Result:', result);
    }).catch(error => {
        console.error('❌ Translation failed:', error.message);
    });
    
    console.log('✅ Translation Service loaded successfully!');
} catch (error) {
    console.error('❌ Translation Service failed:', error.message);
}

console.log('\n🎉 AI Integration test completed!');
