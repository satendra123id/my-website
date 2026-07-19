import React, { useState } from 'react';
import { User, Lock, Mail, Sparkles, Shield, Chrome, ArrowRight, Phone, ArrowLeft, KeyRound, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface LoginProps {
  onLoginSuccess: (email: string, displayName: string, isAdmin: boolean) => void;
  onBackToCourses?: () => void;
}

export default function Login({ onLoginSuccess, onBackToCourses }: LoginProps) {
  const [isSignUp, setIsSignUp] = useState(() => {
    return !localStorage.getItem('tnt_has_visited');
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    localStorage.setItem('tnt_has_visited', 'true');
  }, []);

  // Forgot Password flow states
  const [forgotStep, setForgotStep] = useState<number>(0); // 0 = standard, 1 = find account, 2 = verify name, 3 = new password, 4 = success
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotVerifyName, setForgotVerifyName] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotSanitizedId, setForgotSanitizedId] = useState('');

  const handleForgotStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!forgotIdentifier.trim()) {
      setError('Please enter your registered email or mobile number.');
      setLoading(false);
      return;
    }

    try {
      let targetEmail = forgotIdentifier.trim();
      
      // If it doesn't contain '@', treat it as a phone number
      if (!targetEmail.includes('@')) {
        const digitsOnly = targetEmail.replace(/\D/g, '');
        if (digitsOnly.length >= 10) {
          // Take the last 10 digits in case they added country code
          const phone10 = digitsOnly.slice(-10);
          targetEmail = `${phone10}@thenewtips.com`;
        }
      }

      const sanitizedId = targetEmail.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
      const userDocRef = doc(db, 'app_users', sanitizedId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        setError('No account found with this email or mobile number.');
        setLoading(false);
        return;
      }

      const userData = userDoc.data();
      if (userData.isAdmin) {
        setError('Admin password cannot be reset here. Please contact support.');
        setLoading(false);
        return;
      }

      setForgotSanitizedId(sanitizedId);
      setForgotStep(2);
    } catch (err: any) {
      console.error(err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!forgotVerifyName.trim()) {
      setError('Please enter your full name to verify.');
      setLoading(false);
      return;
    }

    try {
      const userDocRef = doc(db, 'app_users', forgotSanitizedId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        setError('Session expired. Please start over.');
        setForgotStep(1);
        setLoading(false);
        return;
      }

      const userData = userDoc.data();
      const dbName = (userData.fullName || '').trim().toLowerCase();
      const enteredName = forgotVerifyName.trim().toLowerCase();

      if (dbName !== enteredName) {
        setError('Verification failed. The name you entered does not match our records.');
        setLoading(false);
        return;
      }

      setForgotStep(3);
    } catch (err: any) {
      console.error(err);
      setError('An error occurred during verification.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!forgotNewPassword || forgotNewPassword.length < 4) {
      setError('Password must be at least 4 characters long.');
      setLoading(false);
      return;
    }

    try {
      const userDocRef = doc(db, 'app_users', forgotSanitizedId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        setError('Session expired. Please start over.');
        setForgotStep(1);
        setLoading(false);
        return;
      }

      const userData = userDoc.data();
      await setDoc(userDocRef, {
        ...userData,
        password: forgotNewPassword
      });

      setForgotStep(4);
    } catch (err: any) {
      console.error(err);
      setError('Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const loginEmail = loginMethod === 'phone' ? `${phoneNumber}@thenewtips.com` : email;

    if (loginMethod === 'phone') {
      if (!phoneNumber || phoneNumber.length < 10) {
        setError('Please enter a valid 10-digit mobile number.');
        setLoading(false);
        return;
      }
    } else {
      if (!email) {
        setError('Please enter your email address.');
        setLoading(false);
        return;
      }
    }

    if (!password) {
      setError('Please enter your password.');
      setLoading(false);
      return;
    }

    try {
      // Determine if this is admin
      const isUserAdmin = 
        loginEmail.toLowerCase() === 'sitaramlodhi836@gmail.com' ||
        loginEmail.toLowerCase().includes('lodhi') || 
        loginEmail.toLowerCase().includes('admin') || 
        loginEmail.toLowerCase() === 'satendrlodhi711@gmail.com';

      // 1. If trying to log in as admin, check password against changeable DB adminPassword
      if (isUserAdmin) {
        try {
          const settingsDoc = await getDoc(doc(db, 'settings', 'gateway'));
          const dbSettings = settingsDoc.exists() ? settingsDoc.data() : null;
          const savedAdminPassword = dbSettings?.adminPassword || '@#$sitaram12@#$';

          if (password === savedAdminPassword || password === '@#$sitaram12@#$') {
            onLoginSuccess(loginEmail, 'Admin', true);
            setLoading(false);
            return;
          } else {
            setError('Incorrect admin password.');
            setLoading(false);
            return;
          }
        } catch (settingsErr) {
          console.warn('Admin DB verification bypassed, trying direct Auth:', settingsErr);
        }
      }

      // 2. Custom Firestore-backed Verification for Standard/All Users
      const sanitizedId = loginEmail.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
      const userDocRef = doc(db, 'app_users', sanitizedId);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.password === password) {
          onLoginSuccess(loginEmail, userData.fullName || loginEmail.split('@')[0], isUserAdmin);
          setLoading(false);
          return;
        } else {
          setError('Invalid email/phone or password.');
          setLoading(false);
          return;
        }
      } else {
        setError('No account found with this email or mobile number. Please Sign Up first.');
        setLoading(false);
        return;
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const loginEmail = loginMethod === 'phone' ? `${phoneNumber}@thenewtips.com` : email;

    if (loginMethod === 'phone') {
      if (!phoneNumber || phoneNumber.length < 10) {
        setError('Please enter a valid 10-digit mobile number.');
        setLoading(false);
        return;
      }
    } else {
      if (!email) {
        setError('Please enter your email address.');
        setLoading(false);
        return;
      }
    }

    if (!password || !fullName) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      const sanitizedId = loginEmail.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
      const userDocRef = doc(db, 'app_users', sanitizedId);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        setError('This email or mobile number is already registered.');
        setLoading(false);
        return;
      }

      const isUserAdmin = 
        loginEmail.toLowerCase() === 'sitaramlodhi836@gmail.com' ||
        loginEmail.toLowerCase().includes('lodhi') || 
        loginEmail.toLowerCase().includes('admin') || 
        loginEmail.toLowerCase() === 'satendrlodhi711@gmail.com';

      // Create document in Firestore app_users collection
      await setDoc(userDocRef, {
        email: loginEmail,
        fullName: fullName,
        password: password,
        isAdmin: isUserAdmin,
        createdAt: new Date().toISOString()
      });

      // Add a Welcome Email notification for the student
      const welcomeId = 'email_welcome_' + Math.random().toString(36).substr(2, 9).toUpperCase();
      await setDoc(doc(db, 'email_notifications', welcomeId), {
        id: welcomeId,
        recipientEmail: loginEmail,
        studentName: fullName,
        type: 'WELCOME',
        subject: `Welcome to The New Tips Academic! 🚀`,
        body: `Hi ${fullName},\n\nWelcome to The New Tips! Your student account has been successfully created.\n\nYou can now browse our premium course catalog, purchase lectures, and start your learning journey with lifetime access to all your course materials.\n\nHappy Learning!\n\nThe New Tips Team`,
        status: 'SENT',
        timestamp: Date.now()
      });

      onLoginSuccess(loginEmail, fullName, isUserAdmin);
    } catch (err: any) {
      console.error(err);
      setError('Failed to register account: ' + (err.message || 'Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLoginReal = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const email = user.email || '';
      const name = user.displayName || email.split('@')[0];
      
      const isUserAdmin = 
        email.toLowerCase() === 'sitaramlodhi836@gmail.com' ||
        email.toLowerCase().includes('lodhi') || 
        email.toLowerCase().includes('admin') || 
        email.toLowerCase() === 'satendrlodhi711@gmail.com';
        
      onLoginSuccess(email, name, isUserAdmin);
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      const errCode = err.code || '';
      const errMsg = err.message || '';
      if (errCode === 'auth/popup-closed-by-user' || errMsg.includes('popup-closed-by-user')) {
        setError('Google Sign-In window was closed. If you are using the app inside the AI Studio preview pane, please click the "Open in new tab" icon (top right corner of the preview) to sign in with Google, or sign in using your Email/Mobile & Password instead.');
      } else if (errCode === 'auth/popup-blocked' || errMsg.includes('popup-blocked')) {
        setError('Google Sign-In popup was blocked by your browser. Please allow popups for this site, or open this app in a new tab using the icon at the top right.');
      } else {
        setError('Google Sign-In failed: ' + (errMsg || 'Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12 text-slate-900" id="login-container">
      
      {/* Brand Title Display with Emoji */}
      <div className="text-center mb-6 max-w-md" id="login-hero-header">
        <div className="text-sm font-extrabold text-indigo-600 tracking-wider mb-2" id="login-penal-text">
          Secure Access
        </div>
        <h1 className="text-3xl sm:text-4xl font-black font-display tracking-tight text-slate-900 flex items-center justify-center gap-2" id="brand-title">
          🔰 THE NEW TIPS
        </h1>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-white backdrop-blur-md rounded-3xl border border-slate-200/80 shadow-2xl p-8 relative overflow-hidden" id="login-card">
        {/* Subtle accent top border */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-indigo-600"></div>

        {forgotStep > 0 ? (
          <div className="space-y-4" id="forgot-password-container">
            <div className="text-center mb-4">
              <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide">
                Password Reset
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                {forgotStep === 1 ? 'Step 1: Find account' :
                 forgotStep === 2 ? 'Step 2: Verify name' :
                 forgotStep === 3 ? 'Step 3: New password' : 'Reset successful'}
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-950/40 border border-red-900/30 text-red-300 rounded-xl text-xs font-semibold text-center">
                {error}
              </div>
            )}

            {forgotStep === 1 && (
              <form onSubmit={handleForgotStep1} className="space-y-4" id="forgot-step1-form">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Email or Mobile Number
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                      placeholder="Enter registered email or phone"
                      className="w-full bg-white border border-slate-200 focus:border-indigo-600 rounded-2xl py-3 pl-11 pr-4 text-sm font-medium transition-all outline-none text-slate-900 placeholder-zinc-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-wider text-xs py-3.5 px-6 rounded-2xl transition-all flex justify-center items-center gap-2 cursor-pointer"
                >
                  {loading ? 'Finding account...' : 'Continue'}
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setForgotStep(0);
                  }}
                  className="w-full bg-white border border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-xs py-3 rounded-2xl transition-all flex justify-center items-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Sign In
                </button>
              </form>
            )}

            {forgotStep === 2 && (
              <form onSubmit={handleForgotStep2} className="space-y-4" id="forgot-step2-form">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Registered Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={forgotVerifyName}
                      onChange={(e) => setForgotVerifyName(e.target.value)}
                      placeholder="Enter registered full name"
                      className="w-full bg-white border border-slate-200 focus:border-indigo-600 rounded-2xl py-3 pl-11 pr-4 text-sm font-medium transition-all outline-none text-slate-900 placeholder-zinc-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-wider text-xs py-3.5 px-6 rounded-2xl transition-all flex justify-center items-center gap-2 cursor-pointer"
                >
                  {loading ? 'Verifying...' : 'Verify Identity'}
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setForgotStep(1);
                  }}
                  className="w-full bg-white border border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-xs py-3 rounded-2xl transition-all flex justify-center items-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              </form>
            )}

            {forgotStep === 3 && (
              <form onSubmit={handleForgotStep3} className="space-y-4" id="forgot-step3-form">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Enter New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white border border-slate-200 focus:border-indigo-600 rounded-2xl py-3 pl-11 pr-4 text-sm font-medium transition-all outline-none text-slate-900 placeholder-zinc-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-black uppercase tracking-wider text-xs py-3.5 px-6 rounded-2xl transition-all flex justify-center items-center gap-2 cursor-pointer"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {forgotStep === 4 && (
              <div className="text-center py-4 space-y-4">
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Password Reset Complete
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Your password has been updated successfully!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setForgotStep(0);
                    setIsSignUp(false);
                    setPassword('');
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-wider text-xs py-3.5 px-6 rounded-2xl cursor-pointer transition-all"
                >
                  Proceed to Sign In
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Header within the card */}
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 tracking-wide">
                {isSignUp ? 'Create Account' : 'Welcome Back 👋'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {isSignUp ? 'Sign up to start learning premium skills.' : 'Sign in to continue learning.'}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-950/40 border border-red-900/30 text-red-300 rounded-xl text-xs font-semibold text-center">
                {error}
              </div>
            )}

            {/* Selector tabs for Sign-In Method */}
            <div className="flex bg-white p-1 rounded-2xl border border-slate-200/60 mb-5">
              <button
                type="button"
                onClick={() => setLoginMethod('email')}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                  loginMethod === 'email' ? 'bg-slate-100 text-slate-900 font-extrabold shadow-sm' : 'text-slate-400 hover:text-slate-900'
                }`}
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('phone')}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                  loginMethod === 'phone' ? 'bg-slate-100 text-slate-900 font-extrabold shadow-sm' : 'text-slate-400 hover:text-slate-900'
                }`}
              >
                Mobile Number
              </button>
            </div>

            <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-4">
              
              {isSignUp && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full bg-white border border-slate-200 focus:border-indigo-600 rounded-2xl py-2.5 pl-11 pr-4 text-xs transition-all outline-none text-slate-900 placeholder-zinc-600"
                    />
                  </div>
                </div>
              )}

              {loginMethod === 'email' ? (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                    <span>📧</span> <span>Email</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="w-full bg-white border border-slate-200 focus:border-indigo-600 rounded-2xl py-3 pl-11 pr-4 text-sm transition-all outline-none text-slate-900 placeholder-zinc-600"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                    <span>📱</span> <span>Mobile Number</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      maxLength={10}
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 10-digit mobile number"
                      className="w-full bg-white border border-slate-200 focus:border-indigo-600 rounded-2xl py-3 pl-11 pr-4 text-sm transition-all outline-none text-slate-900 placeholder-zinc-600 tracking-wider"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                    <span>🔒</span> <span>Password</span>
                  </label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setForgotStep(1);
                        setForgotIdentifier(email || phoneNumber || '');
                      }}
                      className="text-[10px] font-bold text-indigo-600 hover:text-accent-300 uppercase tracking-wide cursor-pointer"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="•••••••••••••"
                    className="w-full bg-white border border-slate-200 focus:border-indigo-600 rounded-2xl py-3 pl-11 pr-12 text-sm transition-all outline-none text-slate-900 placeholder-zinc-600"
                  />
                  {/* Eye Toggle Icon */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-900 cursor-pointer"
                    title={showPassword ? 'Hide Password' : 'Show Password'}
                  >
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5 text-indigo-600" />}
                  </button>
                </div>
              </div>

              {/* Big [ SIGN IN ] button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-xs py-4 px-6 rounded-2xl shadow-lg transition-all active:scale-98 cursor-pointer mt-6 flex justify-center items-center gap-2"
              >
                {loading ? 'Processing...' : isSignUp ? '[ CREATE ACCOUNT ]' : '[ SIGN IN ]'}
              </button>
            </form>

            {/* Divider: ──────── OR ──────── */}
            <div className="relative my-6 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 relative z-10">
                ──────── OR ────────
              </span>
            </div>

            {/* Continue with Google */}
            <button
              type="button"
              onClick={handleGoogleLoginReal}
              className="w-full bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl py-3.5 px-4 text-xs font-bold transition-all text-slate-900 cursor-pointer shadow-md flex items-center justify-center gap-2"
              id="social-login-google"
            >
              <Chrome className="w-4.5 h-4.5 text-red-600" />
              <span>Continue with Google</span>
            </button>

            {/* ⭐⭐⭐⭐⭐ Trusted by 5000+ Learners */}
            <div className="mt-6 flex justify-center items-center gap-1.5 text-amber-600 text-[10px] font-bold uppercase tracking-widest bg-amber-500/5 py-2 px-4 rounded-xl border border-amber-500/10">
              <span>⭐⭐⭐⭐⭐</span>
              <span>Trusted by 5000+ Learners</span>
            </div>

            {/* Toggle link */}
            <div className="mt-6 text-center" id="toggle-auth-mode">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              </p>
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                type="button"
                className="mt-1 text-indigo-600 hover:text-accent-300 font-extrabold uppercase tracking-widest text-[11px] underline"
                id="toggle-auth-button"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </div>

            {onBackToCourses && (
              <div className="mt-6 pt-4 border-t border-slate-200/40 text-center">
                <button
                  type="button"
                  onClick={onBackToCourses}
                  className="text-xs font-extrabold uppercase tracking-widest text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-1.5 mx-auto transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Continue Browsing / बिना लॉगिन के देखें</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

