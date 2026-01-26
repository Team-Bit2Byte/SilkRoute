import Link from 'next/link';
import { Menu, User } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="bg-accent-purple text-background p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Menu className="h-6 w-6 cursor-pointer md:hidden" />
          <Link href="/" className="text-xl font-bold tracking-tight">
            SilkRoute
          </Link>
        </div>
        
        <div className="hidden md:flex gap-6 font-medium">
          <Link href="/dashboard" className="hover:text-border-lavender transition">Market Prices</Link>
          <Link href="/chat" className="hover:text-border-lavender transition">Negotiate</Link>
          <Link href="/sell" className="hover:text-border-lavender transition">Sell Item</Link>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm hidden sm:inline">Guest User</span>
          <div className="bg-background/20 p-2 rounded-full">
            <User size={20} />
          </div>
        </div>
      </div>
    </nav>
  );
}
