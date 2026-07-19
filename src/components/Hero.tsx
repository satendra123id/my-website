import React from 'react';

interface HeroProps {
  onExploreCourses: () => void;
}

export default function Hero({ onExploreCourses }: HeroProps) {
  return (
    <section className="relative min-h-[500px] flex items-center justify-center text-center px-6 py-20 overflow-hidden bg-slate-950">
      {/* Background with tech/cyber aesthetic */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/60 to-slate-950/80"></div>
      
      <div className="relative z-10 max-w-4xl mx-auto space-y-8">
        <div className="space-y-2">
          <span className="inline-block px-3 py-1 bg-indigo-900/50 border border-indigo-500/50 text-indigo-200 text-xs font-bold uppercase tracking-widest rounded-full">
            Premium Digital Academy
          </span>
          <h1 className="text-4xl md:text-7xl font-black text-white tracking-tighter leading-tight uppercase">
            Elevate Your Skills with <span className="text-indigo-400">India’s Premier</span> Learning Hub
          </h1>
        </div>
        
        <p className="text-base md:text-lg text-slate-300 font-medium max-w-2xl mx-auto leading-relaxed">
          Get instant access to downloadable files, high-speed project templates, and structured premium video tutorials immediately upon secure confirmation.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button 
            onClick={onExploreCourses}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl shadow-indigo-600/30 hover:scale-105"
          >
            Explore Courses
          </button>
          <div className="flex items-center gap-2 px-6 py-4 bg-slate-900/50 border border-slate-700 rounded-2xl">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="text-slate-200 text-sm font-bold uppercase tracking-wide">Secure Razorpay gateway</span>
          </div>
        </div>
      </div>
    </section>
  );
}
