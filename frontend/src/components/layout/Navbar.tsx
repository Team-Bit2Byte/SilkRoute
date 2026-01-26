'use client';

import Link from 'next/link';
import { Menu, User, X, LogIn, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
    router.push('/');
  };

  const getUserIcon = () => {
    if (!user) return '👤';
    switch(user.userType) {
      case 'farmer': return '🌾';
      case 'vendor': return '🏪';
      case 'buyer': return '🛒';
      default: return '👤';
    }
  };

  return (
    <nav className="bg-accent-purple text-background shadow-md relative">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="h-6 w-6 cursor-pointer md:hidden"
            >
              {isMenuOpen ? <X /> : <Menu />}
            </button>
            <Link href="/" className="text-xl font-bold tracking-tight">
              SilkRoute
            </Link>
          </div>
          
          <div className="hidden md:flex gap-6 font-medium">
            <Link href="/dashboard" className="hover:text-border-lavender transition px-2 py-1">Market Prices</Link>
            <Link href="/chat" className="hover:text-border-lavender transition px-2 py-1">Negotiate</Link>
            {isAuthenticated && (user?.userType === 'farmer' || user?.userType === 'vendor') && (
              <Link href="/sell" className="hover:text-border-lavender transition px-2 py-1">Sell Item</Link>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <>
                <div className="hidden sm:flex items-center gap-2 bg-background/20 px-3 py-1 rounded-full">
                  <span className="text-lg">{getUserIcon()}</span>
                  <span className="text-sm font-medium">{user.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 bg-background/20 hover:bg-background/30 px-3 py-2 rounded-full transition"
                  title="Logout"
                >
                  <LogOut size={18} />
                  <span className="hidden sm:inline text-sm">Logout</span>
                </button>
              </>
            ) : (
              <Link 
                href="/auth" 
                className="flex items-center gap-2 bg-background/20 hover:bg-background/30 px-3 py-2 rounded-full transition"
              >
                <LogIn size={18} />
                <span className="hidden sm:inline text-sm font-medium">Login</span>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-accent-purple border-t border-background/20 z-50">
            <div className="flex flex-col p-4 space-y-3">
              <Link 
                href="/dashboard" 
                className="hover:text-border-lavender transition py-2 px-3 rounded"
                onClick={() => setIsMenuOpen(false)}
              >
                Market Prices
              </Link>
              <Link 
                href="/chat" 
                className="hover:text-border-lavender transition py-2 px-3 rounded"
                onClick={() => setIsMenuOpen(false)}
              >
                Negotiate
              </Link>
              {isAuthenticated && (user?.userType === 'farmer' || user?.userType === 'vendor') && (
                <Link 
                  href="/sell" 
                  className="hover:text-border-lavender transition py-2 px-3 rounded"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sell Item
                </Link>
              )}
              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-2 py-2 px-3 bg-background/10 rounded">
                    <span className="text-lg">{getUserIcon()}</span>
                    <span className="text-sm font-medium">{user?.name}</span>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="bg-background/20 hover:bg-background/30 transition py-2 px-3 rounded flex items-center gap-2"
                  >
                    <LogOut size={18} />
                    Logout
                  </button>
                </>
              ) : (
                <Link 
                  href="/auth" 
                  className="bg-background/20 hover:bg-background/30 transition py-2 px-3 rounded flex items-center gap-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <LogIn size={18} />
                  Login / Register
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
