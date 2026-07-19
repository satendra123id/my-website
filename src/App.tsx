import React, { useState, useEffect } from 'react';
import DailyCourseNotifier from './components/DailyCourseNotifier';
import Login from './components/Login';
import Navbar from './components/Navbar';
import CourseList from './components/CourseList';
import CourseViewer from './components/CourseViewer';
import AdminPortal from './components/AdminPortal';
import PaymentModal from './components/PaymentModal';
import StudentProfile from './components/StudentProfile';
import ChatSupport from './components/ChatSupport';
import HomeView from './components/HomeView';
import { MessageSquare, Home, BookOpen, Heart, User, ShoppingCart, CreditCard, Share2 } from 'lucide-react';

import { Course, Transaction, GatewaySettings, AppUser } from './types';
import { translations, Language } from './translations';
import { DEFAULT_SETTINGS } from './lib/seedData';
// ... (rest of imports)
import { 
  initializeDatabase, 
  getAllCourses, 
  getAllTransactions, 
  getGatewaySettings, 
  updateGatewaySettings, 
  addCourse, 
  updateCourse, 
  deleteCourse, 
  addTransaction, 
  updateTransactionStatus,
  deleteTransaction,
  logPageView
} from './lib/dbService';
import { auth, db, collection, doc, onSnapshot, query, where, getDoc, setDoc } from './lib/firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';

export default function App() {
  // Authentication states
  const [user, setUser] = useState<{ email: string; displayName: string; isAdmin: boolean } | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Core Data State
  const [courses, setCourses] = useState<Course[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [gatewaySettings, setGatewaySettings] = useState<GatewaySettings>(DEFAULT_SETTINGS);
  const [dataLoading, setDataLoading] = useState(true);
  const [views, setViews] = useState<any[]>([]);
  const [appUsers, setAppUsers] = useState<any[]>([]);

  // Navigation / Modal States
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [activeViewingCourse, setActiveViewingCourse] = useState<Course | null>(null);
  const [activeBuyingCourse, setActiveBuyingCourse] = useState<Course | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('tnt_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const [cart, setCart] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('tnt_cart');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [showCartModal, setShowCartModal] = useState(false);
  const [activeBuyingCourses, setActiveBuyingCourses] = useState<Course[] | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'courses'>('home');
  const [accentTheme, setAccentTheme] = useState<string>(() => {
    return localStorage.getItem('premium-accent-theme') || 'amber';
  });
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('premium-language') as Language) || 'en';
  });

  const [initialDeepLinkHandled, setInitialDeepLinkHandled] = useState(false);
  const [redirectVerificationState, setRedirectVerificationState] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [redirectErrorMessage, setRedirectErrorMessage] = useState('');

  // Handle Razorpay Redirect verification on page load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const razorpayPaymentId = params.get('razorpay_payment_id');
    const razorpayOrderId = params.get('razorpay_order_id');
    const razorpaySignature = params.get('razorpay_signature');

    if (razorpayPaymentId && razorpayOrderId && razorpaySignature) {
      const verifyRedirectPayment = async () => {
        setRedirectVerificationState('verifying');
        try {
          // Get student email from localStorage or auth
          const savedUser = localStorage.getItem('tnt_user');
          let email = '';
          if (savedUser) {
            const parsed = JSON.parse(savedUser);
            email = parsed.email;
          }
          
          if (!email) {
            // Wait up to 1.5 seconds for auth to load
            for (let i = 0; i < 15; i++) {
              await new Promise(resolve => setTimeout(resolve, 100));
              const freshUser = localStorage.getItem('tnt_user');
              if (freshUser) {
                email = JSON.parse(freshUser).email;
                break;
              }
            }
          }

          if (!email) {
            throw new Error('Please login to verify and unlock your purchased course.');
          }

          const response = await fetch('/api/checkout/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_payment_id: razorpayPaymentId,
              razorpay_order_id: razorpayOrderId,
              razorpay_signature: razorpaySignature,
              studentEmail: email
            })
          });

          const data = await response.json();
          if (data.success) {
            setRedirectVerificationState('success');
            
            // Clean up query params from URL
            const newUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);

            // Reload profile and transactions after a short delay
            setTimeout(() => {
              setRedirectVerificationState('idle');
              window.location.reload();
            }, 2500);
          } else {
            throw new Error(data.error || 'Payment verification failed.');
          }
        } catch (err: any) {
          console.error('Redirect verification error:', err);
          setRedirectVerificationState('error');
          setRedirectErrorMessage(err.message || 'Error verifying payment.');
        }
      };

      verifyRedirectPayment();
    }
  }, []);

  useEffect(() => {
    if (!initialDeepLinkHandled && courses.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const courseId = params.get('courseId') || params.get('course');
      if (courseId) {
        const targetCourse = courses.find(c => c.id === courseId);
        if (targetCourse) {
          setActiveViewingCourse(targetCourse);
        }
      }
      setInitialDeepLinkHandled(true);
    }
  }, [courses, initialDeepLinkHandled]);

  useEffect(() => {
    localStorage.setItem('premium-language', language);
  }, [language]);

  const t = translations[language];

  useEffect(() => {
    localStorage.setItem('tnt_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    localStorage.setItem('tnt_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', accentTheme);
    localStorage.setItem('premium-accent-theme', accentTheme);
  }, [accentTheme]);

  // ... (rest of useEffect initialization)
  useEffect(() => {
    // Try to load user from localStorage on initial render
    const savedUser = localStorage.getItem('tnt_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setIsAdminMode(parsedUser.isAdmin || false);
      } catch (e) {
        console.error('Failed to parse saved user:', e);
      }
    }

    // Load cached courses from localStorage to render immediately
    const savedCourses = localStorage.getItem('tnt_courses');
    if (savedCourses) {
      try {
        const parsedCourses = JSON.parse(savedCourses);
        if (Array.isArray(parsedCourses) && parsedCourses.length > 0) {
          setCourses(parsedCourses);
          setDataLoading(false);
        }
      } catch (e) {
        console.error('Failed to parse cached courses:', e);
      }
    }

    // Load cached settings from localStorage to render immediately
    const savedSettings = localStorage.getItem('tnt_settings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        if (parsedSettings) {
          setGatewaySettings(parsedSettings);
        }
      } catch (e) {
        console.error('Failed to parse cached settings:', e);
      }
    }

    // Safety timeout to guarantee the website shows immediately (max 1.5s delay)
    const safetyTimeout = setTimeout(() => {
      setAuthLoading(false);
      setDataLoading(false);
    }, 1500);

    const initData = async () => {
      try {
        const fetched = await getAllCourses();
        if (fetched && fetched.length > 0) {
          setCourses(fetched);
          localStorage.setItem('tnt_courses', JSON.stringify(fetched));
        }
      } catch (e) {
        console.error('Error fetching initial courses:', e);
      } finally {
        setDataLoading(false);
      }
    };

    const initSettings = async () => {
      // Load initial gateway settings
      try {
        const dbSettings = await getGatewaySettings();
        setGatewaySettings(dbSettings);
        localStorage.setItem('tnt_settings', JSON.stringify(dbSettings));
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };

    initData();
    initSettings();

    // 1. Real-time Subscription to Courses
    let unsubscribeCourses = () => {};
    try {
      unsubscribeCourses = onSnapshot(collection(db, 'courses'), (snapshot) => {
        const fetchedCourses: Course[] = [];
        snapshot.forEach((doc) => {
          fetchedCourses.push(doc.data() as Course);
        });
        const sorted = fetchedCourses.sort((a, b) => b.createdAt - a.createdAt);
        setCourses(sorted);
        localStorage.setItem('tnt_courses', JSON.stringify(sorted));
        setDataLoading(false);
      }, (error) => {
        console.warn('Courses real-time subscription error (falling back to cached API):', error);
      });
    } catch (err) {
      console.warn('Failed to start courses subscription:', err);
    }

    // 1.5 Real-time Subscription to Settings
    let unsubscribeSettings = () => {};
    try {
      unsubscribeSettings = onSnapshot(doc(db, 'settings', 'gateway'), (doc) => {
        if (doc.exists()) {
          const settingsData = doc.data() as GatewaySettings;
          setGatewaySettings(settingsData);
          localStorage.setItem('tnt_settings', JSON.stringify(settingsData));
        }
      }, (error) => {
        console.warn('Settings real-time subscription error:', error);
      });
    } catch (err) {
      console.warn('Failed to start settings subscription:', err);
    }

    // 4. Monitor Firebase Auth State changes (for Google Login)
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const email = firebaseUser.email || '';
        const name = firebaseUser.displayName || email.split('@')[0];
        
        const isUserAdmin = 
          email.toLowerCase() === 'sitaramlodhi836@gmail.com' ||
          email.toLowerCase().includes('lodhi') || 
          email.toLowerCase().includes('admin') || 
          email.toLowerCase() === 'satendrlodhi711@gmail.com';

        const newUser = {
          email,
          displayName: name,
          isAdmin: isUserAdmin
        };
        setUser(newUser);
        localStorage.setItem('tnt_user', JSON.stringify(newUser));
        setIsAdminMode(isUserAdmin);

        // Seed if admin
        if (isUserAdmin) {
          await initializeDatabase();
        }
      } else {
        // Only clear if we don't have a custom user saved in localStorage
        const savedUserLoc = localStorage.getItem('tnt_user');
        if (!savedUserLoc) {
          setUser(null);
          setIsAdminMode(false);
        }
      }
      setAuthLoading(false);
    });

    return () => {
      clearTimeout(safetyTimeout);
      unsubscribeCourses();
      unsubscribeSettings();
      unsubscribeAuth();
    };
  }, []);

  // Separate Effect for User-dependent subscriptions (Transactions, Views)
  useEffect(() => {
    let unsubscribeTransactions: () => void = () => {};
    let unsubscribeViews: () => void = () => {};
    let unsubscribeUsers: () => void = () => {};
    let unsubscribeCurrentProfile: () => void = () => {};

    // Wait for auth to be fully loaded and user to be present
    if (!authLoading && user) {
      const emailLower = user.email.toLowerCase();
      const profileCacheKey = `tnt_profile_${emailLower}`;
      const txCacheKey = `tnt_transactions_${emailLower}`;
      const viewsCacheKey = `tnt_views_${emailLower}`;
      const appUsersCacheKey = `tnt_app_users_${emailLower}`;

      // Load cached profile
      const savedProfile = localStorage.getItem(profileCacheKey);
      if (savedProfile) {
        try {
          setCurrentUserProfile(JSON.parse(savedProfile));
        } catch (e) {
          console.error('Error parsing profile cache:', e);
        }
      }

      // Load cached transactions
      const savedTx = localStorage.getItem(txCacheKey);
      if (savedTx) {
        try {
          setTransactions(JSON.parse(savedTx));
        } catch (e) {
          console.error('Error parsing transaction cache:', e);
        }
      }

      // Load cached views (admin only)
      if (user.isAdmin) {
        const savedViews = localStorage.getItem(viewsCacheKey);
        if (savedViews) {
          try {
            setViews(JSON.parse(savedViews));
          } catch (e) {
            console.error('Error parsing views cache:', e);
          }
        }

        const savedAppUsers = localStorage.getItem(appUsersCacheKey);
        if (savedAppUsers) {
          try {
            setAppUsers(JSON.parse(savedAppUsers));
          } catch (e) {
            console.error('Error parsing app users cache:', e);
          }
        }
      }

      // 1.5 Real-time Subscription to current user's profile
      const sanitizedId = emailLower.replace(/[^a-zA-Z0-9]/g, '_');
      unsubscribeCurrentProfile = onSnapshot(doc(db, 'app_users', sanitizedId), (doc) => {
        if (doc.exists()) {
          const profileData = doc.data() as AppUser;
          setCurrentUserProfile(profileData);
          localStorage.setItem(profileCacheKey, JSON.stringify(profileData));
        } else {
          // If profile doesn't exist, create a basic one
          const basicProfile: AppUser = {
            id: sanitizedId,
            email: user.email,
            displayName: user.displayName,
            unlockedCourses: [],
            isAdmin: user.isAdmin
          };
          setCurrentUserProfile(basicProfile);
          localStorage.setItem(profileCacheKey, JSON.stringify(basicProfile));
        }
      });

      // 2. Real-time Subscription to Transactions
      // If admin, see all. If student, only see own.
      const qTx = user.isAdmin 
        ? collection(db, 'transactions')
        : query(collection(db, 'transactions'), where('studentEmail', '==', user.email));

      unsubscribeTransactions = onSnapshot(qTx, (snapshot) => {
        const fetchedTx: Transaction[] = [];
        snapshot.forEach((doc) => {
          fetchedTx.push(doc.data() as Transaction);
        });
        const sortedTx = fetchedTx.sort((a, b) => b.timestamp - a.timestamp);
        setTransactions(sortedTx);
        localStorage.setItem(txCacheKey, JSON.stringify(sortedTx));
      }, (error) => {
        console.error('Transactions real-time subscription error:', error);
      });

      // 3. Real-time Subscription to Analytics Views (Admin only)
      if (user.isAdmin) {
        unsubscribeViews = onSnapshot(collection(db, 'analytics_views'), (snapshot) => {
          const fetchedViews: any[] = [];
          snapshot.forEach((doc) => {
            fetchedViews.push({ id: doc.id, ...doc.data() });
          });
          setViews(fetchedViews);
          localStorage.setItem(viewsCacheKey, JSON.stringify(fetchedViews));
        }, (error) => {
          console.error('Analytics views subscription error:', error);
        });

        // 4. Real-time Subscription to app_users (Admin only)
        unsubscribeUsers = onSnapshot(collection(db, 'app_users'), (snapshot) => {
          const fetchedUsers: any[] = [];
          snapshot.forEach((doc) => {
            fetchedUsers.push({ id: doc.id, ...doc.data() });
          });
          setAppUsers(fetchedUsers);
          localStorage.setItem(appUsersCacheKey, JSON.stringify(fetchedUsers));
        }, (error) => {
          console.error('app_users subscription error:', error);
        });
      }
    } else {
      setTransactions([]);
      setViews([]);
      setAppUsers([]);
    }

    return () => {
      unsubscribeTransactions();
      unsubscribeViews();
      unsubscribeUsers();
      unsubscribeCurrentProfile();
    };
  }, [user, authLoading]);

  // Real-time page view logger based on user navigation
  useEffect(() => {
    if (dataLoading) return;
    
    // Log view event
    if (activeViewingCourse) {
      logPageView('course_view', activeViewingCourse.id);
    } else if (showProfile) {
      logPageView('student_profile');
    } else {
      logPageView(activeTab);
    }
  }, [activeTab, activeViewingCourse, showProfile, dataLoading]);

  const refreshAllData = async () => {
    try {
      const dbSettings = await getGatewaySettings();
      setGatewaySettings(dbSettings);
    } catch (error) {
      console.error('Error refreshing database settings:', error);
    }
  };

  const handleLoginSuccess = (email: string, displayName: string, isAdmin: boolean) => {
    const newUser = { email, displayName, isAdmin };
    setUser(newUser);
    localStorage.setItem('tnt_user', JSON.stringify(newUser));
    setIsAdminMode(isAdmin);
    setShowLogin(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    localStorage.removeItem('tnt_user');
    setIsAdminMode(false);
    setActiveViewingCourse(null);
    setActiveBuyingCourse(null);
    setShowProfile(false);
  };

  // Admin Callbacks
  const handleUpdateGatewaySettings = async (newSettings: GatewaySettings) => {
    await updateGatewaySettings(newSettings);
    setGatewaySettings(newSettings);
    await refreshAllData();
  };

  const handleAddCourse = async (course: Course) => {
    await addCourse(course);
    await refreshAllData();
  };

  const handleUpdateCourse = async (id: string, updates: Partial<Course>) => {
    await updateCourse(id, updates);
    await refreshAllData();
  };

  const handleDeleteCourse = async (id: string) => {
    await deleteCourse(id);
    await refreshAllData();
  };

  const handleVerifyTransaction = async (id: string) => {
    await updateTransactionStatus(id, 'SUCCESS');
    await refreshAllData();
  };

  const handleDeleteTransaction = async (id: string) => {
    await deleteTransaction(id);
    await refreshAllData();
  };

  const handleToggleWishlist = (courseId: string) => {
    setWishlist((prev) => {
      if (prev.includes(courseId)) {
        return prev.filter((id) => id !== courseId);
      } else {
        return [...prev, courseId];
      }
    });
  };

  const handleToggleCart = (courseId: string) => {
    setCart((prev) => {
      if (prev.includes(courseId)) {
        return prev.filter((id) => id !== courseId);
      } else {
        return [...prev, courseId];
      }
    });
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleSearchClick = () => {
    setShowProfile(false);
    setActiveViewingCourse(null);
    setActiveBuyingCourses(null);
    setActiveTab('courses');
    setTimeout(() => {
      const searchInput = document.getElementById('course-search-field');
      if (searchInput) {
        searchInput.scrollIntoView({ behavior: 'auto', block: 'center' });
        searchInput.focus();
      }
    }, 50);
  };

  // Student Callbacks
  const handleBuyCourse = (course: Course) => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    setActiveBuyingCourses([course]);
  };

  const handlePaymentSuccess = async (refUtrId: string, method: 'UPI' | 'Razorpay', isPending: boolean) => {
    if (!activeBuyingCourses || activeBuyingCourses.length === 0 || !user) return;

    // Create individual transactions for all purchased courses in bulk for both UPI and Razorpay
    for (const courseItem of activeBuyingCourses) {
      const newTx: Transaction = {
        id: 'tx_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        studentEmail: user.email.toLowerCase().trim(),
        studentName: user.displayName || user.email.split('@')[0],
        courseId: courseItem.id,
        courseTitle: courseItem.title,
        amount: courseItem.price,
        method,
        refUtrId,
        status: isPending ? 'PENDING' : 'SUCCESS',
        timestamp: Date.now()
      };
      await addTransaction(newTx);
    }

    // Immediately update local profile state for instant UI unlock response
    if (!isPending) {
      setCurrentUserProfile(prev => {
        if (!prev) {
          return {
            id: user.email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_'),
            email: user.email.toLowerCase().trim(),
            displayName: user.displayName,
            unlockedCourses: activeBuyingCourses.map(c => c.id),
            isAdmin: user.isAdmin
          };
        }
        const currentUnlocked = prev.unlockedCourses || [];
        const newUnlocked = [...currentUnlocked];
        for (const courseItem of activeBuyingCourses) {
          if (!newUnlocked.includes(courseItem.id)) {
            newUnlocked.push(courseItem.id);
          }
        }
        return {
          ...prev,
          unlockedCourses: newUnlocked
        };
      });

      // Update Firestore app_users collection as well on client side
      try {
        const sanitizedId = user.email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
        const userDocRef = doc(db, 'app_users', sanitizedId);
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.exists() ? userDoc.data() : {};
        const currentUnlocked = userData.unlockedCourses || [];
        const newUnlocked = [...currentUnlocked];
        for (const courseItem of activeBuyingCourses) {
          if (!newUnlocked.includes(courseItem.id)) {
            newUnlocked.push(courseItem.id);
          }
        }
        await setDoc(userDocRef, { ...userData, unlockedCourses: newUnlocked });
      } catch (err) {
        console.warn("Firestore profile update error on client side:", err);
      }
    }
    
    // Refresh Firestore data
    await refreshAllData();

    // Clear checked-out items from the cart
    const boughtIds = activeBuyingCourses.map(c => c.id);
    setCart(prev => prev.filter(id => !boughtIds.includes(id)));

    // If instantly successful, let student view the first unlocked course
    if (!isPending) {
      const firstCourse = activeBuyingCourses[0];
      setActiveBuyingCourses(null);
      setActiveViewingCourse(firstCourse);
    } else {
      setActiveBuyingCourses(null);
    }
  };

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center items-center px-4" id="app-loading-screen">
        <div className="max-w-md w-full bg-slate-800/80 backdrop-blur-md border border-slate-700/60 rounded-3xl p-8 text-center shadow-2xl space-y-6">
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 w-full h-full border-4 border-indigo-500/20 rounded-full"></div>
            <div className="absolute inset-0 w-full h-full border-4 border-t-indigo-500 rounded-full animate-spin"></div>
            <span className="text-3xl animate-pulse">🎓</span>
          </div>
          
          <div className="space-y-3">
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">
              Welcome to the New Tips Courses
            </h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
              New Tips Courses में आपका स्वागत है
            </p>
          </div>

          <div className="py-3 px-5 bg-indigo-950/50 border border-indigo-900/40 rounded-2xl">
            <span className="text-xs font-black text-amber-400 uppercase tracking-widest block">
              Buy Lowest Price Courses 💸
            </span>
            <span className="text-[10px] font-bold text-slate-300 block mt-1 leading-relaxed">
              सबसे कम कीमत में प्रीमियम कोर्सेस खरीदें
            </span>
          </div>

          <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></div>
            <span>Securing Cloud Connection...</span>
          </div>
        </div>
      </div>
    );
  }

  // Show full login screen if showLogin is true
  if (showLogin) {
    return (
      <Login 
        onLoginSuccess={handleLoginSuccess} 
        onBackToCourses={() => setShowLogin(false)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col pb-24" id="app-container">
      <DailyCourseNotifier />
      {/* Persistent top navbar */}
      <Navbar
        userEmail={user ? user.email : ''}
        userDisplayName={user ? user.displayName : ''}
        isAdmin={user ? user.isAdmin : false}
        isAdminMode={isAdminMode}
        onChangeMode={setIsAdminMode}
        onLogout={handleLogout}
        onProfileClick={() => {
          if (!user) {
            setShowLogin(true);
            return;
          }
          setShowProfile(true);
          setActiveViewingCourse(null);
          setActiveBuyingCourses(null);
        }}
        activeTheme={accentTheme}
        onThemeChange={setAccentTheme}
        language={language}
        onLanguageChange={setLanguage}
        cartCount={cart.length}
        onCartClick={() => setShowCartModal(true)}
        onSearchClick={handleSearchClick}
      />

      {/* Main Body Grid content based on current view/tab selection */}
      <main className="flex-1" id="main-content-layout">
        {showProfile && user ? (
          <StudentProfile
            userEmail={user.email}
            userDisplayName={user.displayName}
            transactions={transactions}
            courses={courses.filter(c => c.status !== 'draft')}
            onBack={() => setShowProfile(false)}
            onLogout={handleLogout}
            onViewCourse={(course) => {
              setActiveViewingCourse(course);
              setShowProfile(false);
            }}
            activeTheme={accentTheme}
            onThemeChange={setAccentTheme}
            unlockedCourseIds={currentUserProfile?.unlockedCourses}
          />
        ) : isAdminMode ? (
          <AdminPortal
            courses={courses}
            transactions={transactions}
            views={views}
            appUsers={appUsers}
            user={user}
            settings={gatewaySettings}
            adminDisplayName={user?.displayName || user?.email || 'Admin'}
            onUpdateSettings={handleUpdateGatewaySettings}
            onAddCourse={handleAddCourse}
            onUpdateCourse={handleUpdateCourse}
            onDeleteCourse={handleDeleteCourse}
            onVerifyTransaction={handleVerifyTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            language={language}
          />
        ) : activeViewingCourse && user ? (
          <CourseViewer
            course={activeViewingCourse}
            onBack={() => setActiveViewingCourse(null)}
            userEmail={user.email}
            userName={user.displayName}
            language={language}
          />
        ) : activeTab === 'home' ? (
          <HomeView
            courses={courses.filter(c => c.status !== 'draft')}
            transactions={transactions}
            userEmail={user ? user.email : ''}
            language={language}
            onExploreCourses={() => {
              setActiveTab('courses');
              window.scrollTo(0, 0);
            }}
            onBuyCourse={handleBuyCourse}
            onViewCourse={(course) => {
              if (!user) {
                setShowLogin(true);
                return;
              }
              setActiveViewingCourse(course);
            }}
            cart={cart}
            onToggleCart={handleToggleCart}
            unlockedCourseIds={currentUserProfile?.unlockedCourses}
          />
        ) : (
          <CourseList
            courses={courses.filter(c => c.status !== 'draft')}
            transactions={transactions}
            userEmail={user ? user.email : ''}
            language={language}
            onBuyCourse={handleBuyCourse}
            onViewCourse={(course) => {
              if (!user) {
                setShowLogin(true);
                return;
              }
              setActiveViewingCourse(course);
            }}
            wishlist={wishlist}
            onToggleWishlist={handleToggleWishlist}
            cart={cart}
            onToggleCart={handleToggleCart}
            unlockedCourseIds={currentUserProfile?.unlockedCourses}
          />
        )}
      </main>

      {/* Razorpay Purchase Secure Modal */}
      {activeBuyingCourses && user && (
        <PaymentModal
          courses={activeBuyingCourses}
          settings={gatewaySettings}
          studentEmail={user.email}
          studentName={user.displayName}
          onClose={() => setActiveBuyingCourses(null)}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* Wishlist Pop-up Drawer Modal */}
      {showWishlistModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in" id="wishlist-modal-backdrop">
          <div className="bg-slate-50 border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative animate-scale-up" id="wishlist-modal-container">
            <button 
              onClick={() => setShowWishlistModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 bg-white p-2 rounded-full border border-slate-200 cursor-pointer transition-colors"
              title="Close Wishlist"
            >
              ✕
            </button>

            <div className="border-b border-slate-200/60 pb-3 mb-4">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500 fill-red-500 animate-pulse" />
                {t.mySavedWishlist}
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                {t.keepTrackOfCourses}
              </p>
            </div>

            {wishlist.length > 0 ? (
              <div className="space-y-3.5 max-h-[320px] overflow-y-auto pr-1" id="wishlist-items-scroll">
                {courses
                  .filter((c) => wishlist.includes(c.id))
                  .map((course) => {
                    const hasUserPurchased = transactions.some(
                      (tx) => tx.courseId === course.id && tx.studentEmail === user?.email && tx.status === 'SUCCESS'
                    );

                    return (
                      <div key={course.id} className="bg-white p-3.5 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-4 group">
                        <div className="flex items-center gap-3 truncate">
                          <img 
                            referrerPolicy="no-referrer"
                            src={course.thumbnail} 
                            alt={course.title} 
                            className="w-12 h-12 rounded-xl object-cover border border-zinc-850 shrink-0" 
                          />
                          <div className="truncate space-y-0.5">
                            <span className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-600/10 px-2 py-0.5 rounded-md border border-accent-500/10">
                              {course.category}
                            </span>
                            <h4 className="text-slate-900 font-bold text-xs truncate max-w-[140px] sm:max-w-[180px]">
                              {course.title}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {hasUserPurchased ? (
                            <button
                              onClick={() => {
                                setActiveViewingCourse(course);
                                setShowWishlistModal(false);
                                setShowProfile(false);
                              }}
                              className="bg-emerald-500 text-white font-black text-[10px] uppercase tracking-wider py-1.5 px-3 rounded-lg hover:bg-emerald-400 cursor-pointer"
                            >
                              {t.study}
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                handleBuyCourse(course);
                                setShowWishlistModal(false);
                              }}
                              className="bg-indigo-600 text-white font-black text-[10px] uppercase tracking-wider py-1.5 px-3 rounded-lg hover:bg-indigo-500 cursor-pointer"
                            >
                              {t.buyNow}
                            </button>
                          )}

                          <button
                            onClick={() => {
                              if (navigator.share) {
                                navigator.share({
                                  title: course.title,
                                  url: window.location.origin + '/?courseId=' + course.id
                                }).catch(console.error);
                              } else {
                                navigator.clipboard.writeText(window.location.origin + '/?courseId=' + course.id);
                                alert('Link copied to clipboard');
                              }
                            }}
                            className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                            title="Share course"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleWishlist(course.id)}
                            className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                            title="Remove item"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400 text-xs font-semibold bg-white/40 rounded-2xl border border-dashed border-slate-200">
                <Heart className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                {t.wishlistEmpty}
                <p className="text-[10px] text-slate-400 font-medium mt-1">
                  {t.clickHeartIcon}
                </p>
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-slate-200/60 flex justify-end">
              <button
                onClick={() => setShowWishlistModal(false)}
                className="bg-white hover:bg-zinc-850 text-slate-700 border border-slate-200 font-bold text-xs uppercase tracking-wider py-2 px-4 rounded-xl cursor-pointer"
              >
                {t.closeWishlist}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Pop-up Drawer Modal */}
      {showCartModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in" id="cart-modal-backdrop">
          <div className="bg-slate-50 border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative animate-scale-up" id="cart-modal-container">
            <button 
              onClick={() => setShowCartModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 bg-white p-2 rounded-full border border-slate-200 cursor-pointer transition-colors"
              title="Close Cart"
            >
              ✕
            </button>

            <div className="border-b border-slate-200/60 pb-3 mb-4">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-indigo-600 fill-accent-500/10" />
                {t.myShoppingCart}
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                {t.buySelectedCourses}
              </p>
            </div>

            {cart.length > 0 ? (
              <>
                <div className="space-y-3.5 max-h-[280px] overflow-y-auto pr-1 mb-4" id="cart-items-scroll">
                  {courses
                    .filter((c) => cart.includes(c.id))
                    .map((course) => {
                      return (
                        <div key={course.id} className="bg-white p-3.5 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-4 group">
                          <div className="flex items-center gap-3 truncate">
                            <img 
                              referrerPolicy="no-referrer"
                              src={course.thumbnail} 
                              alt={course.title} 
                              className="w-12 h-12 rounded-xl object-cover border border-zinc-850 shrink-0" 
                            />
                            <div className="truncate space-y-0.5">
                              <span className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-600/10 px-2 py-0.5 rounded-md border border-accent-500/10">
                                {course.category}
                              </span>
                              <h4 className="text-slate-900 font-bold text-xs truncate max-w-[140px] sm:max-w-[180px]">
                                {course.title}
                              </h4>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs font-black text-slate-900 font-mono">
                              ₹{course.price}
                            </span>
                            <button
                              onClick={() => handleToggleCart(course.id)}
                              className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                              title="Remove item"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Total Cart Calculations */}
                <div className="bg-white/60 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between mb-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{t.totalPrice}</span>
                    <span className="text-[10px] text-slate-400 font-medium font-sans">For {cart.length} Premium Course{cart.length > 1 ? 's' : ''}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-slate-900 font-mono block">
                      ₹{courses.filter(c => cart.includes(c.id)).reduce((acc, c) => acc + c.price, 0)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-3">
                  <button
                    onClick={handleClearCart}
                    className="bg-white hover:bg-zinc-850 text-red-400 border border-slate-200 font-extrabold text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-xl cursor-pointer"
                  >
                    {t.clearCart}
                  </button>

                  <button
                    onClick={() => {
                      if (!user) {
                        setShowCartModal(false);
                        setShowLogin(true);
                        return;
                      }
                      const coursesInCart = courses.filter((c) => cart.includes(c.id));
                      setActiveBuyingCourses(coursesInCart);
                      setShowCartModal(false);
                    }}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[11px] uppercase tracking-wider py-2.5 px-4 rounded-xl cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-lg shadow-accent-500/10"
                  >
                    <CreditCard className="w-4 h-4" />
                    {t.buyAll}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center py-10 text-slate-400 text-xs font-semibold bg-white/40 rounded-2xl border border-dashed border-slate-200">
                  <ShoppingCart className="w-8 h-8 text-zinc-700 mx-auto mb-2 animate-bounce" />
                  {t.cartEmpty}
                  <p className="text-[10px] text-slate-400 font-medium mt-1">
                    {t.addMultipleCourses}
                  </p>
                </div>
                
                <div className="mt-5 pt-4 border-t border-slate-200/60 flex justify-end">
                  <button
                    onClick={() => setShowCartModal(false)}
                    className="bg-white hover:bg-zinc-850 text-slate-700 border border-slate-200 font-bold text-xs uppercase tracking-wider py-2 px-4 rounded-xl cursor-pointer"
                  >
                    {t.closeCart}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Persistent Bottom Navigation Bar - Hidden in Admin Mode */}
      {!isAdminMode && (
      <div className="fixed bottom-3 inset-x-0 bg-white/90 border border-slate-200 backdrop-blur-md z-40 py-2.5 px-6 sm:px-10 flex justify-around items-center shadow-2xl max-w-sm sm:max-w-md mx-auto rounded-2xl" id="bottom-navigation-deck">
        <button 
          onClick={() => {
            setShowProfile(false);
            setActiveViewingCourse(null);
            setShowWishlistModal(false);
            setActiveTab('home');
            window.scrollTo(0, 0);
          }}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
            !showProfile && !activeViewingCourse && !showWishlistModal && activeTab === 'home' ? 'text-indigo-600 font-black scale-105' : 'text-slate-400 hover:text-slate-900'
          }`}
          title="Home 🏠"
        >
          <Home className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">{t.home}</span>
        </button>
 
        <button 
          onClick={() => {
            setShowProfile(false);
            setActiveViewingCourse(null);
            setShowWishlistModal(false);
            setActiveTab('courses');
          }}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
            !showProfile && !activeViewingCourse && !showWishlistModal && activeTab === 'courses' ? 'text-indigo-600 font-black scale-105' : 'text-slate-400 hover:text-slate-900'
          }`}
          title="Courses 📚"
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">{t.courses}</span>
        </button>

        <button 
          onClick={() => {
            setShowWishlistModal(true);
          }}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors relative ${
            showWishlistModal ? 'text-indigo-600 font-black scale-105' : 'text-slate-400 hover:text-slate-900'
          }`}
          title="Wishlist ❤️"
        >
          <Heart className="w-5 h-5" />
          {wishlist.length > 0 && (
            <span className="absolute -top-1 -right-1.5 bg-red-500 text-slate-900 text-[8px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-zinc-950 animate-bounce">
              {wishlist.length}
            </span>
          )}
          <span className="text-[9px] font-bold uppercase tracking-wider">{t.wishlist}</span>
        </button>

        <button 
          onClick={() => {
            if (!user) {
              setShowLogin(true);
              return;
            }
            setShowProfile(true);
            setActiveViewingCourse(null);
            setShowWishlistModal(false);
          }}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
            showProfile ? 'text-indigo-600 font-black scale-105' : 'text-slate-400 hover:text-slate-900'
          }`}
          title="Profile 👤"
        >
          <User className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">{t.profile}</span>
        </button>
      </div>
      )}

      {/* Floating Chat Support Widget for Student view */}
      {!isAdminMode && (
        <div className="fixed bottom-20 right-6 z-50 flex flex-col items-end gap-3" id="floating-chat-support-widget">
          {isChatOpen && user && (
            <div className="w-[300px] xs:w-[320px] sm:w-[360px] h-[480px] shadow-2xl animate-scale-up" id="floating-chat-container">
              <ChatSupport 
                studentEmail={user.email} 
                studentName={user.displayName} 
                onCloseChat={() => setIsChatOpen(false)} 
              />
            </div>
          )}
          <button
            onClick={() => {
              if (!user) {
                setShowLogin(true);
                return;
              }
              setIsChatOpen(!isChatOpen);
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white px-4 py-3 rounded-full shadow-lg shadow-accent-500/20 hover:shadow-accent-500/40 transition-all duration-300 font-extrabold uppercase tracking-widest text-[10px] cursor-pointer select-none group border border-accent-400"
            id="floating-chat-trigger-btn"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-900 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-900"></span>
            </span>
            <MessageSquare className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
            <span>{t.chatSupport}</span>
          </button>
        </div>
      )}

      {/* Razorpay Redirect Verification Overlay */}
      {redirectVerificationState !== 'idle' && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-8 text-center shadow-2xl space-y-6">
            {redirectVerificationState === 'verifying' && (
              <>
                <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 w-full h-full border-4 border-indigo-500/20 rounded-full"></div>
                  <div className="absolute inset-0 w-full h-full border-4 border-t-indigo-500 rounded-full animate-spin"></div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">Verifying Payment</h3>
                  <p className="text-slate-400 text-sm">Please do not refresh or close this window. We are unlocking your course(s) now...</p>
                </div>
              </>
            )}
            {redirectVerificationState === 'success' && (
              <>
                <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full mx-auto flex items-center justify-center">
                  <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">Payment Confirmed!</h3>
                  <p className="text-emerald-400 text-sm">Your course has been unlocked successfully.</p>
                  <p className="text-slate-400 text-xs">Redirecting you to the dashboard...</p>
                </div>
              </>
            )}
            {redirectVerificationState === 'error' && (
              <>
                <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 rounded-full mx-auto flex items-center justify-center">
                  <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">Verification Failed</h3>
                  <p className="text-red-400 text-sm">{redirectErrorMessage}</p>
                </div>
                <button
                  onClick={() => {
                    setRedirectVerificationState('idle');
                    const newUrl = window.location.origin + window.location.pathname;
                    window.history.replaceState({}, document.title, newUrl);
                  }}
                  className="w-full bg-slate-800 text-white font-bold py-2.5 rounded-xl border border-slate-700 hover:bg-slate-700 cursor-pointer transition-colors"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
