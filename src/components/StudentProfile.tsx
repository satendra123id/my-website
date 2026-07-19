import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  BookOpen, 
  Mail, 
  MessageSquare, 
  LogOut, 
  Award, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight, 
  BookOpenCheck,
  Play,
  FileText,
  Clock,
  Compass,
  Palette,
  Camera,
  Download,
  Settings,
  CheckCircle2,
  X
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { Transaction, Course } from '../types';
import ChatSupport from './ChatSupport';

interface StudentProfileProps {
  userEmail: string;
  userDisplayName: string;
  transactions: Transaction[];
  courses: Course[];
  onBack: () => void;
  onLogout: () => void;
  onViewCourse: (course: Course) => void;
  activeTheme: string;
  onThemeChange: (theme: string) => void;
  unlockedCourseIds?: string[];
}

// Premium pre-set profile photo avatars
const AVATARS = [
  { id: 'av1', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80', name: 'Creative Tech' },
  { id: 'av2', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80', name: 'Professional Pro' },
  { id: 'av3', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80', name: 'UI Designer' },
  { id: 'av4', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80', name: 'Fullstack Dev' },
  { id: 'av5', url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80', name: 'Digital Marketer' },
  { id: 'av6', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80', name: 'Expert Trader' }
];

const THEMES = [
  { id: 'amber', name: 'Golden Amber', colorClass: 'bg-amber-500' },
  { id: 'indigo', name: 'Royal Indigo', colorClass: 'bg-indigo-500' },
  { id: 'emerald', name: 'Fresh Emerald', colorClass: 'bg-emerald-500' },
  { id: 'violet', name: 'Cyber Violet', colorClass: 'bg-violet-500' },
  { id: 'rose', name: 'Premium Rose', colorClass: 'bg-rose-500' },
];

export default function StudentProfile({ 
  userEmail, 
  userDisplayName, 
  transactions, 
  courses, 
  onBack,
  onLogout,
  onViewCourse,
  activeTheme,
  onThemeChange,
  unlockedCourseIds = []
}: StudentProfileProps) {
  const [registrationDate, setRegistrationDate] = useState<string>('July 2026');
  const [showChat, setShowChat] = useState(false);
  
  // Dynamic profile photo selection
  const [selectedAvatar, setSelectedAvatar] = useState<string>(() => {
    return localStorage.getItem(`tnt_avatar_${userEmail}`) || AVATARS[0].url;
  });
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [currentTab, setCurrentTab] = useState<'courses' | 'settings'>('courses');

  // Course completion simulated progress values
  const [courseProgress, setCourseProgress] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem(`tnt_progress_${userEmail}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    // Default initial progress based on course.id
    const initial: Record<string, number> = {};
    courses.forEach(c => {
      const code = c.id.charCodeAt(c.id.length - 1) || 0;
      initial[c.id] = (code % 3) === 0 ? 100 : (code % 2 === 0 ? 75 : 40);
    });
    return initial;
  });

  // Certificate Modal Display state
  const [activeCertificateCourse, setActiveCertificateCourse] = useState<Course | null>(null);

  useEffect(() => {
    localStorage.setItem(`tnt_progress_${userEmail}`, JSON.stringify(courseProgress));
  }, [courseProgress, userEmail]);

  useEffect(() => {
    const fetchUserMeta = async () => {
      const user = auth.currentUser;
      if (user && user.metadata.creationTime) {
        setRegistrationDate(new Date(user.metadata.creationTime).toLocaleDateString(undefined, { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }));
      } else {
        setRegistrationDate('July 5, 2026');
      }
    };
    fetchUserMeta();
  }, []);

  const handleAvatarSelect = (url: string) => {
    setSelectedAvatar(url);
    localStorage.setItem(`tnt_avatar_${userEmail}`, url);
    setShowAvatarPicker(false);
  };

  const updateProgress = (courseId: string, val: number) => {
    setCourseProgress(prev => ({
      ...prev,
      [courseId]: val
    }));
  };

  const purchasedCourseIdsFromTransactions = transactions
    .filter(t => t.studentEmail === userEmail && t.status === 'SUCCESS')
    .map(t => t.courseId);

  const purchasedCourseIds = Array.from(new Set([...purchasedCourseIdsFromTransactions, ...unlockedCourseIds]));

  const purchasedCourses = courses.filter(c => purchasedCourseIds.includes(c.id));

  const pendingCourseIds = transactions
    .filter(t => t.studentEmail === userEmail && t.status === 'PENDING')
    .map(t => t.courseId);

  const pendingCourses = courses.filter(c => pendingCourseIds.includes(c.id));

  // Count of 100% complete courses
  const completedCount = purchasedCourses.filter(c => (courseProgress[c.id] || 0) === 100).length;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 md:p-10 animate-fade-in text-slate-900" id="student-profile-dashboard">
      
      {/* Navigation Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200/80" id="profile-navigation-bar">
        <button 
          onClick={onBack}
          className="text-slate-500 hover:text-slate-900 transition-all font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer group"
          id="profile-back-btn"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Academy
        </button>
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/50">
          Student Profile v3.2
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="profile-main-grid">
        
        {/* Left Column: User Profile Overview Card */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Main User Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col items-center text-center" id="user-identity-card">
            <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-r from-accent-600/20 to-zinc-800/50"></div>
            
            {/* User Avatar with interactive Selection */}
            <div className="relative mt-6 mb-4 group/avatar">
              <div className="absolute inset-0 bg-gradient-to-tr from-accent-500 to-indigo-500 rounded-full blur-md opacity-40 animate-pulse"></div>
              
              <img 
                src={selectedAvatar} 
                alt="Profile Avatar" 
                className="relative w-20 h-20 rounded-full bg-white border-2 border-accent-500 object-cover shadow-xl select-none"
              />

              {/* Avatar upload/change button */}
              <button 
                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                className="absolute -bottom-1 -right-1 bg-indigo-600 text-white p-1.5 rounded-full shadow-md border border-slate-200 hover:bg-indigo-500 transition-colors cursor-pointer"
                title="Change Profile Photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Avatar Picker Dropdown Panel */}
            {showAvatarPicker && (
              <div className="bg-white border border-slate-200 rounded-2xl p-3 absolute top-36 z-20 w-64 shadow-2xl animate-scale-up grid grid-cols-3 gap-2">
                <div className="col-span-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex justify-between items-center">
                  <span>Choose Profile Photo</span>
                  <button onClick={() => setShowAvatarPicker(false)} className="text-slate-400 hover:text-slate-900">✕</button>
                </div>
                {AVATARS.map(av => (
                  <button 
                    key={av.id}
                    onClick={() => handleAvatarSelect(av.url)}
                    className="w-12 h-12 rounded-full border border-slate-200 hover:border-accent-500 overflow-hidden transition-all relative group cursor-pointer"
                    title={av.name}
                  >
                    <img src={av.url} alt={av.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Profile Info */}
            <div className="space-y-1.5 z-10 mt-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">{userDisplayName}</h2>
              <p className="text-slate-500 text-xs font-medium tracking-wide flex items-center justify-center gap-1.5 max-w-full truncate px-4">
                <Mail className="w-3.5 h-3.5 shrink-0 text-slate-400" /> 
                <span className="truncate">{userEmail}</span>
              </p>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center justify-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Member Since: {registrationDate}</span>
              </div>
            </div>

            {/* Profile Tabs selector */}
            <div className="w-full border-t border-slate-200/60 my-5 pt-4 space-y-2">
              <button 
                onClick={() => setCurrentTab('courses')}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-between transition-all cursor-pointer ${
                  currentTab === 'courses' ? 'bg-indigo-600 text-white' : 'bg-white hover:bg-slate-100 text-slate-700'
                }`}
              >
                <span>My Library & Progress</span>
                <BookOpen className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setCurrentTab('settings')}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-between transition-all cursor-pointer ${
                  currentTab === 'settings' ? 'bg-indigo-600 text-white' : 'bg-white hover:bg-slate-100 text-slate-700'
                }`}
              >
                <span>Profile Settings</span>
                <Settings className="w-4 h-4" />
              </button>
            </div>

            {/* Redesigned Quick Logout Option directly inside the Profile card */}
            <button
              onClick={onLogout}
              className="w-full bg-white hover:bg-red-950/30 border border-slate-200 hover:border-red-900/50 text-slate-500 hover:text-red-600 font-bold text-xs uppercase tracking-wider py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-md group mt-1"
              id="profile-logout-btn"
            >
              <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              <span>Log Out Account</span>
            </button>
          </div>

          {/* Professional Tip Card */}
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-slate-200/80 rounded-2xl p-5 shadow-xl relative overflow-hidden" id="professional-tip-card">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-600/5 rounded-full blur-2xl"></div>
            <div className="flex gap-3">
              <div className="bg-indigo-600/10 text-indigo-600 border border-accent-500/20 p-2 h-9 w-9 rounded-xl flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-slate-900 text-xs font-bold uppercase tracking-wider">Professional Tip</h4>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Join our Support Chat below to receive fast assistance, premium custom source code configurations, or custom implementation guides!
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Account Stats & Dynamic Tabs */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="profile-stats-cards">
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-lg flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest block mb-1">Enrolled Courses</span>
                <span className="text-slate-900 font-black text-2xl tracking-tight flex items-baseline gap-1">
                  {purchasedCourses.length}
                  {pendingCourses.length > 0 && (
                    <span className="text-sm font-black text-amber-600"> (+{pendingCourses.length} pending)</span>
                  )}
                  <span className="text-xs font-semibold text-slate-400 lowercase"> active assets</span>
                </span>
              </div>
              <div className="bg-indigo-600/10 text-indigo-600 border border-accent-500/20 p-2.5 rounded-xl">
                <BookOpenCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-lg flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest block mb-1">Completed Courses</span>
                <span className="text-slate-900 font-black text-2xl tracking-tight flex items-baseline gap-1">
                  {completedCount}
                  <span className="text-xs font-semibold text-slate-400 lowercase"> verified certs</span>
                </span>
              </div>
              <div className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 p-2.5 rounded-xl">
                <Award className="w-5 h-5" />
              </div>
            </div>
          </div>

          {currentTab === 'courses' ? (
            /* Tab Content 1: Course Library and interactive Progress sliders */
            <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-6 shadow-xl space-y-6" id="purchased-history-section">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
                <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2.5">
                  <BookOpen className="text-indigo-600 w-5 h-5"/> My Course Library
                </h3>
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider bg-indigo-600/10 px-2.5 py-1 rounded-full border border-accent-500/10">
                  Lifetime Access Granted
                </span>
              </div>

              {purchasedCourses.length > 0 || pendingCourses.length > 0 ? (
                <div className="space-y-6" id="profile-purchased-courses-list">
                  
                  {/* Pending Verification / Approval Courses */}
                  {pendingCourses.map(course => {
                    return (
                      <div 
                        key={`pending-${course.id}`} 
                        className="bg-amber-500/5 p-4 rounded-2xl border border-amber-200/50 hover:border-amber-300/50 transition-all duration-300 space-y-4 group relative"
                        id={`pending-course-card-${course.id}`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="relative shrink-0">
                              <img 
                                referrerPolicy="no-referrer"
                                src={course.thumbnail} 
                                alt={course.title} 
                                className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover shadow-md border border-amber-200/50" 
                              />
                              <span className="absolute -top-1.5 -left-1.5 bg-amber-500 text-slate-900 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md shadow-md border border-amber-200/50">
                                Pending
                              </span>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] font-extrabold text-amber-600 uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md inline-block mb-0.5">
                                {course.category || "ACADEMY"}
                              </span>
                              <h4 className="text-slate-900 font-bold text-sm sm:text-base">
                                {course.title}
                              </h4>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-xl border border-amber-200/50 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 animate-spin text-amber-600" /> Pending Admin Verification
                            </span>
                          </div>
                        </div>

                        {/* Status detail banner */}
                        <div className="bg-amber-50/50 border border-amber-200/40 p-3 rounded-xl text-[10px] font-medium text-amber-800 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                          <span>We are verifying your reference UTR. Once approved by the admin, this course will be fully unlocked.</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Purchased Unlocked Courses */}
                  {purchasedCourses.map(course => {
                    const progress = courseProgress[course.id] || 0;
                    const isCompleted = progress === 100;

                    return (
                      <div 
                        key={course.id} 
                        className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-slate-300/80 transition-all duration-300 space-y-4 group"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="relative shrink-0">
                              <img 
                                referrerPolicy="no-referrer"
                                src={course.thumbnail} 
                                alt={course.title} 
                                className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover shadow-md border border-slate-200 group-hover:scale-105 transition-transform duration-300" 
                              />
                              <span className="absolute -top-1.5 -left-1.5 bg-emerald-500 text-white text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md shadow-md border border-slate-200">
                                Unlocked
                              </span>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] font-extrabold text-indigo-600 uppercase tracking-widest bg-indigo-600/10 border border-accent-500/20 px-2 py-0.5 rounded-md inline-block mb-0.5">
                                {course.category}
                              </span>
                              <h4 className="text-slate-900 font-bold text-sm sm:text-base group-hover:text-accent-300 transition-colors">
                                {course.title}
                              </h4>
                            </div>
                          </div>

                          {/* Quick Access/Launch or Certificate Download buttons */}
                          <div className="flex flex-wrap gap-2">
                            {isCompleted && (
                              <button
                                onClick={() => setActiveCertificateCourse(course)}
                                className="bg-amber-500 hover:bg-amber-400 text-white font-black text-[10px] uppercase tracking-wider py-2 px-3 rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-md hover:-translate-y-0.5"
                              >
                                <Award className="w-3.5 h-3.5" />
                                <span>Get Certificate</span>
                              </button>
                            )}
                            <button
                              onClick={() => onViewCourse(course)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-extrabold text-[11px] uppercase tracking-wider py-2 px-3.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 hover:-translate-y-0.5"
                            >
                              <span>Study Room</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Interactive Course Progress Selector Slider & Progress Bar */}
                        <div className="bg-white border border-slate-200 p-3 rounded-xl space-y-2">
                          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            <span>Track Learning Progress</span>
                            <span className={isCompleted ? 'text-emerald-600 font-black' : 'text-indigo-600'}>
                              {progress}% {isCompleted ? 'Completed! 🎉' : 'In Progress'}
                            </span>
                          </div>

                          {/* Modern slider input to set the course completion progress */}
                          <div className="flex items-center gap-3">
                            <input 
                              type="range"
                              min="0"
                              max="100"
                              step="5"
                              value={progress}
                              onChange={(e) => updateProgress(course.id, parseInt(e.target.value))}
                              className="flex-1 accent-accent-500 h-1 bg-white rounded-lg cursor-pointer"
                              title="Slide to update progress manually"
                            />
                            <span className="text-[10px] font-mono text-slate-400 w-8 text-right">
                              {progress}%
                            </span>
                          </div>

                          {/* Aesthetic styled custom Progress Bar visualizer */}
                          <div className="w-full bg-white rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                isCompleted ? 'bg-emerald-500' : 'bg-indigo-600'
                              }`}
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-white/40" id="empty-courses-state">
                  <Compass className="w-10 h-10 text-slate-400 mx-auto mb-3 animate-pulse" />
                  <h4 className="text-slate-900 text-sm font-bold">Your Academy library is empty</h4>
                  <p className="text-slate-400 text-xs mt-1 mb-4 max-w-xs mx-auto">
                    Browse our India's Premier Learning Hub storefront to unlock premium courses with lifetime verification.
                  </p>
                  <button
                    onClick={onBack}
                    className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-200 font-bold text-xs uppercase tracking-wider py-2 px-4 rounded-xl transition-colors cursor-pointer"
                  >
                    Explore Showcase
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Tab Content 2: Settings customization block inside User Profile */
            <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-6 shadow-xl space-y-6" id="profile-settings-section">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
                <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2.5">
                  <Palette className="text-indigo-600 w-5 h-5"/> Profile Preferences
                </h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  Theme Customization
                </span>
              </div>

              {/* Color Theme switch control */}
              <div className="bg-white p-5 border border-slate-200 rounded-2xl space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-indigo-600" /> Color Accent Switch
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Personalize your entire The New Tips Learning Platform interface with our premium system-wide visual color palettes.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  {THEMES.map((t) => {
                    const isSelected = activeTheme === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => onThemeChange(t.id)}
                        className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                          isSelected 
                            ? 'bg-slate-100 border-accent-500 text-slate-900 shadow-md' 
                            : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300'
                        }`}
                      >
                        <span className={`w-3 h-3 rounded-full ${t.colorClass} block`}></span>
                        <span>{t.name}</span>
                        {isSelected && <span className="text-indigo-600 ml-1">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white/40 border border-slate-200/80 rounded-2xl p-4 text-xs text-slate-400 flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>All profile changes are persisted securely to your local student device node configurations.</span>
              </div>
            </div>
          )}

          {/* Interactive Help & Customer Support Section */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-6 shadow-xl" id="support-interactives-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-slate-900 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-600" /> Technical Support Center
                </h4>
                <p className="text-slate-500 text-xs leading-relaxed max-w-lg">
                  Experiencing code deployment difficulties, system configuration failures, or payment discrepancies? Chat live with the administrator immediately.
                </p>
              </div>
              <button 
                onClick={() => setShowChat(!showChat)}
                className={`sm:shrink-0 font-bold text-xs uppercase tracking-wider py-3 px-5 rounded-xl transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 shadow-md ${
                  showChat 
                    ? 'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50' 
                    : 'bg-accent-600 hover:bg-indigo-600 text-white'
                }`}
                id="support-toggle-btn"
              >
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span>{showChat ? 'Close Chat' : 'Start Live Chat'}</span>
              </button>
            </div>

            {showChat && (
              <div className="mt-6 border-t border-slate-200/60 pt-6 animate-scale-up" id="profile-chat-wrapper">
                <ChatSupport 
                  studentEmail={userEmail} 
                  studentName={userDisplayName} 
                  onCloseChat={() => setShowChat(false)}
                />
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Magnificent golden verification Certificate Modal */}
      {activeCertificateCourse && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-amber-500/30 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl relative animate-scale-up">
            
            {/* Close button */}
            <button 
              onClick={() => setActiveCertificateCourse(null)}
              className="absolute top-4 right-4 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-900 p-2 rounded-full border border-slate-200 cursor-pointer"
              title="Close Certificate View"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Certificate Print-Ready Outer container */}
            <div className="p-8 border-8 border-double border-amber-500/20 m-3 rounded-2xl relative bg-radial from-zinc-900 to-zinc-950 text-center space-y-6">
              
              {/* Premium Background Seals and Design Accents */}
              <div className="absolute top-4 left-4 text-[10px] font-mono text-slate-400 font-black">THE NEW TIPS ACADEMY</div>
              <div className="absolute bottom-4 right-4 text-[10px] font-mono text-slate-400 font-black">VERIFICATION CODE: TNT-{activeCertificateCourse.id.slice(0,6).toUpperCase()}</div>

              {/* Gold Header elements */}
              <div className="space-y-1.5 pt-4">
                <div className="w-12 h-12 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-amber-500/5">
                  <Award className="w-6 h-6" />
                </div>
                <h2 className="text-amber-600 font-display text-sm font-black tracking-widest uppercase">
                  Certificate of Achievement
                </h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">THIS IS PROUDLY PRESENTED TO</p>
              </div>

              {/* Student Name */}
              <div className="py-2">
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-display border-b border-amber-500/30 inline-block px-8 pb-1.5 leading-none">
                  {userDisplayName}
                </h3>
              </div>

              {/* Course Title Information */}
              <div className="space-y-2 max-w-md mx-auto">
                <p className="text-slate-500 text-xs leading-relaxed font-semibold">
                  for successfully mastering all specialized modules, projects, and custom code integrations inside the course:
                </p>
                <h4 className="text-slate-900 text-base sm:text-lg font-bold font-display tracking-tight text-indigo-600">
                  {activeCertificateCourse.title}
                </h4>
              </div>

              {/* Instructor Signatures & Gold Seal */}
              <div className="grid grid-cols-3 gap-4 pt-6 items-end">
                <div className="text-center space-y-1">
                  <div className="text-xs font-mono text-slate-500 italic font-medium">Ashutosh Sir</div>
                  <div className="border-t border-slate-200/80 pt-1 text-[8px] font-bold text-slate-400 uppercase tracking-widest">Platform Creator</div>
                </div>

                <div className="flex justify-center">
                  {/* Glowing custom Gold Seal */}
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-500 border border-amber-300 flex items-center justify-center shadow-lg relative">
                    <div className="absolute inset-1 rounded-full border border-dashed border-black/40"></div>
                    <Sparkles className="w-5 h-5 text-white fill-current" />
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <div className="text-[10px] font-mono text-slate-500">July 2026</div>
                  <div className="border-t border-slate-200/80 pt-1 text-[8px] font-bold text-slate-400 uppercase tracking-widest">Date Issued</div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-6 flex justify-center gap-2.5 z-10 relative">
                <button
                  onClick={() => {
                    alert(`Certificate TNT-${activeCertificateCourse.id.slice(0,6).toUpperCase()} PDF download initiated!`);
                  }}
                  className="bg-amber-500 hover:bg-amber-400 text-white font-black text-xs uppercase tracking-wider py-2.5 px-5 rounded-xl cursor-pointer shadow-md flex items-center gap-1.5 transition-all hover:-translate-y-0.5"
                >
                  <Download className="w-4 h-4 text-white" /> Download PDF
                </button>
                <button
                  onClick={() => setActiveCertificateCourse(null)}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl cursor-pointer transition-colors"
                >
                  Close View
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
