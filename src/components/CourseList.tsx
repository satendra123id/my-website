import React, { useState } from 'react';
import { Search, Play, FileText, CheckCircle, ArrowRight, ShieldCheck, Star, Award, Lock, Heart, Clock, ShoppingCart, X, Share2 } from 'lucide-react';
import { Course, Transaction } from '../types';
import { translations, Language } from '../translations';
import { ReviewSection } from './ReviewSection';
import { motion, AnimatePresence } from 'motion/react';

interface CourseListProps {
  courses: Course[];
  transactions: Transaction[];
  userEmail: string;
  language: Language;
  onBuyCourse: (course: Course) => void;
  onViewCourse: (course: Course) => void;
  wishlist?: string[];
  onToggleWishlist?: (courseId: string) => void;
  cart?: string[];
  onToggleCart?: (courseId: string) => void;
  unlockedCourseIds?: string[];
}

function CourseCountdown({ courseId }: { courseId: string }) {
  const [timeLeft, setTimeLeft] = useState(() => {
    try {
      const key = `tnt_timer_${courseId}`;
      const saved = localStorage.getItem(key);
      const now = Date.now();
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.expiry > now) {
          return Math.max(0, Math.floor((parsed.expiry - now) / 1000));
        }
      }
      // Generate a new expiry between 1 hour 15 mins to 1 hour 58 mins (approx 2 hours)
      const randomSeconds = (75 * 60) + Math.floor(Math.random() * (43 * 60)); 
      const expiry = now + (randomSeconds * 1000);
      localStorage.setItem(key, JSON.stringify({ expiry }));
      return randomSeconds;
    } catch (e) {
      return 7200; // 2 hours fallback
    }
  });

  React.useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  if (timeLeft <= 0) return null;

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  const hStr = hours.toString().padStart(2, '0');
  const mStr = minutes.toString().padStart(2, '0');
  const sStr = seconds.toString().padStart(2, '0');

  return (
    <div className="bg-teal-950/50 border border-teal-400 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-black text-slate-900 uppercase tracking-wider animate-pulse gap-2 mt-4 shadow-[0_0_15px_rgba(20,184,166,0.3)]">
      <span className="flex items-center gap-2">
        <span className="text-teal-300 text-lg">⚡</span> Limited Time Offer:
      </span>
      <span className="text-teal-200 font-mono tracking-widest bg-teal-950 px-3 py-1 rounded-lg border border-teal-500/50 shadow-inner">
        ENDS IN {hStr}:{mStr}:{sStr}
      </span>
    </div>
  );
}

export default function CourseList({
  courses,
  transactions,
  userEmail,
  language,
  onBuyCourse,
  onViewCourse,
  wishlist = [],
  onToggleWishlist,
  cart = [],
  onToggleCart,
  unlockedCourseIds = []
}: CourseListProps) {
  const t = translations[language];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [viewingDetailsCourse, setViewingDetailsCourse] = useState<Course | null>(null);

  // Helper to check if student owns/purchased the course
  const hasPurchased = (courseId: string) => {
    const fromTransactions = transactions.some(
      (tx) => tx.courseId === courseId && 
              tx.studentEmail?.toLowerCase().trim() === userEmail?.toLowerCase().trim() && 
              tx.status === 'SUCCESS'
    );
    return fromTransactions || (unlockedCourseIds && unlockedCourseIds.includes(courseId));
  };

  // Helper to check if a purchase request is currently pending
  const isPending = (courseId: string) => {
    return transactions.some(
      (tx) => tx.courseId === courseId && 
              tx.studentEmail?.toLowerCase().trim() === userEmail?.toLowerCase().trim() && 
              tx.status === 'PENDING'
    );
  };

  const categories = ['ALL', 'DEVELOPMENT', 'MARKETING', 'AI / AUTOMATION', 'ETHICAL HACKING'];

  // Filter courses based on search & category
  const filteredCourses = courses.filter((course) => {
    const matchesSearch = 
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = 
      selectedCategory === 'ALL' || 
      course.category.toUpperCase() === selectedCategory.toUpperCase();
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8" id="storefront-container">
      
      {/* Top Banner with Elegant Dark theme styling */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 text-slate-900 rounded-3xl p-8 md:p-10 shadow-2xl border border-slate-200 relative overflow-hidden" id="store-hero-banner">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-600/5 rounded-full blur-3xl -ml-20 -mb-20"></div>
        
        <div className="relative space-y-5 max-w-4xl" id="store-banner-header">
          <span className="bg-white text-indigo-600 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border border-slate-200 inline-flex items-center gap-1.5 shadow-md">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
            Premium Digital Academy
          </span>
          <h1 className="text-3xl md:text-5xl font-bold font-display tracking-tight leading-tight animate-fade-in" id="store-hero-title">
            Elevate Your Skills with <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-400 to-accent-200">
              India's Premier Learning Hub
            </span>
          </h1>
          <p className="text-slate-500 text-xs md:text-sm leading-relaxed max-w-2xl">
            Get instant access to downloadable files, high-speed project templates, and structured premium video tutorials immediately upon secure confirmation.
          </p>

          {/* Core confirmation checklist features matching screenshot */}
          <div className="flex flex-wrap gap-3 pt-1" id="store-features-checklists">
            <div className="bg-white border border-slate-200 rounded-full py-1.5 px-4 flex items-center gap-2 text-[11px] font-semibold text-slate-700 shadow-md">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
              Secure Razorpay gateway
            </div>
            <div className="bg-white border border-slate-200 rounded-full py-1.5 px-4 flex items-center gap-2 text-[11px] font-semibold text-slate-700 shadow-md">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
              Direct UPI Verification
            </div>
          </div>
        </div>
      </div>

      {/* Filter Category & Search Row */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row justify-between items-center gap-4" id="filters-row-card">
        
        {/* Search input */}
        <div className="relative w-full md:max-w-md" id="search-box">
          <Search className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchCourses}
            className="w-full bg-white border border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 rounded-2xl py-2.5 pl-10 pr-4 text-xs sm:text-sm transition-all outline-none text-slate-900 placeholder-zinc-500"
            id="course-search-field"
          />
        </div>

        {/* Categories togglers */}
        <div className="flex bg-white p-1 rounded-2xl overflow-x-auto w-full md:w-auto border border-slate-200" id="category-toggles-container">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white font-extrabold shadow-lg'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {cat === 'ALL' ? (language === 'hi' ? 'सभी' : 'All') : cat}
            </button>
          ))}
        </div>

      </div>

      {/* Courses Products Catalog grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" id="products-grid-catalog">
        {filteredCourses.map((course) => {
          const owned = hasPurchased(course.id);
          const pending = isPending(course.id);
          
          // Calculate dynamic percentage discount
          const discountPercent = Math.round(((course.originalPrice - course.price) / course.originalPrice) * 100);
          const isFree = course.price === 0;

          // Stable pseudo-random stats based on course ID hash
          const getCardMeta = (id: string) => {
            const num = id.charCodeAt(id.length - 1) || 0;
            const rating = (4.7 + (num % 3) * 0.1).toFixed(1);
            const students = 850 + (num % 10) * 310;
            const hours = 5 + (num % 8) * 2;
            const isBestseller = num % 3 === 0;
            return { rating, students, hours, isBestseller };
          };

          const meta = getCardMeta(course.id);

          return (
            <div 
              key={course.id} 
              className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl hover:border-slate-300/80 transition-all duration-300 flex flex-col group relative"
              id={`course-card-${course.id}`}
            >
              
              {/* Bestseller Badge */}
              {meta.isBestseller && (
                <div className="absolute top-3 left-3 z-10 bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md shadow-lg flex items-center gap-1">
                  <Award className="w-3 h-3 fill-current" /> Bestseller
                </div>
              )}

              {/* Thumbnail Image Container - Standardized Aspect-Ratio and high visual consistency */}
              <div 
                className="relative aspect-video bg-white overflow-hidden cursor-pointer" 
                id="thumbnail-container"
                onClick={() => setViewingDetailsCourse(course)}
              >
                <img 
                  src={course.thumbnail} 
                  alt={course.title} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                  referrerPolicy="no-referrer"
                />

                {/* Floating Share Button */}
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const url = `${window.location.origin}${window.location.pathname}?courseId=${course.id}`;
                    if (navigator.share) {
                      try {
                        await navigator.share({
                          title: course.title,
                          text: `Check out this course: ${course.title}`,
                          url: url,
                        });
                      } catch (err) {
                        console.error('Error sharing:', err);
                      }
                    } else {
                      navigator.clipboard.writeText(url);
                      alert(language === 'hi' ? 'लिंक कॉपी हो गया!' : 'Link copied to clipboard!');
                    }
                  }}
                  className="absolute top-2.5 right-2.5 p-2 bg-white/90 hover:bg-white border border-slate-200 rounded-xl transition-all cursor-pointer shadow-md z-10 hover:scale-110 flex items-center justify-center text-slate-500 hover:text-slate-900"
                  title={language === 'hi' ? 'शेयर करें' : 'Share'}
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
                
                {/* Category tag overlay */}
                <span className="absolute bottom-3 left-3 bg-white/90 border border-slate-200/80 backdrop-blur-md text-slate-900 text-[9px] font-bold tracking-wider uppercase px-2 py-1 rounded-md">
                  {course.category}
                </span>

                {/* Floating Heart Button */}
                {onToggleWishlist && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleWishlist(course.id);
                    }}
                    className="absolute bottom-2.5 right-2.5 p-2 bg-white/90 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-md z-10 hover:scale-110 flex items-center justify-center"
                    title={wishlist.includes(course.id) ? "Remove from Wishlist" : "Add to Wishlist"}
                  >
                    <Heart 
                      className={`w-3.5 h-3.5 transition-all ${
                        wishlist.includes(course.id) 
                          ? 'fill-red-500 text-red-500 scale-110' 
                          : 'text-slate-500 hover:text-slate-900'
                      }`} 
                    />
                  </button>
                )}

                {/* 100% OFF badge OR dynamic percent discount */}
                {isFree ? (
                  <span className="absolute top-3 right-3 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md shadow-md animate-pulse">
                    100% OFF
                  </span>
                ) : (
                  discountPercent > 0 && (
                    <span className="absolute top-3 right-3 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-md">
                      {discountPercent}% OFF
                    </span>
                  )
                )}
              </div>

              {/* Course Detail Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between" id="card-body">
                <div className="space-y-3">
                  
                  {/* Rating & Students Meta Row */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                    <span className="flex items-center gap-1 text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/10">
                      <Star className="w-3.5 h-3.5 fill-current" /> {meta.rating} Rating
                    </span>
                    <span className="text-slate-400">
                      👨‍🎓 {meta.students.toLocaleString()}+ Students
                    </span>
                  </div>

                  <h3 
                    className="text-sm sm:text-base font-bold font-display text-slate-900 tracking-tight leading-snug line-clamp-2 group-hover:text-accent-300 transition-colors cursor-pointer"
                    onClick={() => setViewingDetailsCourse(course)}
                  >
                    {course.title}
                  </h3>
                  <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">
                    {course.description}
                  </p>

                  {/* Duration & Updated Date Metadata Row */}
                  <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 pt-1.5 border-t border-slate-200/40">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" /> {meta.hours} hrs Content
                    </span>
                    <span>
                      Updated 2026
                    </span>
                  </div>

                  {/* Scarcity Countdown Urgency Banner */}
                  {course.originalPrice > course.price && (
                    <CourseCountdown courseId={course.id} />
                  )}
                </div>

                {/* Pricing & action section */}
                <div className="pt-4 flex items-center justify-between mt-5 border-t border-slate-200/60">
                  
                  {/* Prices */}
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-black text-slate-900">{isFree ? 'FREE' : `₹${course.price}`}</span>
                      {!isFree && <span className="text-xs text-slate-400 line-through">₹{course.originalPrice}</span>}
                    </div>
                    <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block mt-0.5">
                      ✓ Lifetime Access
                    </span>
                  </div>

                  {/* Buy / View button */}
                  <div>
                    {owned ? (
                      <button
                        onClick={() => onViewCourse(course)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-slate-900 font-extrabold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                        id={`view-course-btn-${course.id}`}
                      >
                        {t.study} <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : pending ? (
                      <button
                        disabled
                        className="bg-indigo-600/10 text-indigo-600 border border-accent-500/20 font-bold text-xs uppercase tracking-wider px-3.5 py-2.5 rounded-xl cursor-not-allowed flex items-center gap-1.5"
                        id={`pending-course-btn-${course.id}`}
                      >
                        Pending approval
                      </button>
                    ) : (
                      <div className="flex flex-col items-end gap-1.5">
                        <div className="flex items-center gap-2">
                          {/* Add to Cart Toggle Button */}
                          {onToggleCart && (
                            <button
                              onClick={() => onToggleCart(course.id)}
                              className={`p-3 rounded-xl border transition-all duration-300 cursor-pointer flex items-center justify-center ${
                                cart.includes(course.id)
                                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/25'
                                  : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-500 hover:text-indigo-600'
                              }`}
                              title={cart.includes(course.id) ? "Remove from Cart" : "Add to Cart"}
                              id={`cart-toggle-btn-${course.id}`}
                            >
                              <ShoppingCart className="w-4 h-4 fill-current opacity-90" />
                            </button>
                          )}

                          <button
                            onClick={() => onBuyCourse(course)}
                            className="bg-gradient-to-r from-accent-600 to-accent-500 hover:from-accent-500 hover:to-accent-400 text-white font-black text-xs uppercase tracking-widest px-5 py-3 rounded-xl transition-all duration-300 cursor-pointer shadow-lg shadow-accent-600/10 hover:shadow-accent-500/30 transform hover:-translate-y-0.5"
                            id={`buy-course-btn-${course.id}`}
                          >
                            {t.buyNow}
                          </button>
                        </div>
                        <span className="text-[8px] text-slate-400 font-semibold tracking-wide block uppercase text-right leading-none w-full">
                          Instant Access 🔒 Secure
                        </span>
                      </div>
                    )}
                  </div>

                </div>

              </div>

            </div>
          );
        })}
      </div>

      {/* Course Details Modal (Potential Buyers can see reviews) */}
      <AnimatePresence>
        {viewingDetailsCourse && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
                <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wider truncate">Course Overview</h3>
                <button 
                  onClick={() => setViewingDetailsCourse(null)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-slate-900 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="aspect-video bg-slate-50 rounded-2xl overflow-hidden border border-slate-200">
                    <img 
                      referrerPolicy="no-referrer"
                      src={viewingDetailsCourse.thumbnail} 
                      alt={viewingDetailsCourse.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-4">
                    <span className="bg-indigo-600/10 text-indigo-600 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-slate-200">
                      {viewingDetailsCourse.category}
                    </span>
                    <h2 className="text-2xl font-bold text-slate-900 leading-tight">{viewingDetailsCourse.title}</h2>
                    <p className="text-slate-500 text-sm leading-relaxed">{viewingDetailsCourse.description}</p>
                    <div className="flex items-center gap-4 pt-2">
                      <div className="text-2xl font-black text-slate-900">₹{viewingDetailsCourse.price}</div>
                      <div className="text-sm text-slate-400 line-through">₹{viewingDetailsCourse.originalPrice}</div>
                      <div className="bg-emerald-500/10 text-emerald-600 text-[10px] font-bold px-2 py-1 rounded border border-emerald-500/20">
                        {Math.round(((viewingDetailsCourse.originalPrice - viewingDetailsCourse.price) / viewingDetailsCourse.originalPrice) * 100)}% OFF
                      </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                      {hasPurchased(viewingDetailsCourse.id) ? (
                        <button 
                          onClick={() => {
                            onViewCourse(viewingDetailsCourse);
                            setViewingDetailsCourse(null);
                          }}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-widest py-3 rounded-xl transition-all shadow-lg"
                        >
                          {t.study || 'Study Now'}
                        </button>
                      ) : isPending(viewingDetailsCourse.id) ? (
                        <button 
                          disabled
                          className="flex-1 bg-indigo-600/10 text-indigo-600 border border-indigo-600/20 font-bold text-xs uppercase tracking-wider py-3 rounded-xl cursor-not-allowed"
                        >
                          Pending Verification
                        </button>
                      ) : (
                        <button 
                          onClick={() => {
                            onBuyCourse(viewingDetailsCourse);
                            setViewingDetailsCourse(null);
                          }}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest py-3 rounded-xl transition-all shadow-lg shadow-accent-500/20"
                        >
                          Enroll Now
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-8">
                  <ReviewSection 
                    courseId={viewingDetailsCourse.id} 
                    userEmail={userEmail} 
                    userName={null} 
                    readOnly={true}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
