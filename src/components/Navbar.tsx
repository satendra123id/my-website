import React from 'react';
import { Globe, Shield, LogOut, Store, Search, ShoppingCart, User, Languages } from 'lucide-react';
import { Language, translations } from '../translations';

interface NavbarProps {
  userEmail: string;
  userDisplayName: string;
  isAdmin: boolean;
  isAdminMode: boolean;
  onChangeMode: (isAdminMode: boolean) => void;
  onLogout: () => void;
  onProfileClick: () => void;
  activeTheme: string;
  onThemeChange: (theme: string) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  cartCount?: number;
  onCartClick?: () => void;
  onSearchClick?: () => void;
}

export default function Navbar({
  userEmail,
  userDisplayName,
  isAdmin,
  isAdminMode,
  onChangeMode,
  onLogout,
  onProfileClick,
  activeTheme,
  onThemeChange,
  language,
  onLanguageChange,
  cartCount = 0,
  onCartClick,
  onSearchClick
}: NavbarProps) {
  const t = translations[language];
  const userInitials = (userDisplayName || userEmail || 'U')
    .split(' ')
    .map((word) => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const themes = [
    { id: 'amber', name: 'Golden Amber', colorClass: 'bg-amber-500' },
    { id: 'indigo', name: 'Royal Indigo', colorClass: 'bg-indigo-500' },
    { id: 'emerald', name: 'Fresh Emerald', colorClass: 'bg-emerald-500' },
    { id: 'violet', name: 'Cyber Violet', colorClass: 'bg-violet-500' },
    { id: 'rose', name: 'Premium Rose', colorClass: 'bg-rose-500' },
  ];

  return (
    <nav className="bg-white/90 backdrop-blur-md border-b border-slate-200 text-slate-900 shadow-xl py-3 px-4 sm:px-6 sticky top-0 z-40 flex flex-wrap gap-3 justify-between items-center animate-fade-in" id="main-navigation-navbar">
      
      {/* Brand logo & title */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="bg-indigo-600 text-white p-2 sm:p-2 rounded-xl shadow-lg shadow-accent-500/20 flex items-center justify-center transition-all duration-300">
          <Globe className="w-4 h-4 sm:w-4.5 sm:h-4.5 fill-current" />
        </div>
        <div>
          <div className="flex items-center gap-1 leading-none">
            <span className="text-[9px] sm:text-[10px] font-bold tracking-widest uppercase text-indigo-600 transition-colors duration-300">
              {t.home}
            </span>
          </div>
          <span className="text-base sm:text-lg font-bold font-display tracking-tight uppercase" id="navbar-brand-name">
            The New Tips <span className="text-indigo-600 font-extrabold text-xs lowercase italic font-sans transition-colors duration-300">Courses</span>
          </span>
        </div>
      </div>

      {/* Profile area and Action buttons */}
      <div className="flex items-center gap-2 sm:gap-3.5 ml-auto sm:ml-0" id="navbar-actions-row">
        
        {/* Interactive Search Icon */}
        <button
          onClick={() => onLanguageChange(language === 'en' ? 'hi' : 'en')}
          className="p-2 sm:p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-indigo-600 rounded-xl transition-all cursor-pointer flex items-center gap-1 group"
          title={language === 'en' ? 'Hindi (नमस्ते)' : 'English'}
          id="navbar-language-btn"
        >
          <Languages className="w-4 h-4" />
          <span className="text-[9px] font-black uppercase tracking-tighter">
            {language === 'en' ? 'HI' : 'EN'}
          </span>
        </button>

        {/* Interactive Search Icon */}
        <button
          onClick={() => {
            if (onSearchClick) {
              onSearchClick();
            }
          }}
          className="p-2 sm:p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-indigo-600 rounded-xl transition-all cursor-pointer relative group"
          title="Search Courses 🔍"
          id="navbar-search-btn"
        >
          <Search className="w-4 h-4" />
          <span className="absolute -top-1 -right-1 bg-indigo-600 w-1.5 h-1.5 rounded-full animate-ping"></span>
        </button>

        {/* Interactive Cart Icon with real dynamic badge count */}
        <button
          onClick={onCartClick}
          className="p-2 sm:p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-indigo-600 rounded-xl transition-all cursor-pointer relative group"
          title="Cart 🛒"
          id="navbar-cart-btn"
        >
          <ShoppingCart className="w-4 h-4" />
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border border-slate-200 animate-bounce shadow-md">
              {cartCount}
            </span>
          )}
        </button>

        {/* Toggle Mode button for admins to shift between public storefront and creator portal */}
        {isAdmin && (
          <button
            onClick={() => onChangeMode(!isAdminMode)}
            className={`px-3 py-2 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-md flex items-center gap-1.5 sm:gap-2 border ${
              isAdminMode 
                ? 'bg-indigo-600 hover:bg-accent-600 text-white border-accent-400 font-extrabold shadow-accent-500/10' 
                : 'bg-slate-50 hover:bg-slate-100 text-slate-900 border-slate-200 hover:border-slate-200'
            }`}
            id="toggle-admin-mode-btn"
          >
            {isAdminMode ? (
              <>
                <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline min-[480px]:inline sm:inline">{t.courses}</span>
              </>
            ) : (
              <>
                <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline min-[480px]:inline sm:inline">{t.adminPortal}</span>
              </>
            )}
          </button>
        )}

        {/* Logged in User Profile Badge or Guest Sign In */}
        {userEmail ? (
          <>
            <button 
              onClick={onProfileClick}
              className="flex items-center gap-2 sm:gap-2.5 bg-slate-50 border border-slate-200 pl-2 sm:pl-2.5 pr-2.5 sm:pr-3 py-1.5 rounded-xl hover:bg-zinc-850 hover:border-slate-300 transition-all duration-300 cursor-pointer" 
              id="navbar-user-badge"
              title="My Profile 👤"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-accent-600 border border-accent-500/50 flex items-center justify-center text-[10px] sm:text-xs font-bold text-slate-900 select-none shadow-md transition-all duration-300">
                <User className="w-4.5 h-4.5" />
              </div>
              <div className="text-left hidden min-[540px]:block">
                <span className="text-xs font-bold text-slate-900 block max-w-24 sm:max-w-28 truncate">
                  {userDisplayName}
                </span>
                <span className="text-[8px] sm:text-[9px] font-bold text-indigo-600 block uppercase tracking-wider font-mono transition-colors duration-300">
                  {t.profile} 👤
                </span>
              </div>
            </button>

            {/* Sign Out Button */}
            <button
              onClick={onLogout}
              className="p-2.5 bg-slate-50 hover:bg-red-950/40 hover:border-red-900/30 border border-slate-200 text-slate-500 hover:text-red-600 rounded-xl transition-all cursor-pointer flex items-center justify-center"
              title="Sign Out"
              id="navbar-logout-btn"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            onClick={onProfileClick}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-accent-500/10 hover:shadow-indigo-600/30 transform active:scale-95 shrink-0"
            id="navbar-login-btn"
          >
            <User className="w-3.5 h-3.5" />
            <span>Sign In / लॉगिन</span>
          </button>
        )}

      </div>
    </nav>
  );
}
