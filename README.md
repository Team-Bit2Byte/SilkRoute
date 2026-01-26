# SilkRoute

A real-time multilingual AI-assisted marketplace for local Indian vendors and buyers.

## Tech Stack
- **Frontend**: Next.js (App Router), Tailwind CSS, ShadCN UI
- **Backend**: Node.js, Express, Socket.io
- **Database**: SQLite
- **AI**: HuggingFace Inference (Mistral/Llama), LibreTranslate

## Setup & Run

### Prerequisites
- Node.js (v18+)

### Backend
1. `cd backend`
2. `npm install`
3. `npm start`
   - Server runs on http://localhost:5000

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev`
   - App runs on http://localhost:3000

## Features
- **Multilingual Chat**: Real-time translation between English and Indic languages.
- **Fair Price Discovery**: Mocked Mandi rates for demo.
- **AI Negotiation**: An assistant that suggests fair prices.
