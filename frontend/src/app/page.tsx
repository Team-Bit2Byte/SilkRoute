import Link from 'next/link';
import { ArrowRight, MessageCircle, TrendingUp } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[85vh] p-6 text-center">
      {/* Hero Section */}
      <div className="max-w-2xl space-y-6">
        <div className="bg-accent-purple text-white font-semibold px-4 py-2 rounded-full inline-block text-sm shadow-md">
          Welcome to Local Trade 2.0
        </div>
        
        <h1 className="text-4xl sm:text-6xl font-extrabold text-primary-text tracking-tight">
          Trade in <span className="text-accent-purple">Your Language</span>, <br />
          Get the <span className="text-success-text">Fair Price</span>.
        </h1>
        
        <p className="text-lg text-gray-600">
          SilkRoute connects local farmers and buyers with real-time translation and AI-assisted negotiation.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link 
            href="/chat" 
            className="flex items-center justify-center gap-2 bg-accent-purple text-white px-8 py-3 rounded-full font-bold text-lg hover:bg-accent-purple-hover transition shadow-lg hover:shadow-xl"
          >
            <MessageCircle size={24} />
            Start Chatting
          </Link>
          
          <Link 
            href="/dashboard" 
            className="flex items-center justify-center gap-2 bg-white text-foreground border-2 border-accent-purple px-8 py-3 rounded-full font-bold text-lg hover:bg-accent-purple hover:text-white transition shadow-md"
          >
            <TrendingUp size={24} />
            Check Prices
          </Link>
        </div>
      </div>

      {/* Language Pills (Visual only for landing) */}
      <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm font-medium text-primary-text">
        <div className="px-4 py-2 bg-background border-2 border-border-lavender rounded-2xl shadow-sm">🇮🇳 Hindi (हिंदी)</div>
        <div className="px-4 py-2 bg-background border-2 border-border-lavender rounded-2xl shadow-sm">Bengali (বাংলা)</div>
        <div className="px-4 py-2 bg-background border-2 border-border-lavender rounded-2xl shadow-sm">Tamil (தமிழ்)</div>
        <div className="px-4 py-2 bg-background border-2 border-border-lavender rounded-2xl shadow-sm">Telugu (తెలుగు)</div>
      </div>
    </main>
  );
}
