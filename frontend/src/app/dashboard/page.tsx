import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// Mock Data matching backend service
const PRICES = [
  { id: 1, name: 'Potato (आलू)', price: 20, unit: 'kg', trend: 'up', image: '🥔' },
  { id: 2, name: 'Onion (प्याज)', price: 35, unit: 'kg', trend: 'down', image: '🧅' },
  { id: 3, name: 'Tomato (टमाटर)', price: 40, unit: 'kg', trend: 'up', image: '🍅' },
  { id: 4, name: 'Rice (चावल)', price: 50, unit: 'kg', trend: 'stable', image: '🍚' },
];

export default function Dashboard() {
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Mandi Rates Today</h1>
        <p className="text-gray-500">Live market prices from local mandis</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PRICES.map((item) => (
          <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition">
            <div className="flex items-center gap-4">
              <div className="text-4xl bg-gray-50 p-3 rounded-lg">{item.image}</div>
              <div>
                <h3 className="font-bold text-lg text-gray-800">{item.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-medium px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                    Fair Price
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">₹{item.price}<span className="text-sm font-normal text-gray-400">/{item.unit}</span></div>
              <div className={`flex items-center justify-end gap-1 text-sm font-medium ${
                item.trend === 'up' ? 'text-red-500' : item.trend === 'down' ? 'text-green-600' : 'text-gray-400'
              }`}>
                {item.trend === 'up' && <><TrendingUp size={16} /> +5%</>}
                {item.trend === 'down' && <><TrendingDown size={16} /> -2%</>}
                {item.trend === 'stable' && <><Minus size={16} /> Stable</>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
