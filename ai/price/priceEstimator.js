class PriceEstimator {
  constructor() {
    this.priceCache = new Map();
  }

  /* =========================
     CORE PRICE CALCULATIONS
     ========================= */

  calculateFairPrice(prices, method = 'median') {
    if (!prices || prices.length === 0) return null;

    const values = prices.map(p => p.price).filter(p => p > 0);
    
    if (values.length === 0) return null;

    switch (method) {
      case 'average':
        return this.average(values);
      case 'median':
        return this.median(values);
      case 'weighted':
        return this.weightedAverage(prices);
      default:
        return this.median(values);
    }
  }

  average(values) {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  median(values) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  weightedAverage(prices) {
    const now = new Date();
    let totalWeight = 0;
    let weightedSum = 0;

    prices.forEach(p => {
      if (!p.date || !p.price) return;
      
      const priceDate = new Date(p.date);
      const daysDiff = Math.abs((now - priceDate) / (1000 * 60 * 60 * 24));
      const weight = 1 / (1 + daysDiff * 0.1);

      weightedSum += p.price * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  getPriceStats(prices) {
    if (!prices || prices.length === 0) {
      return { min: 0, max: 0, average: 0, median: 0, stdDev: 0, count: 0 };
    }

    const values = prices.map(p => p.price).filter(p => p > 0);
    
    if (values.length === 0) {
      return { min: 0, max: 0, average: 0, median: 0, stdDev: 0, count: 0 };
    }

    const avg = this.average(values);

    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) /
      values.length;

    return {
      min: Math.min(...values),
      max: Math.max(...values),
      average: avg,
      median: this.median(values),
      stdDev: Math.sqrt(variance),
      count: values.length
    };
  }

  /* =========================
     QUALITY & NEGOTIATION
     ========================= */

  adjustForQuality(basePrice, quality) {
    const qualityMultipliers = {
      premium: 1.25,
      good: 1.0,
      average: 0.85,
      basic: 0.75
    };
    return basePrice * (qualityMultipliers[quality.toLowerCase()] || 1.0);
  }

  generateNegotiationTip(fairPrice, vendorAsk, buyerOffer, quality = 'good') {
    const adjustedFair = this.adjustForQuality(fairPrice, quality);
    const diffPercent = ((adjustedFair - buyerOffer) / adjustedFair) * 100;

    if (buyerOffer >= adjustedFair * 0.95) {
      return {
        fairness: 'excellent',
        recommendation: 'accept',
        fairPrice: Math.round(adjustedFair),
        message: 'Excellent offer, very close to fair price.'
      };
    } else if (buyerOffer >= adjustedFair * 0.85) {
      return {
        fairness: 'good',
        recommendation: 'counter',
        counterOffer: Math.round(adjustedFair * 0.92),
        fairPrice: Math.round(adjustedFair),
        message: 'Good offer, slight negotiation recommended.'
      };
    } else {
      return {
        fairness: 'low',
        recommendation: 'increase',
        counterOffer: Math.round(adjustedFair * 0.88),
        fairPrice: Math.round(adjustedFair),
        message: `Offer is ${diffPercent.toFixed(1)}% below fair price.`
      };
    }
  }

  generateVendorTip(fairPrice, vendorAsk, buyerOffer, quality = 'good') {
    const adjustedFair = this.adjustForQuality(fairPrice, quality);

    if (buyerOffer >= adjustedFair * 0.95) {
      return {
        recommendation: 'accept',
        fairPrice: Math.round(adjustedFair),
        message: 'Buyer offer is fair. Accept.'
      };
    } else if (buyerOffer >= adjustedFair * 0.80) {
      return {
        recommendation: 'counter',
        counterOffer: Math.round(adjustedFair * 0.92),
        fairPrice: Math.round(adjustedFair),
        message: 'Counter slightly below fair price for negotiation room.'
      };
    } else {
      return {
        recommendation: 'counter',
        counterOffer: Math.round(adjustedFair),
        fairPrice: Math.round(adjustedFair),
        message: 'Offer is too low. Counter with fair market price.'
      };
    }
  }

  /* =========================
     MAIN AI WRAPPER METHOD
     ========================= */

  estimatePrice({ prices, quality = 'good', vendorAsk, buyerOffer, userType = 'buyer' }) {
    const fairPrice = this.calculateFairPrice(prices, 'median');
    
    if (fairPrice === null) {
      return {
        error: 'No valid price data available',
        fairPrice: 0,
        adjustedFairPrice: 0,
        stats: this.getPriceStats([])
      };
    }

    const negotiation =
      userType === 'vendor'
        ? this.generateVendorTip(fairPrice, vendorAsk, buyerOffer, quality)
        : this.generateNegotiationTip(fairPrice, vendorAsk, buyerOffer, quality);

    return {
      fairPrice: Math.round(fairPrice),
      adjustedFairPrice: Math.round(this.adjustForQuality(fairPrice, quality)),
      negotiation,
      stats: this.getPriceStats(prices)
    };
  }
}

/* =========================
   EXPORT FOR NODE.JS
   ========================= */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = new PriceEstimator();
}

/* =========================
   EXPORT FOR BROWSER
   ========================= */
if (typeof window !== 'undefined') {
  window.PriceEstimator = PriceEstimator;
}

/* =========================
   TEST RUN (SAFE)
   ========================= */
if (typeof require !== 'undefined' && require.main === module) {
  console.log('Running Price Estimator Test...\n');

  const priceAI = module.exports;

  const samplePrices = [
    { market: 'Delhi', price: 28, date: '2026-01-24' },
    { market: 'Agra', price: 30, date: '2026-01-25' },
    { market: 'Jaipur', price: 27, date: '2026-01-23' },
    { market: 'Lucknow', price: 29, date: '2026-01-26' }
  ];

  console.log('Test Case: Buyer negotiating for tomatoes');
  console.log('=' .repeat(60));
  
  const result = priceAI.estimatePrice({
    prices: samplePrices,
    quality: 'good',
    vendorAsk: 30,
    buyerOffer: 24,
    userType: 'buyer'
  });

  console.log(JSON.stringify(result, null, 2));
  
  console.log('\n' + '='.repeat(60));
  console.log('Test Case: Vendor receiving offer');
  console.log('=' .repeat(60));
  
  const vendorResult = priceAI.estimatePrice({
    prices: samplePrices,
    quality: 'premium',
    vendorAsk: 35,
    buyerOffer: 32,
    userType: 'vendor'
  });

  console.log(JSON.stringify(vendorResult, null, 2));
}