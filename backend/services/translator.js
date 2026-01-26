// backend/services/translator.js

// Mock translation for Hackathon stability (replace with real API call if available)
// Target Languages: hi (Hindi), en (English), bn (Bengali), ta (Tamil)

const MOCK_TRANSLATIONS = {
    'hi': {
        'hello': 'नमस्ते',
        'price': 'कीमत',
        'potato': 'आलू',
        'onion': 'प्याज'
    },
    'en': {
        'नमस्ते': 'Hello',
        'कीमत': 'Price',
        'आलू': 'Potato'
    }
};

async function translateText(text, targetLang) {
    // 1. Check mock dictionary
    if (MOCK_TRANSLATIONS[targetLang] && MOCK_TRANSLATIONS[targetLang][text.toLowerCase()]) {
        return MOCK_TRANSLATIONS[targetLang][text.toLowerCase()];
    }

    // 2. Fallback: Simulate API delay and append tag
    await new Promise(resolve => setTimeout(resolve, 500));
    return `[${targetLang.toUpperCase()}] ${text}`;
}

module.exports = { translateText };
