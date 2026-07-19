import React, { useState } from 'react';
import { 
  Code,
  Database,
  Megaphone,
  PenTool,
  Star,
  User,
  Clock,
  BookOpen
} from 'lucide-react';
import Hero from './Hero';
import { Course, Transaction } from '../types';
import { translations, Language } from '../translations';

interface HomeViewProps {
  courses: Course[];
  transactions: Transaction[];
  userEmail: string;
  language: Language;
  onExploreCourses: () => void;
  onBuyCourse: (course: Course) => void;
  onViewCourse: (course: Course) => void;
  cart?: string[];
  onToggleCart?: (courseId: string) => void;
  unlockedCourseIds?: string[];
}

export default function HomeView({
  courses,
  transactions,
  userEmail,
  language,
  onExploreCourses,
  onBuyCourse,
  onViewCourse,
  unlockedCourseIds = []
}: HomeViewProps) {
  const t = translations[language];

  const hasPurchased = (courseId: string) => {
    const fromTransactions = transactions.some(
      (tx) => tx.courseId === courseId && 
              tx.studentEmail?.toLowerCase().trim() === userEmail?.toLowerCase().trim() && 
              tx.status === 'SUCCESS'
    );
    return fromTransactions || (unlockedCourseIds && unlockedCourseIds.includes(courseId));
  };

  const isPending = (courseId: string) => {
    return transactions.some(
      (tx) => tx.courseId === courseId && 
              tx.studentEmail?.toLowerCase().trim() === userEmail?.toLowerCase().trim() && 
              tx.status === 'PENDING'
    );
  };

  const getCourseMeta = (courseId: string) => {
    const num = courseId.charCodeAt(courseId.length - 1) || 0;
    const rating = (4.7 + (num % 4) * 0.1).toFixed(1);
    const reviews = (10 + (num % 9) * 3) + "k";
    const hours = 6 + (num % 7) * 3;
    const instructor = num % 2 === 0 ? "Dr. Ava Sharma" : "Prof. R. Gupta";
    return { rating, reviews, hours, instructor };
  };

  const featuredCourses = courses.slice(0, 4);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 pb-10" id="home-view-container">
      {/* HERO SECTION */}
      <Hero onExploreCourses={onExploreCourses} />

      {/* POPULAR CATEGORIES */}
      <section className="px-6 py-8 max-w-7xl mx-auto">
        <h2 className="text-base md:text-lg font-black text-slate-900 uppercase tracking-widest mb-6 border-b border-slate-200 pb-2">
          Popular Categories
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#E3F2FD] rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-[#1565C0] hover:scale-105 transition-transform cursor-pointer shadow-sm border border-[#BBDEFB]">
            <Code className="w-8 h-8" />
            <span className="text-xs font-black uppercase tracking-wider">Web Dev</span>
          </div>
          <div className="bg-[#E8F5E9] rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-[#2E7D32] hover:scale-105 transition-transform cursor-pointer shadow-sm border border-[#C8E6C9]">
            <Database className="w-8 h-8" />
            <span className="text-xs font-black uppercase tracking-wider">Data Science</span>
          </div>
          <div className="bg-[#FFF3E0] rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-[#E65100] hover:scale-105 transition-transform cursor-pointer shadow-sm border border-[#FFE0B2]">
            <Megaphone className="w-8 h-8" />
            <span className="text-xs font-black uppercase tracking-wider">Marketing</span>
          </div>
          <div className="bg-[#FFF9C4] rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-[#F57F17] hover:scale-105 transition-transform cursor-pointer shadow-sm border border-[#FFF59D]">
            <PenTool className="w-8 h-8" />
            <span className="text-xs font-black uppercase tracking-wider">Design</span>
          </div>
        </div>
      </section>

      {/* FEATURED COURSES */}
      <section className="px-6 py-8 max-w-7xl mx-auto">
        <h2 className="text-base md:text-lg font-black text-slate-900 uppercase tracking-widest mb-6 border-b border-slate-200 pb-2">
          Featured Courses
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredCourses.length > 0 ? featuredCourses.map((course) => {
            const owned = hasPurchased(course.id);
            const meta = getCourseMeta(course.id);
            
            return (
              <div 
                key={course.id} 
                className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
              >
                <div className="h-40 overflow-hidden">
                  <img 
                    src={course.thumbnail} 
                    alt={course.title} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="text-sm font-bold text-slate-900 leading-tight mb-2 line-clamp-2">{course.title}</h3>
                  <div className="flex items-center gap-1 text-amber-500 mb-2">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span className="text-xs font-bold text-slate-700">{meta.rating}</span>
                    <span className="text-[10px] text-slate-500 ml-1">{meta.reviews} reviews</span>
                  </div>
                  <div className="space-y-1 mb-4 text-[10px] text-slate-500 font-medium">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3" />
                      <span>{meta.instructor}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      <span>{meta.hours} hrs</span>
                    </div>
                  </div>
                  
                  <div className="mt-auto flex items-end justify-between mb-4">
                    <span className="text-lg font-black text-slate-900">
                      {course.price === 0 ? 'FREE' : `₹${course.price}`}
                    </span>
                  </div>
                  
                  {owned ? (
                    <button 
                      onClick={() => onViewCourse(course)}
                      className="w-full bg-[#1976D2] hover:bg-[#1565C0] text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                    >
                      Continue Learning
                    </button>
                  ) : isPending(course.id) ? (
                    <button 
                      disabled
                      className="w-full bg-slate-100 border border-slate-200 text-slate-500 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider cursor-not-allowed"
                    >
                      Pending Approval
                    </button>
                  ) : (
                    <button 
                      onClick={() => onBuyCourse(course)}
                      className="w-full bg-[#1976D2] hover:bg-[#1565C0] text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                    >
                      Enroll Now
                    </button>
                  )}
                </div>
              </div>
            );
          }) : (
            <div className="col-span-full text-center py-12 text-slate-500">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No featured courses available at the moment.</p>
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-12 border-t border-slate-200 pt-8 pb-4 text-center">
        <p className="text-xs text-slate-500 font-medium">
          <a href="#" className="hover:text-slate-900 transition-colors">Terms</a> | <a href="#" className="hover:text-slate-900 transition-colors">Privacy</a> | Copyright 2024 The New Tips
        </p>
      </footer>
    </div>
  );
}
