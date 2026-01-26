import { TrendingUp, TrendingDown, Minus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// Mock Data matching backend service
const PRICES = [
  { id: 1, name: 'Potato (आलू)', price: 20, unit: 'kg', trend: 'up', image: '🥔' },
  { id: 2, name: 'Onion (प्याज)', price: 35, unit: 'kg', trend: 'down', image: '🧅' },
  { id: 3, name: 'Tomato (टमाटर)', price: 40, unit: 'kg', trend: 'up', image: '🍅' },
  { id: 4, name: 'Rice (चावल)', price: 50, unit: 'kg', trend: 'stable', image: '🍚' },
  { id: 5, name: 'Wheat (गेहूं)', price: 25, unit: 'kg', trend: 'up', image: '🌾' },
  { id: 6, name: 'Carrot (गाजर)', price: 30, unit: 'kg', trend: 'down', image: '🥕' },
];

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="container mx-auto max-w-6xl">
        <header className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/" className="sm:hidden">
              <ArrowLeft size={24} className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800">Mandi Rates Today</h1>
              <p className="text-sm sm:text-base text-gray-500 mt-1">Live market prices from local mandis</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {PRICES.map((item) => (
            <div key={item.id} className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="text-3xl sm:text-4xl bg-gray-50 p-2 sm:p-3 rounded-lg">{item.image}</div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-base sm:text-lg text-gray-800 truncate">{item.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs sm:text-sm font-medium px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                        Fair Price
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-gray-900">
                    ₹{item.price}
                    <span className="text-sm font-normal text-gray-400">/{item.unit}</span>
                  </div>
                </div>
                
                <div className={`flex items-center gap-1 text-xs sm:text-sm font-medium ${
                  item.trend === 'up' ? 'text-red-500' : item.trend === 'down' ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {item.trend === 'up' && <><TrendingUp size={14} /> +5%</>}
                  {item.trend === 'down' && <><TrendingDown size={14} /> -2%</>}
                  {item.trend === 'stable' && <><Minus size={14} /> Stable</>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 sm:mt-12 flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/chat" 
            className="bg-accent-purple text-white px-6 py-3 rounded-full font-bold text-center hover:bg-accent-purple-hover transition shadow-lg"
          >
            Start Negotiating
          </Link>
          <button className="bg-white text-accent-purple border-2 border-accent-purple px-6 py-3 rounded-full font-bold hover:bg-accent-purple hover:text-white transition">
            Set Price Alert
          </button>
        </div>
      </div>
    </div>
  );
}
