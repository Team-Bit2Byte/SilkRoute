<div align="center">

# 🌏 SilkRoute

### Real-Time Multilingual AI-Powered Agricultural Marketplace

*Connecting Indian farmers, vendors, and buyers through intelligent price discovery and seamless language translation*

[![Next.js](https://img.shields.io/badge/Next.js-16.1.4-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-green?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8.3-010101?style=flat-square&logo=socket.io)](https://socket.io/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-success?style=flat-square)](/)

[Features](#-key-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Architecture](#-architecture) • [Contributing](#-contributing)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Technology Stack](#-technology-stack)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [Documentation](#-documentation)
- [Architecture](#-architecture)
- [API Reference](#-api-reference)
- [Deployment](#-deployment)
- [Testing](#-testing)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

**SilkRoute** is an innovative marketplace platform designed to revolutionize agricultural commerce in India by breaking down language barriers and ensuring fair pricing through AI-powered insights.

### The Problem We Solve

Indian agricultural markets face two critical challenges:
1. **Language Barriers**: Buyers and sellers often speak different languages, hindering effective negotiation
2. **Price Opacity**: Farmers lack access to fair market prices (Mandi rates), leading to exploitation

### Our Solution

SilkRoute provides:
- **Real-time Translation**: Automatic message translation across 5 languages (English, Hindi, Bengali, Tamil, Telugu)
- **AI Price Discovery**: Intelligent fair price estimation based on historical Mandi data
- **Smart Negotiation**: AI-powered negotiation advisor for both buyers and vendors
- **Live Communication**: WebSocket-based real-time chat for instant negotiations

---

## 🚀 Key Features

### 1. 🌐 Multilingual Communication
- **5 Language Support**: English, Hindi, Bengali, Tamil, Telugu
- **Auto-Detection**: Automatic source language identification
- **Real-Time Translation**: Messages translated as they're sent
- **Confidence Scoring**: Translation quality indicators (0-1 scale)
- **Translation Caching**: LRU cache for improved performance

### 2. 💰 AI-Powered Price Discovery
- **Mandi Rate Integration**: Live wholesale market prices
- **Smart Estimation**: Three calculation methods:
  - **Median**: Most robust against outliers
  - **Average**: Simple mean calculation
  - **Weighted**: Time-decay based (recent prices weighted higher)
- **Quality Adjustment**: Premium (+25%), Good, Average, Basic (-25%)
- **Fairness Assessment**: Excellent (95%+), Good (85%+), Fair, Low tiers

### 3. 🤖 Intelligent Negotiation Advisor
- **Role-Specific Recommendations**:
  - **Buyers**: Accept, Counter-Offer, Increase Bid
  - **Vendors**: Hold Price, Counter, Accept Offer
- **Counter-Offer Generation**: AI suggests fair counter prices
- **Market Analysis**: Real-time market vs offer comparison
- **Savings Calculator**: Shows potential savings/profits

### 4. 💬 Real-Time Chat
- **Socket.IO Integration**: WebSocket-based instant messaging
- **Room Management**: Multiple negotiation rooms
- **Message Broadcasting**: All participants receive messages instantly
- **Translation Integration**: Auto-translate on send
- **Message Persistence**: Ready for database storage

### 5. 🔐 Secure Authentication
- **Multi-Method Auth**:
  - Email/Password (JWT-based)
  - OAuth 2.0 (Google ready, extensible)
- **User Types**: Farmer, Vendor, Buyer
- **Session Management**: NextAuth v5 with JWT strategy
- **Token Blacklist**: Redis/In-memory token revocation
- **Secure OAuth**: Crypto-random password generation

### 6. 📊 Dashboard & Analytics
- **Mandi Rate Display**: Visual price cards with trends
- **Trend Indicators**: Up/Down/Stable with percentage changes
- **Product Catalog**: 6 core agricultural products
- **Price History**: Ready for historical data visualization

---

## 🛠 Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.1.4 | React framework with App Router |
| **React** | 19.2.3 | UI library |
| **TypeScript** | Latest | Type-safe development |
| **Tailwind CSS** | 4.0 | Utility-first styling |
| **Socket.IO Client** | 4.8.3 | Real-time WebSocket client |
| **NextAuth** | 5.0.0 | Authentication & OAuth |
| **Lucide React** | Latest | Modern icon library |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 22.x | JavaScript runtime |
| **Express** | 5.2.1 | REST API framework |
| **Socket.IO** | 4.8.3 | WebSocket server |
| **SQLite3** | Latest | Lightweight SQL database |
| **PostgreSQL** | Ready | Production database (adapter ready) |
| **Redis** | Ready | Token blacklist & caching |
| **Winston** | 3.19.0 | Logging service |

### AI/ML Services
| Service | Purpose |
|---------|---------|
| **Price Estimator** | Custom AI for fair price calculation |
| **Translation Service** | Multi-language translation with caching |
| **Language Detection** | Franc-based auto language detection |
| **Negotiation AI** | HuggingFace-ready negotiation advisor |
| **LibreTranslate** | Open-source translation (integration ready) |

### Database Schema
```
users
├── id (UUID, Primary Key)
├── name
├── email (Unique)
├── password (bcrypt ready)
├── user_type (farmer/vendor/buyer)
├── language (en/hi/bn/ta/tg)
├── is_active (Boolean)
└── created_at (Timestamp)

products
├── id (UUID, Primary Key)
├── vendor_id (Foreign Key → users.id)
├── name
├── description
├── price (Decimal, CHECK > 0)
├── unit (kg/quintal/ton)
├── category
├── image_url
├── is_active (Boolean)
└── created_at (Timestamp)

messages
├── id (UUID, Primary Key)
├── room_id (Foreign Key → chat_rooms.id)
├── sender_id (Foreign Key → users.id)
├── original_text
├── translated_text
├── language
└── created_at (Timestamp)

chat_rooms
├── id (UUID, Primary Key)
├── name
├── type (direct/group)
├── created_by (Foreign Key → users.id)
└── created_at (Timestamp)

room_participants
├── room_id (Foreign Key → chat_rooms.id)
├── user_id (Foreign Key → users.id)
├── joined_at (Timestamp)
└── PRIMARY KEY (room_id, user_id)
```

---

## ⚡ Quick Start

### Prerequisites

Ensure you have the following installed:
- **Node.js** v18.0.0 or higher
- **npm** v9.0.0 or higher
- **Git** for version control

### Installation

#### 1️⃣ Clone the Repository
```bash
git clone https://github.com/yourusername/SilkRoute.git
cd SilkRoute
```

#### 2️⃣ Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Start the server
npm start
```

**Backend will start on:** `http://localhost:5000` (or next available port)

#### 3️⃣ Frontend Setup
```bash
# Navigate to frontend directory (in new terminal)
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Edit .env.local with your configuration
nano .env.local

# Start the development server
npm run dev
```

**Frontend will start on:** `http://localhost:3000`

### Environment Configuration

**Backend (`.env`):**
```bash
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_TYPE=sqlite                    # Options: sqlite, postgres
DATABASE_URL=./database.sqlite    # SQLite path or PostgreSQL URL

# PostgreSQL Configuration (if using)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=silkroute
POSTGRES_PASSWORD=your_password
POSTGRES_DATABASE=silkroute_db

# Redis Configuration
REDIS_ENABLED=false
REDIS_HOST=localhost
REDIS_PORT=6379

# Translation Service
LIBRE_TRANSLATE_URL=              # Optional: http://localhost:5000
LIBRE_TRANSLATE_API_KEY=          # Optional
```

**Frontend (`.env.local`):**
```bash
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-generate-with-openssl-rand-base64-32

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Verify Installation

Test that everything is working:

```bash
# Test backend health
curl http://localhost:5000

# Test prices API
curl http://localhost:5000/api/prices

# Visit frontend
open http://localhost:3000
```

---

## 📁 Project Structure

```
SilkRoute/
├── 📂 backend/                 # Backend Node.js application
│   ├── 📂 src/
│   │   ├── 📂 config/         # Configuration files
│   │   ├── 📂 controllers/    # Route controllers
│   │   ├── 📂 middleware/     # Express middleware
│   │   ├── 📂 services/       # Business logic services
│   │   ├── 📂 database/       # Database adapters & migrations
│   │   ├── 📂 socket/         # Socket.IO handlers
│   │   └── server.js          # Main server entry point
│   ├── 📂 services/           # Utility services
│   │   ├── priceEngine.js     # Mandi rate management
│   │   └── translator.js      # Translation service
│   ├── database.sqlite        # SQLite database file
│   ├── package.json
│   └── .env                   # Environment variables
│
├── 📂 frontend/               # Frontend Next.js application
│   ├── 📂 src/
│   │   ├── 📂 app/           # Next.js App Router
│   │   │   ├── 📂 api/       # API routes
│   │   │   │   └── 📂 auth/  # NextAuth configuration
│   │   │   ├── 📂 auth/      # Authentication page
│   │   │   ├── 📂 dashboard/ # Dashboard page
│   │   │   ├── 📂 chat/      # Chat interface
│   │   │   ├── layout.tsx    # Root layout
│   │   │   └── page.tsx      # Landing page
│   │   ├── 📂 components/    # React components
│   │   ├── 📂 hooks/         # Custom React hooks
│   │   ├── 📂 lib/           # Utility functions
│   │   ├── 📂 types/         # TypeScript definitions
│   │   └── 📂 contexts/      # React contexts
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── .env.local            # Environment variables
│
├── 📂 ai/                     # AI/ML services
│   ├── 📂 price/             # Price estimation AI
│   │   └── priceEstimator.js
│   ├── 📂 translation/       # Translation services
│   └── 📂 negotiation/       # Negotiation AI
│       ├── simpleAdvisor.js
│       └── hfNegotiator.js
│
├── 📂 docs/                   # Documentation
│   ├── API.md                # API documentation
│   ├── ARCHITECTURE.md       # System architecture
│   └── DEPLOYMENT.md         # Deployment guide
│
├── 📄 docker-compose.yml     # Docker composition
├── 📄 README.md              # This file
├── 📄 MIGRATION_GUIDE.md     # Database migrations
├── 📄 SECURITY.md            # Security considerations
└── 📄 LICENSE                # MIT License
```

---

## 📚 Documentation

Comprehensive guides for developers and users:

| Document | Description |
|----------|-------------|
| [**Quick Start Guide**](QUICKSTART.md) | Get started in 5 minutes |
| [**Migration Guide**](MIGRATION_GUIDE.md) | Database setup & migrations |
| [**Security Guide**](SECURITY.md) | Security best practices |
| [**API Reference**](docs/API.md) | Complete API documentation |
| [**Architecture Overview**](docs/ARCHITECTURE.md) | System design & patterns |
| [**Deployment Guide**](docs/DEPLOYMENT.md) | Production deployment |
| [**Google OAuth Setup**](frontend/GOOGLE_OAUTH_SETUP.md) | OAuth configuration |
| [**Testing Guide**](docs/TESTING.md) | Testing strategies |

---

## 🏗 Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Browser    │  │    Mobile    │  │   Desktop    │      │
│  │  (Next.js)   │  │  (Future)    │  │  (Future)    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          ├──────────────────┴──────────────────┘
          │
┌─────────▼─────────────────────────────────────────────────┐
│                     API Gateway Layer                      │
│  ┌──────────────────────────────────────────────────────┐ │
│  │              Next.js API Routes (Port 3000)          │ │
│  │  • /api/auth/[...nextauth]  - Authentication         │ │
│  │  • NextAuth Session Management                       │ │
│  └──────────────────────────────────────────────────────┘ │
└───────────┬───────────────────────────────────────────────┘
            │
┌───────────▼───────────────────────────────────────────────┐
│                    Application Layer                       │
│  ┌─────────────────────┐  ┌─────────────────────┐        │
│  │   Express Server    │  │   Socket.IO Server  │        │
│  │   (Port 5000)       │  │   (Port 5000)       │        │
│  │                     │  │                     │        │
│  │  REST API:          │  │  WebSocket Events:  │        │
│  │  • Auth             │  │  • join_room        │        │
│  │  • Prices           │  │  • send_message     │        │
│  │  • Translation      │  │  • receive_message  │        │
│  │  • Users            │  │  • disconnect       │        │
│  └─────────┬───────────┘  └─────────┬───────────┘        │
└────────────┼──────────────────────────┼────────────────────┘
             │                          │
┌────────────▼──────────────────────────▼────────────────────┐
│                      Service Layer                         │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ │
│  │  Auth Service  │ │ Translation    │ │ Price Engine   │ │
│  │  • JWT Tokens  │ │ • Franc        │ │ • Estimation   │ │
│  │  • OAuth       │ │ • LibreTransl. │ │ • Fairness     │ │
│  │  • Blacklist   │ │ • LRU Cache    │ │ • Statistics   │ │
│  └────────┬───────┘ └────────┬───────┘ └────────┬───────┘ │
└───────────┼──────────────────┼──────────────────┼─────────┘
            │                  │                  │
┌───────────▼──────────────────▼──────────────────▼─────────┐
│                       Data Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   SQLite     │  │  PostgreSQL  │  │    Redis     │    │
│  │  (Default)   │  │  (Optional)  │  │  (Optional)  │    │
│  │              │  │              │  │              │    │
│  │  • Users     │  │  • Users     │  │  • Sessions  │    │
│  │  • Products  │  │  • Products  │  │  • Blacklist │    │
│  │  • Messages  │  │  • Messages  │  │  • Cache     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└────────────────────────────────────────────────────────────┘
```

### Data Flow: Real-Time Chat with Translation

```
User A (English)                    Server                    User B (Hindi)
     │                                │                             │
     │ 1. Type: "Hello"              │                             │
     │────────────────────────────────>                            │
     │                                │                             │
     │                          2. Detect Lang                      │
     │                          (Franc: EN)                         │
     │                                │                             │
     │                          3. Translate                        │
     │                          (EN → HI)                           │
     │                          Result: "नमस्ते"                    │
     │                                │                             │
     │                          4. Broadcast                        │
     │                                ├─────────────────────────────>
     │                                │  { text: "Hello",           │
     │                                │    translated: "नमस्ते",   │
     │                                │    confidence: 0.85 }       │
     │                                │                             │
     │                                │                      5. Display
     │                                │                      "नमस्ते"
     │                                │                             │
```

---

## 🔌 API Reference

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "userType": "buyer"  // farmer | vendor | buyer
}

Response: 200 OK
{
  "success": true,
  "user": {
    "id": "uuid-here",
    "name": "John Doe",
    "email": "john@example.com",
    "userType": "buyer"
  }
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}

Response: 200 OK
{
  "success": true,
  "user": { ... },
  "token": "jwt-token-here"
}
```

### Price Endpoints

#### Get Mandi Rates
```http
GET /api/prices

Response: 200 OK
[
  {
    "item": "Potato",
    "price": 20,
    "unit": "kg",
    "trend": "up"
  },
  ...
]
```

#### Estimate Fair Price
```http
POST /api/prices/estimate
Content-Type: application/json

{
  "prices": [
    { "price": 100, "date": "2026-01-20" },
    { "price": 110, "date": "2026-01-21" },
    { "price": 105, "date": "2026-01-22" }
  ],
  "method": "median"  // median | average | weighted
}

Response: 200 OK
{
  "success": true,
  "fairPrice": 105,
  "method": "median",
  "sampleSize": 3,
  "stats": {
    "min": 100,
    "max": 110,
    "average": 105,
    "median": 105,
    "stdDev": 4.08
  }
}
```

### Translation Endpoint

```http
POST /api/translate
Content-Type: application/json

{
  "text": "Hello, how are you?",
  "sourceLang": "auto",  // auto-detect or en|hi|bn|ta|tg
  "targetLang": "hi"
}

Response: 200 OK
{
  "success": true,
  "original": "Hello, how are you?",
  "translated": "नमस्ते, आप कैसे हैं?",
  "sourceLang": "en",
  "targetLang": "hi",
  "confidence": 0.85
}
```

### WebSocket Events

#### Connect to Socket.IO
```javascript
const socket = io('http://localhost:5000');

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});
```

#### Join Chat Room
```javascript
socket.emit('join_room', 'room-id-123');
```

#### Send Message
```javascript
socket.emit('send_message', {
  roomId: 'room-id-123',
  senderId: 'user-uuid',
  text: 'Hello, what is your price?',
  targetLang: 'hi'
});
```

#### Receive Message
```javascript
socket.on('receive_message', (data) => {
  console.log('Message:', data);
  // {
  //   roomId: 'room-id-123',
  //   senderId: 'user-uuid',
  //   text: 'Hello, what is your price?',
  //   translated_text: 'नमस्ते, आपकी कीमत क्या है?',
  //   targetLang: 'hi',
  //   confidence: 0.85,
  //   timestamp: '2026-01-26T17:39:30.859Z'
  // }
});
```

---

## 🚢 Deployment

### Docker Deployment

**Prerequisites:**
- Docker Engine 20.10+
- Docker Compose 2.0+

**Steps:**
```bash
# Clone repository
git clone https://github.com/yourusername/SilkRoute.git
cd SilkRoute

# Configure environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# Edit environment files with production values
nano backend/.env
nano frontend/.env.local

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**Services Started:**
- Backend API: http://localhost:5000
- Frontend App: http://localhost:3000
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### Production Deployment Checklist

- [ ] **Environment Variables**
  - [ ] Set strong `NEXTAUTH_SECRET`
  - [ ] Configure production `DATABASE_URL`
  - [ ] Set `NODE_ENV=production`
  - [ ] Add Google OAuth credentials (if using)
  
- [ ] **Security**
  - [ ] Enable HTTPS/SSL certificates
  - [ ] Enable bcrypt password hashing
  - [ ] Configure CORS for production domains
  - [ ] Set up rate limiting
  - [ ] Enable CSRF protection
  
- [ ] **Database**
  - [ ] Migrate from SQLite to PostgreSQL
  - [ ] Run database migrations
  - [ ] Set up automated backups
  - [ ] Configure connection pooling
  
- [ ] **Performance**
  - [ ] Enable Redis for caching
  - [ ] Configure CDN for static assets
  - [ ] Enable gzip compression
  - [ ] Set up load balancing
  
- [ ] **Monitoring**
  - [ ] Configure logging (Winston)
  - [ ] Set up error tracking (Sentry)
  - [ ] Add performance monitoring
  - [ ] Configure health checks

---

## 🧪 Testing

### Run Backend Tests
```bash
cd backend
npm test                    # Run all tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests
npm run test:coverage      # Coverage report
```

### Run Frontend Tests
```bash
cd frontend
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
```

### Manual Testing
```bash
# Test backend API
curl http://localhost:5000/api/prices

# Test registration
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"pass123","userType":"buyer"}'

# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"pass123"}'
```

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Commit with conventional commits**
   ```bash
   git commit -m "feat: add amazing feature"
   ```
5. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```
6. **Open a Pull Request**

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Test changes
- `chore:` Build/tooling changes

### Code Style

- **Frontend**: ESLint + Prettier (configured)
- **Backend**: ESLint + Prettier (configured)
- **TypeScript**: Strict mode enabled

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **HuggingFace** for AI model infrastructure
- **LibreTranslate** for open-source translation
- **Next.js** team for the amazing framework
- **Socket.IO** for real-time communication
- **Indian Agricultural Community** for inspiration

---

## 📞 Support & Contact

- **Issues**: [GitHub Issues](https://github.com/yourusername/SilkRoute/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/SilkRoute/discussions)
- **Email**: support@silkroute.com
- **Documentation**: [docs.silkroute.com](https://docs.silkroute.com)

---

<div align="center">

**Made with ❤️ for Indian**

[⬆ Back to Top](#-silkroute)

</div>
