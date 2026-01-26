import Link from 'next/link';
import { ArrowRight, MessageCircle, TrendingUp } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[85vh] px-4 py-8 text-center">
      {/* Hero Section */}
      <div className="max-w-4xl space-y-6 w-full">
        <div className="bg-accent-purple text-white font-semibold px-4 py-2 rounded-full inline-block text-sm shadow-md">
          Welcome to Local Trade 2.0
        </div>
        
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-primary-text tracking-tight leading-tight">
          Trade in <span className="text-accent-purple">Your Language</span>, <br className="hidden sm:block" />
          Get the <span className="text-success-text">Fair Price</span>.
        </h1>
        
        <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
          SilkRoute connects local farmers and buyers with real-time translation and AI-assisted negotiation.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 w-full max-w-md mx-auto">
          <Link 
            href="/auth" 
            className="flex items-center justify-center gap-2 bg-accent-purple text-white px-6 sm:px-8 py-3 rounded-full font-bold text-base sm:text-lg hover:bg-accent-purple-hover transition shadow-lg hover:shadow-xl w-full sm:w-auto"
          >
            <MessageCircle size={20} />
            Get Started
          </Link>
          
          <Link 
            href="/dashboard" 
            className="flex items-center justify-center gap-2 bg-white text-foreground border-2 border-accent-purple px-6 sm:px-8 py-3 rounded-full font-bold text-base sm:text-lg hover:bg-accent-purple hover:text-white transition shadow-md w-full sm:w-auto"
          >
            <TrendingUp size={20} />
            Check Prices
          </Link>
        </div>
      </div>

      {/* Language Pills */}
      <div className="mt-12 sm:mt-16 w-full max-w-4xl">
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-sm font-medium text-primary-text px-4">
          <div className="px-4 py-3 bg-background border-2 border-border-lavender rounded-2xl shadow-sm text-center">🇮🇳 Hindi (हिंदी)</div>
          <div className="px-4 py-3 bg-background border-2 border-border-lavender rounded-2xl shadow-sm text-center">Bengali (বাংলা)</div>
          <div className="px-4 py-3 bg-background border-2 border-border-lavender rounded-2xl shadow-sm text-center">Tamil (தமிழ்)</div>
          <div className="px-4 py-3 bg-background border-2 border-border-lavender rounded-2xl shadow-sm text-center">Telugu (తెలుగు)</div>
        </div>
      </div>
    </main>
  );
}
