import React, { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import { 
  Users, 
  DollarSign, 
  Clock, 
  BookOpen, 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  X, 
  Settings, 
  List, 
  LayoutDashboard, 
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Eye,
  Play,
  Edit3,
  FileText,
  UploadCloud,
  Check,
  MessageSquare,
  Award,
  Sparkles,
  Bot,
  Wand2,
  Brain,
  Zap,
  RotateCcw,
  Mail,
  RefreshCw,
  Package,
  Receipt,
  Activity,
  AlertTriangle,
  ChevronRight,
  ScanSearch,
  Cpu,
  Search,
  Smartphone,
  Key,
  EyeOff
} from 'lucide-react';
import { Course, Transaction, GatewaySettings, Attachment, Video, EmailNotification } from '../types';
import { translations, Language } from '../translations';
import ChatComponent from './ChatComponent';
import CourseViewer from './CourseViewer';
import { getEmailNotifications } from '../lib/dbService';

interface AdminPortalProps {
  courses: Course[];
  transactions: Transaction[];
  views?: any[];
  appUsers?: any[];
  settings: GatewaySettings;
  user: any;
  adminDisplayName: string;
  onUpdateSettings: (newSettings: GatewaySettings) => Promise<void>;
  onAddCourse: (course: Course) => Promise<void>;
  onUpdateCourse: (id: string, updates: Partial<Course>) => Promise<void>;
  onDeleteCourse: (id: string) => Promise<void>;
  onVerifyTransaction: (id: string) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
  language: Language;
}

export default function AdminPortal({
  courses,
  transactions,
  views = [],
  appUsers = [],
  settings,
  user,
  adminDisplayName,
  onUpdateSettings,
  onAddCourse,
  onUpdateCourse,
  onDeleteCourse,
  onVerifyTransaction,
  onDeleteTransaction,
  language
}: AdminPortalProps) {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'overview' | 'courses' | 'ledger' | 'settings' | 'support' | 'ai_audit' | 'ai_courses' | 'health_check' | 'emails' | 'ai_api_work' | 'users'>('overview');
  
  // Email Notifications State
  const [emails, setEmails] = useState<EmailNotification[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailNotification | null>(null);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);

  // Users & Leads state variables
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedUserForMail, setSelectedUserForMail] = useState<any | null>(null);
  const [selectedUserForSms, setSelectedUserForSms] = useState<any | null>(null);
  const [mailSubject, setMailSubject] = useState('');
  const [mailBody, setMailBody] = useState('');
  const [smsText, setSmsText] = useState('');
  const [selectedCourseIdForMail, setSelectedCourseIdForMail] = useState('');
  const [selectedCourseIdForSms, setSelectedCourseIdForSms] = useState('');
  const [userPasswordVisible, setUserPasswordVisible] = useState<Record<string, boolean>>({});
  const [smsLogs, setSmsLogs] = useState<any[]>([]);

  useEffect(() => {
    let unsubscribeEmails: () => void = () => {};
    let unsubscribeSms: () => void = () => {};
    
    if (!user || !user.isAdmin) return;

    const setupRealtimeNotifications = async () => {
      const { db, collection, onSnapshot, query, orderBy } = await import('../lib/firebase');
      
      // Emails
      const qEmails = query(collection(db, 'email_notifications'), orderBy('timestamp', 'desc'));
      unsubscribeEmails = onSnapshot(qEmails, (snapshot) => {
        const fetched: EmailNotification[] = [];
        snapshot.forEach((doc) => {
          fetched.push(doc.data() as EmailNotification);
        });
        setEmails(fetched);
      }, (err) => {
        console.error("Email subscription error:", err);
      });

      // SMS
      const qSms = query(collection(db, 'sms_notifications'), orderBy('timestamp', 'desc'));
      unsubscribeSms = onSnapshot(qSms, (snapshot) => {
        const fetchedSms: any[] = [];
        snapshot.forEach((doc) => {
          fetchedSms.push({ id: doc.id, ...doc.data() });
        });
        setSmsLogs(fetchedSms);
      }, (err) => {
        console.error("SMS subscription error:", err);
      });
    };

    setupRealtimeNotifications();
    return () => {
      unsubscribeEmails();
      unsubscribeSms();
    };
  }, [user]);

  const [aiApiKeysStatus, setAiApiKeysStatus] = useState<any[]>([]);
  const [loadingAiKeys, setLoadingAiKeys] = useState(false);
  const [pingingId, setPingingId] = useState<string | null>(null);
  const [cronLoading, setCronLoading] = useState(false);
  const [cronMessage, setCronMessage] = useState<string | null>(null);
  const [pingResult, setPingResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [aiMonitorError, setAiMonitorError] = useState<string | null>(null);

  const fetchAiApiStatus = async () => {
    setLoadingAiKeys(true);
    setAiMonitorError(null);
    try {
      const res = await fetch('/api/admin/ai-api-status');
      if (!res.ok) throw new Error("Server communication failure. Please check your connection or restart the dev server.");
      const data = await res.json();
      if (data.success) {
        setAiApiKeysStatus(data.keys);
      }
    } catch(err: any) {
      console.error(err);
      setAiMonitorError(err.message || "Failed to fetch AI API live status.");
    } finally {
      setLoadingAiKeys(false);
    }
  };

  const handlePingKey = async (id: string) => {
    setPingingId(id);
    setPingResult(null);
    try {
      const res = await fetch('/api/admin/ping-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        setPingResult({ id, success: true, message: data.message });
        fetchAiApiStatus(); // Refresh metrics
      } else {
        setPingResult({ id, success: false, message: data.errors });
      }
    } catch(err: any) {
      setPingResult({ id, success: false, message: err.message || String(err) });
    } finally {
      setPingingId(null);
    }
  };

  const handleTriggerDailyAutoUpload = async () => {
    setCronLoading(true);
    setCronMessage(null);
    try {
      const res = await fetch('/api/admin/trigger-daily-auto-upload', {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setCronMessage(`Success: ${data.message}`);
        // If we are in the middle of listing courses, it's great to call fetchCourses if we can or if there is a handler to refresh!
      } else {
        setCronMessage(`Error: ${data.error || "Failed to generate daily course."}`);
      }
    } catch(err: any) {
      setCronMessage(`Error: ${err.message || String(err)}`);
    } finally {
      setCronLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'ai_api_work') {
      fetchAiApiStatus();
      // Set up a live polling interval every 5 seconds to keep the live limit count and resets strictly live!
      const interval = setInterval(fetchAiApiStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  // Email Trigger Simulator State
  const [simEmail, setSimEmail] = useState('');
  const [simName, setSimName] = useState('');
  const [simCourse, setSimCourse] = useState('');
  const [simType, setSimType] = useState<'WELCOME' | 'VERIFICATION'>('WELCOME');
  const [isSendingSim, setIsSendingSim] = useState(false);
  const [simSuccess, setSimSuccess] = useState('');

  const handleTriggerSimulatedEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simEmail || !simCourse) return;
    setIsSendingSim(true);
    setSimSuccess('');
    try {
      const selectedCourseObj = courses.find(c => c.title === simCourse) || courses[0];
      const txId = 'sim_txn_' + Math.random().toString(36).substr(2, 9).toUpperCase();
      
      const emailId = 'email_' + simType.toLowerCase() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase();
      let subject = '';
      let body = '';
      const courseTitle = selectedCourseObj ? selectedCourseObj.title : simCourse;
      const amount = selectedCourseObj ? selectedCourseObj.price : 499;
      const studentName = simName || simEmail.split('@')[0] || "Student";

      if (simType === 'WELCOME') {
        subject = `Welcome to "${courseTitle}"! 🚀`;
        body = `Hi ${studentName},\n\nThank you for purchasing "${courseTitle}"! We are thrilled to have you onboard.\n\nYou can access your lectures and downloadable reference guides from your dashboard anytime.\n\nBest regards,\nThe New Tips Team`;
      } else {
        subject = `Payment Verified: Course Unlocked! ✅`;
        body = `Hi ${studentName},\n\nGood news! Your transaction (ID: ${txId}) of ₹${amount} for "${courseTitle}" has been verified successfully. Your access is fully unlocked!\n\nStart learning now: https://thenewtips.com/dashboard\n\nBest regards,\nThe New Tips Team`;
      }

      const { db, doc, setDoc, collection, addDoc } = await import('../lib/firebase');

      // Add to Firestore: Email Log
      const newEmail: EmailNotification = {
        id: emailId,
        transactionId: txId,
        recipientEmail: simEmail,
        studentName,
        courseTitle,
        type: simType,
        subject,
        body,
        status: 'SENT',
        timestamp: Date.now()
      };
      await setDoc(doc(db, 'email_notifications', emailId), newEmail);

      // Add to Firestore: Simulated Transaction (This triggers the real-time UI updates)
      const newTx: Transaction = {
        id: txId,
        courseId: selectedCourseObj?.id || 'sim_course_id',
        courseTitle,
        studentName,
        studentEmail: simEmail,
        amount,
        method: 'UPI',
        refUtrId: 'UTR_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        status: simType === 'VERIFICATION' ? 'SUCCESS' : 'PENDING',
        timestamp: Date.now()
      };
      await setDoc(doc(db, 'transactions', txId), newTx);

      setSimSuccess(language === 'hi' ? 'सिम्युलेटेड इवेंट और ट्रांजैक्शन जनरेट हुआ!' : 'Simulated Event & Transaction generated!');
      setSimEmail('');
      setSimName('');
    } catch (err: any) {
      console.error("Failed to trigger sim:", err);
    } finally {
      setIsSendingSim(false);
    }
  };

  // Health Check State
  const [isVerifyingAll, setIsVerifyingAll] = useState(false);
  const [hasAutoVerified, setHasAutoVerified] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<string>('');
  const [healthResults, setHealthResults] = useState<any[]>([]);
  const [lastVerifyMode, setLastVerifyMode] = useState<'broken-only' | 'all'>('broken-only');
  const [linkFilterMode, setLinkFilterMode] = useState<'all' | 'broken' | 'working'>('broken');
  const [nextScanSeconds, setNextScanSeconds] = useState(1800); // 30 minutes

  const runMassVerification = async (mode: 'broken-only' | 'all' = 'broken-only') => {
    setIsVerifyingAll(true);
    setLastVerifyMode(mode);
    setVerifyStatus(
      language === 'hi' 
        ? (mode === 'broken-only' ? 'केवल टूटे हुए और नए लिंक्स की जांच की जा रही है... इसमें कुछ समय लग सकता है।' : 'सभी लिंक्स की फिर से जांच की जा रही है (फ़ोर्स चेक)... इसमें कुछ समय लग सकता है।')
        : (mode === 'broken-only' ? 'Checking broken & unverified links only... this may take some time.' : 'Force-checking all links from scratch... this may take some time.')
    );
    try {
      const res = await fetch("/api/admin/verify-all-links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ mode })
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server returned ${res.status}: ${text.substring(0, 100)}`);
      }
      const data = await res.json();
      if (data.success) {
        setHealthResults(data.results);
        setHasAutoVerified(true);
        setVerifyStatus(
          language === 'hi' 
            ? (mode === 'broken-only' ? 'जांच पूरी हुई। केवल टूटे/अन-वेरिफाइड लिंक्स को सफलतापूर्वक ठीक कर दिया गया है!' : 'पूर्ण जांच पूरी हुई। सभी लिंक्स का स्टेटस नए सिरे से री-वेरिफाई हो चुका है!')
            : (mode === 'broken-only' ? 'Verification complete. Only broken & unverified links were checked and healed!' : 'Full re-verification complete. All links verified from scratch!')
        );
      } else {
        setVerifyStatus((language === 'hi' ? 'जांच विफल रही: ' : 'Check failed: ') + data.error);
      }
    } catch (err: any) {
      setVerifyStatus((language === 'hi' ? 'सर्वर एरर: ' : 'Server error: ') + err.message);
    } finally {
      setIsVerifyingAll(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'health_check' && !hasAutoVerified && !isVerifyingAll) {
      runMassVerification('broken-only');
    }
  }, [activeTab, hasAutoVerified, isVerifyingAll]);

  useEffect(() => {
    let timer: any;
    if (activeTab === 'health_check') {
      timer = setInterval(() => {
        setNextScanSeconds((prev) => {
          if (prev <= 1) {
            runMassVerification('broken-only');
            return 1800; // Reset to 30 minutes
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setNextScanSeconds(1800);
    }
    return () => clearInterval(timer);
  }, [activeTab]);

  const [isResettingDb, setIsResettingDb] = useState(false);

  const runDatabaseReset = async () => {
    const msg = language === 'hi' 
      ? 'क्या आप सचमुच डेटाबेस को डिफ़ॉल्ट चालू लिंक्स और फाइलों के साथ रीसेट करना चाहते हैं?' 
      : 'Are you sure you want to reset the courses database with working default links and files?';
    if (!window.confirm(msg)) {
      return;
    }
    setIsResettingDb(true);
    setVerifyStatus(language === 'hi' ? 'डेटाबेस को रीसेट किया जा रहा है...' : 'Resetting database...');
    try {
      const res = await fetch("/api/admin/reset-database", {
        method: "POST"
      });
      const data = await res.json();
      if (data.success) {
        setVerifyStatus(language === 'hi' ? 'डेटाबेस सफलतापूर्वक रीसेट हो गया है! कृपया परिवर्तन देखने के लिए पेज रिफ्रेश करें।' : 'Database reset successfully! Please refresh the page to see changes.');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setVerifyStatus((language === 'hi' ? 'रीसेट विफल रहा: ' : 'Reset failed: ') + data.error);
      }
    } catch (err: any) {
      setVerifyStatus((language === 'hi' ? 'सर्वर एरर: ' : 'Server error: ') + err.message);
    } finally {
      setIsResettingDb(false);
    }
  };

  const [previewingCourse, setPreviewingCourse] = useState<Course | null>(null);
  const [fixingIndex, setFixingIndex] = useState<string | null>(null);
  const [editingManualFix, setEditingManualFix] = useState<string | null>(null);
  const [manualUrls, setManualUrls] = useState<Record<string, string>>({});

  const handleManualFix = async (courseId: string, itemType: 'video' | 'attachment', itemIndex: number, newUrl: string) => {
    // Implement manual fix logic
    const fixKey = `${courseId}-${itemType}-${itemIndex}`;
    setFixingIndex(fixKey);
    try {
      const res = await fetch("/api/admin/fix-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, itemType, itemIndex, newUrl, isManual: true })
      });
      const data = await res.json();
      if (data.success) {
        setVerifyStatus(language === 'hi' ? 'लिंक सफलतापूर्वक अपडेट किया गया।' : 'Link updated successfully.');
        
        // Update local state similar to handleFixLink
        setHealthResults(prev => prev.map(r => {
          if (r.id === courseId) {
            const newVideos = [...(r.videos || [])];
            const newAttachments = [...(r.attachments || [])];
            if (itemType === 'video') newVideos[itemIndex] = { ...newVideos[itemIndex], url: newUrl, isVerified: true };
            else newAttachments[itemIndex] = { ...newAttachments[itemIndex], url: newUrl, isVerified: true };
            return { ...r, videos: newVideos, attachments: newAttachments };
          }
          return r;
        }));
        
        // Update courses list (parent component manages courses via props)
      } else {
        setVerifyStatus((language === 'hi' ? 'अपडेट विफल रहा: ' : 'Update failed: ') + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      setVerifyStatus((language === 'hi' ? 'सर्वर एरर: ' : 'Server error: ') + err.message);
    } finally {
      setFixingIndex(null);
    }
  };


  const handleValidateLink = async (courseId: string, itemType: 'video' | 'attachment', itemIndex: number) => {
    setFixingIndex(`${courseId}-${itemType}-${itemIndex}`);
    try {
      const res = await fetch("/api/admin/validate-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, itemType, itemIndex })
      });
      const data = await res.json();
      if (data.success) {
        setVerifyStatus(language === 'hi' ? 'लिंक सुरक्षित सत्यापित किया गया!' : 'Link validated as safe!');
        // Update local state similar to handleFixLink
        setHealthResults(prev => prev.map(r => {
          if (r.id === courseId) {
            const newVideos = [...(r.videos || [])];
            const newAttachments = [...(r.attachments || [])];
            if (itemType === 'video') newVideos[itemIndex] = { ...newVideos[itemIndex], isVerified: true };
            else newAttachments[itemIndex] = { ...newAttachments[itemIndex], isVerified: true };
            return { ...r, videos: newVideos, attachments: newAttachments };
          }
          return r;
        }));
      } else {
        setVerifyStatus((language === 'hi' ? 'सत्यापन विफल: ' : 'Validation failed: ') + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      setVerifyStatus((language === 'hi' ? 'सर्वर एरर: ' : 'Server error: ') + err.message);
    } finally {
      setFixingIndex(null);
    }
  };


  const handleReverifyLink = async (courseId: string, itemType: 'video' | 'attachment', itemIndex: number, currentUrl: string) => {
    const fixKey = `${courseId}-${itemType}-${itemIndex}`;
    setFixingIndex(fixKey);
    try {
      const res = await fetch("/api/admin/reverify-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, itemType, itemIndex, currentUrl })
      });
      const data = await res.json();
      if (data.success) {
        setVerifyStatus(language === 'hi' ? 'लिंक पुनः सत्यापित किया गया।' : 'Link re-verified.');
        console.log("Re-verified success. New status:", data.isVerified);
        
        // Update local results so preview is immediate
        setHealthResults(prev => {
          return prev.map(r => {
            if (r.id === courseId) {
              const newVideos = [...(r.videos || [])];
              const newAttachments = [...(r.attachments || [])];
              if (itemType === 'video') newVideos[itemIndex] = { ...newVideos[itemIndex], isVerified: data.isVerified };
              else newAttachments[itemIndex] = { ...newAttachments[itemIndex], isVerified: data.isVerified };
              console.log("Updating healthResults for course", courseId, "item", itemType, itemIndex, "to", data.isVerified);
              return { ...r, videos: newVideos, attachments: newAttachments };
            }
            return r;
          });
        });

        // Update courses list (parent component manages courses via props)
      } else {
        setVerifyStatus((language === 'hi' ? 'सत्यापन विफल रहा: ' : 'Verification failed: ') + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      setVerifyStatus((language === 'hi' ? 'सर्वर एरर: ' : 'Server error: ') + err.message);
    } finally {
      setFixingIndex(null);
    }
  };

  const handleFixLink = async (courseId: string, courseTitle: string, itemType: 'video' | 'attachment', itemIndex: number, currentTitle: string, currentUrl: string) => {
    const fixKey = `${courseId}-${itemType}-${itemIndex}`;
    setFixingIndex(fixKey);
    try {
      const res = await fetch("/api/admin/fix-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, courseTitle, itemType, itemIndex, currentTitle, currentUrl })
      });
      const data = await res.json();
      if (data.success) {
        setVerifyStatus(`Link fixed: ${data.updatedItem.title || data.updatedItem.name}. Please re-verify.`);
        
        // Update local results so preview is immediate
        setHealthResults(prev => {
          const existing = prev.find(r => r.id === courseId);
          if (existing) {
            return prev.map(r => {
              if (r.id === courseId) {
                const newVideos = [...(r.videos || [])];
                const newAttachments = [...(r.attachments || [])];
                if (itemType === 'video') newVideos[itemIndex] = data.updatedItem;
                else newAttachments[itemIndex] = data.updatedItem;
                return { ...r, videos: newVideos, attachments: newAttachments };
              }
              return r;
            });
          } else {
            // Find the original course
            const course = courses.find(c => c.id === courseId);
            if (!course) return prev;
            const newVideos = [...(course.videos || [])];
            const newAttachments = [...(course.attachments || [])];
            if (itemType === 'video') newVideos[itemIndex] = data.updatedItem;
            else newAttachments[itemIndex] = data.updatedItem;
            return [...prev, { id: courseId, status: 'updated', videos: newVideos, attachments: newAttachments }];
          }
        });
      
        // Update the actual parent state course data to ensure persistence in React components
        const targetCourse = courses.find(c => c.id === courseId);
        if (targetCourse) {
          if (itemType === 'video') {
            const updatedVideos = [...(targetCourse.videos || [])];
            updatedVideos[itemIndex] = data.updatedItem;
            await onUpdateCourse(courseId, { videos: updatedVideos });
          } else {
            const updatedAttachments = [...(targetCourse.attachments || [])];
            updatedAttachments[itemIndex] = data.updatedItem;
            await onUpdateCourse(courseId, { attachments: updatedAttachments });
          }
        }
      } else {
        if (res.status === 429) {
          setVerifyStatus(language === 'hi' ? 'एआई कोटा समाप्त हो गया है। कृपया कुछ मिनटों बाद प्रयास करें।' : 'AI API quota exhausted. Please try again in a few minutes.');
        } else {
          setVerifyStatus((language === 'hi' ? 'फिक्स विफल रहा: ' : 'Fix failed: ') + (data.error || 'Unknown error'));
        }
      }
    } catch (err: any) {
      setVerifyStatus((language === 'hi' ? 'सर्वर एरर: ' : 'Server error: ') + err.message);
    } finally {
      setFixingIndex(null);
    }
  };

  const [isFixingAll, setIsFixingAll] = useState<string | null>(null);

  const handleFixAllLinks = async (course: Course, videos: Video[], attachments: any[]) => {
    setIsFixingAll(course.id);
    setVerifyStatus(language === 'hi' 
      ? `कोर्स "${course.title}" के सभी टूटे हुए लिंक्स को AI से ठीक किया जा रहा है...`
      : `Auto-fixing all broken links for course "${course.title}" via AI...`);
    
    try {
      const res = await fetch("/api/admin/fix-course-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id })
      });
      const data = await res.json();
      
      if (data.success) {
        // Update local state for immediate feedback in Admin UI
        setHealthResults(prev => prev.map(r => {
          if (r.id === course.id) {
            return { 
              ...r, 
              videos: data.updatedVideos, 
              attachments: data.updatedAttachments 
            };
          }
          return r;
        }));
        
        // Push full updates to Firestore & refresh top-level app state in App.tsx
        await onUpdateCourse(course.id, { 
          videos: data.updatedVideos, 
          attachments: data.updatedAttachments 
        });
        
        setVerifyStatus(language === 'hi'
          ? "सफलता! इस कोर्स के सभी टूटे हुए लिंक्स को AI द्वारा रिप्लेस कर दिया गया है।"
          : "Success! All broken links in this course have been fixed by AI.");
      } else {
        throw new Error(data.error || "Unknown server error");
      }
    } catch (err: any) {
      setVerifyStatus(language === 'hi'
        ? `त्रुटि: ${err.message}`
        : `Fix All failed: ${err.message}`);
    } finally {
      setIsFixingAll(null);
    }
  };
  
  // AI Course Generation State
  const [isGeneratingAICourse, setIsGeneratingAICourse] = useState(false);
  const [aiGenerationStep, setAiGenerationStep] = useState('');
  const [aiGenerationTopic, setAiGenerationTopic] = useState('');
  const [aiGenSuccessMsg, setAiGenSuccessMsg] = useState('');
  const [aiGenErrorMsg, setAiGenErrorMsg] = useState('');

  const runAiCourseGeneration = async (topicStr?: string) => {
    setIsGeneratingAICourse(true);
    setAiGenErrorMsg('');
    setAiGenSuccessMsg('');
    
    const steps = [
      "Gemini AI नवीनतम हाई-डिमांड एजुकेशनल टॉपिक्स का विश्लेषण कर रहा है...",
      "पाठ्यक्रम (Syllabus Structure) और मॉड्यूल तैयार किये जा रहे हैं...",
      "YouTube से रियल और वर्किंग एजुकेशनल लेक्चर्स सिंक किये जा रहे हैं...",
      "डाउनलोड करने योग्य PDF स्टडी गाइड्स और चीट-शीट्स जनरेट की जा रही हैं...",
      "पाठ्यक्रम (High-value course post) स्टोर फ्रंट पर पोस्ट किया जा रहा है..."
    ];

    try {
      setAiGenerationStep(steps[0]);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setAiGenerationStep(steps[1]);
      await new Promise(resolve => setTimeout(resolve, 1200));
      setAiGenerationStep(steps[2]);
      await new Promise(resolve => setTimeout(resolve, 1200));
      setAiGenerationStep(steps[3]);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setAiGenerationStep(steps[4]);

      const res = await fetch("/api/admin/generate-ai-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topicStr || aiGenerationTopic || undefined })
      });
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("सर्वर से अमान्य उत्तर प्राप्त हुआ। कृपया 5 सेकंड बाद पुनः प्रयास करें।");
      }
      
      const data = await res.json();
      if (data.success) {
        setAiGenSuccessMsg(data.message || `सफलतापूर्वक AI द्वारा कोर्स पोस्ट किया गया: "${data.course.title}" (Category: ${data.course.category})`);
        setAiGenerationTopic('');
      } else {
        throw new Error(data.error || "कोर्स जनरेट करने में विफलता।");
      }
    } catch (err: any) {
      console.error("AI Course generation failed:", err);
      setAiGenErrorMsg(err?.message || "AI कोर्स सर्वर से संपर्क नहीं कर सका।");
    } finally {
      setIsGeneratingAICourse(false);
      setAiGenerationStep('');
    }
  };
  
  // AI Audit State
  const [aiAuditReport, setAiAuditReport] = useState<string>('');
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [auditStep, setAuditStep] = useState<string>('');
  const [auditError, setAuditError] = useState<string>('');
  const [rawAuditStats, setRawAuditStats] = useState<any>(null);

  const runAiAudit = async () => {
    setIsAuditing(true);
    setAuditError('');
    setAiAuditReport('');
    
    const steps = [
      "सक्रिय कोर्सेस सूची (Active Courses Catalog) की जांच की जा रही है...",
      "पेमेंट गेटवे क्रेडेंशियल्स और UPI VPA फॉर्मेट का विश्लेषण हो रहा है...",
      "अंतिम ट्रांजेक्शन रिकॉर्ड्स और डेटाबेस अखंडता (Database Integrity) को वेरीफाई किया जा रहा है...",
      "Google Gemini AI से सर्वश्रेष्ठ यूआई/यूएक्स कन्वर्शन ऑडिट तैयार किया जा रहा है..."
    ];

    try {
      setAuditStep(steps[0]);
      await new Promise(resolve => setTimeout(resolve, 800));
      setAuditStep(steps[1]);
      await new Promise(resolve => setTimeout(resolve, 900));
      setAuditStep(steps[2]);
      await new Promise(resolve => setTimeout(resolve, 800));
      setAuditStep(steps[3]);

      const res = await fetch("/api/admin/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("सर्वर से अमान्य उत्तर प्राप्त हुआ। कृपया 5 सेकंड बाद पुनः प्रयास करें।");
      }
      
      const data = await res.json();
      if (data.success) {
        setAiAuditReport(data.report);
        setRawAuditStats(data.rawStats);
      } else {
        throw new Error(data.error || "AI ऑडिट शुरू नहीं हो सका।");
      }
    } catch (err: any) {
      console.error("AI Audit run failed:", err);
      setAuditError(err?.message || "सर्वर के साथ संचार स्थापित नहीं हो सका। कृपया बाद में प्रयास करें।");
    } finally {
      setIsAuditing(false);
      setAuditStep('');
    }
  };

  // Settings Form State
  const [keyId, setKeyId] = useState(settings.razorpayKeyId);
  const [keySecret, setKeySecret] = useState(settings.razorpayKeySecret);
  const [webhookSecret, setWebhookSecret] = useState(settings.razorpayWebhookSecret || '');
  const [vpa, setVpa] = useState(settings.upiVpa);
  const [isLive, setIsLive] = useState(settings.isLiveMode);
  const [adminPassword, setAdminPassword] = useState(settings.adminPassword || '@#$sitaram12@#$');
  const [smtpHost, setSmtpHost] = useState(settings.smtpHost || '');
  const [smtpPort, setSmtpPort] = useState(settings.smtpPort || '');
  const [smtpUser, setSmtpUser] = useState(settings.smtpUser || '');
  const [smtpPass, setSmtpPass] = useState(settings.smtpPass || '');
  const [smtpSender, setSmtpSender] = useState(settings.smtpSender || '');
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [smtpTestStatus, setSmtpTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [smtpTestMessage, setSmtpTestMessage] = useState('');

  // Deletion Confirm State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Course Creator Modal State
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  
  // Course Form State
  const [cTitle, setCTitle] = useState('');
  const [cDesc, setCDesc] = useState('');
  const [cPrice, setCPrice] = useState(199);
  const [cOriginalPrice, setCOriginalPrice] = useState(1999);
  const [cThumbnail, setCThumbnail] = useState('https://images.unsplash.com/photo-1547082299-de196ea013d6?q=80&w=600&auto=format&fit=crop');
  const [cCategory, setCCategory] = useState('DEVELOPMENT');
  
  // Form Lectures and Attachments (Simple strings for rapid testing)
  const [courseVideos, setCourseVideos] = useState<{title: string, url: string, isVerified?: boolean}[]>([ 
    { title: 'Lecture 1: Introduction Masterclass', url: 'https://www.w3schools.com/html/mov_bbb.mp4' }
  ]);
  const [fileTitle1, setFileTitle1] = useState('Cheat Sheet Quickstart.pdf');
  const [fileSize1, setFileSize1] = useState('2.4 MB');
  const [fileUrl1, setFileUrl1] = useState('#');
  const [attachmentsList, setAttachmentsList] = useState<Attachment[]>([]);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'24h' | '7d' | '30d'>('24h');

  const [videoUploadingIndexes, setVideoUploadingIndexes] = useState<Record<number, string>>({});
  const [activeUploadDropdown, setActiveUploadDropdown] = useState<number | null>(null);

  // Refs for tracking state inside async upload closure to prevent stale state bugs
  const courseVideosRef = React.useRef(courseVideos);
  React.useEffect(() => {
    courseVideosRef.current = courseVideos;
  }, [courseVideos]);

  const coursesRef = React.useRef(courses);
  React.useEffect(() => {
    coursesRef.current = courses;
  }, [courses]);

  const editingCourseIdRef = React.useRef(editingCourseId);
  React.useEffect(() => {
    editingCourseIdRef.current = editingCourseId;
  }, [editingCourseId]);

  const handleVideoUpload = async (file: File, index: number, target: 'server' | 'telegram') => {
    setActiveUploadDropdown(null);
    const formData = new FormData();
    formData.append('file', file);
    
    const newList = [...courseVideosRef.current];
    if (newList[index]) {
      newList[index] = { ...newList[index], url: 'Uploading...' };
      setCourseVideos(newList);
    }
    setVideoUploadingIndexes(prev => ({ ...prev, [index]: target === 'telegram' ? 'Uploading to Telegram...' : 'Uploading to Server...' }));
    
    try {
      const endpoint = target === 'telegram' ? '/api/admin/telegram/upload' : '/api/admin/upload';
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        const updatedList = [...courseVideosRef.current];
        if (updatedList[index]) {
          updatedList[index] = { ...updatedList[index], url: data.url, isVerified: true };
          setCourseVideos(updatedList);
        }
        
        // Auto-save/update Firestore if the course has already been saved or is active in database
        const currentCourseId = editingCourseIdRef.current;
        if (currentCourseId) {
          try {
            const { db, doc, getDoc, setDoc } = await import('../lib/firebase');
            const courseDocRef = doc(db, 'courses', currentCourseId);
            const courseSnap = await getDoc(courseDocRef);
            if (courseSnap.exists()) {
              const courseData = courseSnap.data() as Course;
              const updatedVideos = courseData.videos ? [...courseData.videos] : [];
              while (updatedVideos.length <= index) {
                updatedVideos.push({ id: `v${updatedVideos.length + 1}`, title: `Lecture ${updatedVideos.length + 1}`, url: '' });
              }
              updatedVideos[index] = {
                ...updatedVideos[index],
                url: data.url,
                isVerified: true
              };
              await setDoc(courseDocRef, { ...courseData, videos: updatedVideos });
              console.log("Successfully updated course video URL directly in Firestore:", currentCourseId);
            } else {
              const existingCourse = coursesRef.current.find(c => c.id === currentCourseId);
              if (existingCourse) {
                const updatedVideos = existingCourse.videos ? [...existingCourse.videos] : [];
                while (updatedVideos.length <= index) {
                  updatedVideos.push({ id: `v${updatedVideos.length + 1}`, title: `Lecture ${updatedVideos.length + 1}`, url: '' });
                }
                updatedVideos[index] = {
                  ...updatedVideos[index],
                  url: data.url,
                  isVerified: true
                };
                await onUpdateCourse(currentCourseId, {
                  videos: updatedVideos
                });
                console.log("Successfully updated course video URL using local fallback in Firestore:", currentCourseId);
              }
            }
          } catch (dbErr) {
            console.error("Error updating course video in Firestore:", dbErr);
          }
        }

        if (target === 'telegram') {
          alert(language === 'hi' ? 'टेलीग्राम अपलोड सफल! वीडियो आपके बॉट के माध्यम से स्ट्रीम होगा।' : 'Telegram Upload Successful! Video will stream through your bot.');
        } else {
          alert(language === 'hi' ? 'वेबसाइट सर्वर अपलोड सफल!' : 'Website Server Upload Successful!');
        }
      } else {
        alert("Upload failed: " + data.error);
        const updatedList = [...courseVideosRef.current];
        if (updatedList[index]) {
          updatedList[index] = { ...updatedList[index], url: '' };
          setCourseVideos(updatedList);
        }
      }
    } catch (err: any) {
      console.error(err);
      alert("Upload error: " + (err.message || String(err)));
      const updatedList = [...courseVideosRef.current];
      if (updatedList[index]) {
        updatedList[index] = { ...updatedList[index], url: '' };
        setCourseVideos(updatedList);
      }
    } finally {
      setVideoUploadingIndexes(prev => {
        const updated = { ...prev };
        delete updated[index];
        return updated;
      });
    }
  };

  // Overview metrics calculations
  const totalSales = transactions
    .filter(t => t.status?.toUpperCase() === 'SUCCESS')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const enrolledStudents = new Set(
    transactions.filter(t => t.status?.toUpperCase() === 'SUCCESS').map(t => t.studentEmail)
  ).size;

  const pendingCount = transactions.filter(t => t.status?.toUpperCase() === 'PENDING').length;

  // Real-time page views metrics calculations
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  
  const viewsToday = views.filter(v => (now - v.timestamp) <= oneDayMs);
  const views7Days = views.filter(v => (now - v.timestamp) <= (7 * oneDayMs));
  const views30Days = views.filter(v => (now - v.timestamp) <= (30 * oneDayMs));

  const uniqueToday = new Set(viewsToday.map(v => v.deviceId || v.userEmail || v.user || v.id)).size;
  const unique7Days = new Set(views7Days.map(v => v.deviceId || v.userEmail || v.user || v.id)).size;
  const unique30Days = new Set(views30Days.map(v => v.deviceId || v.userEmail || v.user || v.id)).size;

  const selectedViews = analyticsPeriod === '24h' ? viewsToday : (analyticsPeriod === '7d' ? views7Days : views30Days);
  const selectedUnique = analyticsPeriod === '24h' ? uniqueToday : (analyticsPeriod === '7d' ? unique7Days : unique30Days);

  const getDynamicChartHeights = () => {
    const periodMs = analyticsPeriod === '24h' ? oneDayMs : (analyticsPeriod === '7d' ? 7 * oneDayMs : 30 * oneDayMs);
    const intervalMs = periodMs / 7;
    const heights = [0, 0, 0, 0, 0, 0, 0];
    
    selectedViews.forEach(v => {
      const diff = now - v.timestamp;
      if (diff >= 0 && diff < periodMs) {
        const index = 6 - Math.floor(diff / intervalMs);
        if (index >= 0 && index < 7) {
          heights[index]++;
        }
      }
    });

    const maxCount = Math.max(...heights);
    if (maxCount === 0) {
      return [25, 40, 30, 45, 35, 50, 40]; // fallback active look
    }
    return heights.map(cnt => cnt === 0 ? 10 : Math.round((cnt / maxCount) * 85) + 15);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateSettings({
      razorpayKeyId: keyId.trim(),
      razorpayKeySecret: keySecret.trim(),
      razorpayWebhookSecret: webhookSecret.trim(),
      upiVpa: vpa,
      isLiveMode: isLive,
      adminPassword: adminPassword,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpSender
    });
    setSettingsSuccess(true);
    setTimeout(() => setSettingsSuccess(false), 3000);
  };

  const handleTestSmtpConnection = async () => {
    if (!smtpHost || !smtpUser || !smtpPass) {
      setSmtpTestStatus('error');
      setSmtpTestMessage('SMTP Host, Username, and Password fields cannot be empty for testing.');
      return;
    }
    setSmtpTestStatus('loading');
    setSmtpTestMessage('Verifying SMTP host and dispatching real test email...');
    try {
      const res = await fetch('/api/admin/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPass,
          smtpSender,
          testRecipient: user?.email || smtpUser
        })
      });
      const data = await res.json();
      if (data.success) {
        setSmtpTestStatus('success');
        setSmtpTestMessage(data.message || 'SMTP Connection Successful! Real test email sent.');
      } else {
        setSmtpTestStatus('error');
        setSmtpTestMessage(data.error || 'SMTP Connection failed.');
      }
    } catch (err: any) {
      setSmtpTestStatus('error');
      setSmtpTestMessage(err.message || 'SMTP Server Connection Error.');
    }
  };

  const handleCourseSelectForMail = (courseId: string) => {
    setSelectedCourseIdForMail(courseId);
    if (!selectedUserForMail) return;
    const course = courses.find(c => c.id === courseId);
    if (course) {
      setMailSubject(`New Premium Course Released: "${course.title}"! 🎓`);
      setMailBody(`Hi ${selectedUserForMail.fullName || 'Learner'},\n\nWe are absolutely thrilled to present our newest premium masterclass on The New Tips platform!\n\nCourse Title: "${course.title}"\nSpecial Enrollment Fee: ₹${course.price}\n\nThis syllabus has been carefully curated with HD video modules and companion PDF handbooks to guide you step-by-step.\n\nLogin to your account and enroll today to start learning!\n\nBest regards,\nThe New Tips Team`);
    } else {
      setMailSubject('');
      setMailBody('');
    }
  };

  const handleCourseSelectForSms = (courseId: string) => {
    setSelectedCourseIdForSms(courseId);
    if (!selectedUserForSms) return;
    const course = courses.find(c => c.id === courseId);
    if (course) {
      setSmsText(`Hi ${selectedUserForSms.fullName || 'Learner'}, "${course.title}" is now LIVE! Enroll today at just ₹${course.price}. Start learning: https://thenewtips.com`);
    } else {
      setSmsText('');
    }
  };

  const handleSendMailAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForMail || !mailSubject || !mailBody) return;
    try {
      const { db, doc, setDoc } = await import('../lib/firebase');
      const emailId = 'email_manual_' + Date.now();
      const courseObj = courses.find(c => c.id === selectedCourseIdForMail);
      const newEmail: EmailNotification = {
        id: emailId,
        transactionId: 'DIRECT_MARKETING',
        recipientEmail: selectedUserForMail.email,
        studentName: selectedUserForMail.fullName || 'Student',
        courseTitle: courseObj ? courseObj.title : 'Premium Release Guide',
        type: 'NEW_COURSE',
        subject: mailSubject,
        body: mailBody,
        status: 'SENT',
        timestamp: Date.now()
      };
      await setDoc(doc(db, 'email_notifications', emailId), newEmail);
      setSelectedUserForMail(null);
      setVerifyStatus('Live Email notification dispatched successfully to ' + selectedUserForMail.fullName);
      setTimeout(() => setVerifyStatus(''), 4000);
    } catch (err: any) {
      alert('Failed to send email: ' + (err.message || String(err)));
    }
  };

  const handleSendSmsAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForSms || !smsText) return;
    try {
      const { db, doc, setDoc } = await import('../lib/firebase');
      const smsId = 'sms_' + Date.now();
      const newSms = {
        id: smsId,
        recipientPhoneOrEmail: selectedUserForSms.email,
        studentName: selectedUserForSms.fullName || 'Student',
        message: smsText,
        status: 'SENT',
        gateway: 'Fast2SMS SMS-Gateway Sandbox',
        timestamp: Date.now()
      };
      await setDoc(doc(db, 'sms_notifications', smsId), newSms);
      setSelectedUserForSms(null);
      setVerifyStatus('Live simulated SMS Alert dispatched successfully to ' + selectedUserForSms.fullName);
      setTimeout(() => setVerifyStatus(''), 4000);
    } catch (err: any) {
      alert('Failed to send SMS: ' + (err.message || String(err)));
    }
  };

  const handleOpenAddCourse = () => {
    setEditingCourseId(null);
    setModalError(null);
    setCTitle('');
    setCDesc('');
    setCPrice(199);
    setCOriginalPrice(1999);
    setCThumbnail('https://images.unsplash.com/photo-1547082299-de196ea013d6?q=80&w=600&auto=format&fit=crop');
    setCCategory('DEVELOPMENT');
    setCourseVideos([
      { title: 'Lecture 1: Introduction Masterclass', url: 'https://www.w3schools.com/html/mov_bbb.mp4' }
    ]);
    setFileTitle1('Cheat Sheet Quickstart.pdf');
    setFileSize1('2.4 MB');
    setFileUrl1('#');
    setAttachmentsList([
      { id: 'a1', name: 'Cheat Sheet Quickstart.pdf', url: '#', size: '2.4 MB' }
    ]);
    setShowCourseModal(true);
  };

  const handleOpenEditCourse = (course: Course) => {
    setEditingCourseId(course.id);
    setModalError(null);
    setCTitle(course.title);
    setCDesc(course.description);
    setCPrice(course.price);
    setCOriginalPrice(course.originalPrice);
    setCThumbnail(course.thumbnail);
    setCCategory(course.category);
    
    if (course.videos && course.videos.length > 0) {
      setCourseVideos(course.videos.map(v => ({ title: v.title, url: v.url, isVerified: v.isVerified })));
    } else {
      setCourseVideos([
        { title: 'Lecture 1: Introduction Masterclass', url: 'https://www.w3schools.com/html/mov_bbb.mp4' }
      ]);
    }

    if (course.attachments && course.attachments.length > 0) {
      setFileTitle1(course.attachments[0].name);
      setFileSize1(course.attachments[0].size);
      setFileUrl1(course.attachments[0].url || '#');
      setAttachmentsList(course.attachments);
    } else {
      setFileTitle1('Cheat Sheet Quickstart.pdf');
      setFileSize1('2.4 MB');
      setFileUrl1('#');
      setAttachmentsList([
        { id: 'a1', name: 'Cheat Sheet Quickstart.pdf', url: '#', size: '2.4 MB' }
      ]);
    }
    
    setShowCourseModal(true);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!cTitle.trim()) {
      setModalError(language === 'hi' ? 'कृपया कोर्स का शीर्षक दर्ज करें।' : 'Please enter a course title.');
      return;
    }
    if (!cDesc.trim()) {
      setModalError(language === 'hi' ? 'कृपया कोर्स का विवरण दर्ज करें।' : 'Please enter a course description.');
      return;
    }

    // Relaxed validation: only validate that video titles are entered
    for (const v of courseVideos) {
      if (!v.title.trim()) {
        setModalError(language === 'hi' ? 'कृपया सभी वीडियो के लिए एक शीर्षक दर्ज करें।' : 'Please enter a title for all videos.');
        return;
      }
    }

    // Validate attachment names if they are present
    for (const a of attachmentsList) {
      if (!a.name.trim()) {
        setModalError(language === 'hi' ? 'कृपया सभी अटैचमेंट के लिए एक नाम दर्ज करें।' : 'Please enter a name for all attachments.');
        return;
      }
    }

    try {
      const courseId = editingCourseId || 'course_' + Math.random().toString(36).substring(2, 11);
      const courseData: Course = {
        id: courseId,
        title: cTitle,
        description: cDesc,
        price: Number(cPrice),
        originalPrice: Number(cOriginalPrice),
        thumbnail: cThumbnail,
        category: cCategory,
        lecturesCount: courseVideos.length,
        filesCount: attachmentsList.length,
        videos: courseVideos.map((v, idx) => {
          const isUploaded = v.url && (v.url.startsWith('/uploads/') || v.url.startsWith('/api/telegram/') || v.url.startsWith('uploads/') || v.url.toLowerCase().includes('uploading'));
          return { 
            id: `v${idx + 1}`, 
            title: v.title, 
            url: v.url || '', 
            isVerified: isUploaded ? true : v.isVerified 
          };
        }),
        attachments: attachmentsList.map((a, idx) => {
          const isUploaded = a.url && (a.url.startsWith('/uploads/') || a.url.startsWith('/api/telegram/') || a.url.startsWith('uploads/') || a.url.toLowerCase().includes('uploading'));
          return {
            id: a.id || `a${idx + 1}`,
            name: a.name,
            url: a.url || '',
            size: a.size || '1.5 MB',
            isVerified: isUploaded ? true : a.isVerified
          };
        }),
        createdAt: Date.now(), 
        status: 'published'
      };

      if (editingCourseId) {
        await onUpdateCourse(editingCourseId, courseData);
      } else {
        await onAddCourse(courseData);
        // Track the newly created course ID in state and ref so background uploads can update it on completion!
        setEditingCourseId(courseId);
      }
      
      setShowCourseModal(false);
      setVerifyStatus(language === 'hi' ? 'कोर्स सफलतापूर्वक सहेज लिया गया है।' : 'Course saved successfully.');
      setTimeout(() => setVerifyStatus(''), 4000);
    } catch (err: any) {
      setModalError(err.message || String(err));
    }
  };

  const navItems = [
    { id: 'overview', label: t.dashboard, icon: LayoutDashboard },
    { id: 'courses', label: t.courses, icon: BookOpen },
    { id: 'health_check', label: 'Link Health Check', icon: ShieldAlert, color: 'text-rose-600' },
    { id: 'ai_courses', label: 'AI Generator', icon: Bot, color: 'text-emerald-600' },
    { id: 'ai_api_work', label: 'AI API Monitor', icon: Cpu, color: 'text-indigo-600' },
    { id: 'ledger', label: t.transactions, icon: List },
    { id: 'emails', label: 'Emails Log', icon: Mail, color: 'text-sky-600' },
    { id: 'users', label: 'Users & Leads', icon: Users, color: 'text-violet-600' },
    { id: 'settings', label: t.settings, icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans" id="admin-portal-root">
      {/* Sidebar - Desktop */}
      <aside className="w-72 bg-white border-r border-slate-200 flex-col hidden lg:flex sticky top-0 h-screen overflow-y-auto scrollbar-none" id="admin-sidebar">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Admin Portal</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Creator Management</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 group ${
                  activeTab === item.id 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10' 
                    : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <item.icon className={`w-4 h-4 ${activeTab === item.id ? 'text-white' : item.color || 'text-slate-400 group-hover:text-slate-900'}`} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-8 pt-4 border-t border-slate-200 bg-[#0e0e11]">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 font-black">
              {adminDisplayName?.charAt(0) || 'A'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-[11px] font-black text-slate-900 uppercase truncate">{adminDisplayName}</p>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Verified Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0" id="admin-main-content">
        {/* Mobile Navigation Header */}
        <div className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center gap-2 overflow-x-auto scrollbar-none sticky top-0 z-50">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                activeTab === item.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10' 
                  : 'text-slate-400 bg-slate-50'
              }`}
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </button>
          ))}
        </div>

        <div className="max-w-6xl mx-auto p-6 lg:p-10 space-y-8">
          
          {/* Security Banner */}
          {(settings.adminPassword === '@#$sitaram12@#$' || adminPassword === '@#$sitaram12@#$') && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-center gap-6" id="security-banner">
              <div className="flex items-center gap-4 text-center md:text-left">
                <div className="w-14 h-14 bg-red-500/20 rounded-2xl flex items-center justify-center text-red-500 animate-pulse shrink-0 mx-auto md:mx-0">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Critical Security Risk Detected</h4>
                  <p className="text-xs text-slate-400 font-medium mt-1">आप डिफ़ॉल्ट पासवर्ड का उपयोग कर रहे हैं। कृपया इसे तुरंत सेटिंग्स में जाकर बदलें।</p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('settings')}
                className="px-8 py-3 bg-red-600 hover:bg-red-500 text-slate-900 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-red-600/20"
              >
                Change Now
              </button>
            </div>
          )}

      {/* Top Banner Hero Area */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 text-slate-900 relative overflow-hidden shadow-2xl border border-slate-200" id="admin-header-panel">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-widest px-3.5 py-1.5 rounded-full border border-indigo-500/30">
              Creator Administrator Portal
            </span>
            <h2 className="text-3xl font-black tracking-tight" id="admin-welcome-headline">
              Welcome, <span className="text-amber-600">{adminDisplayName}</span>
            </h2>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
              Manage your courses, track student audit logs, and configure payment APIs instantly.
            </p>
          </div>
        </div>
      </div>

      {/* Overview Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700" id="overview-content">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">Executive Dashboard</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Real-time platform insights and financial performance.</p>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2 rounded-2xl">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Sync Active</span>
            </div>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" id="metrics-grid">
            {[
              { label: 'Total Revenue', value: `₹${totalSales}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
              { label: 'Active Students', value: enrolledStudents, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-500/10' },
              { label: 'Pending Approvals', value: pendingCount, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-500/10' },
              { label: 'Courses Live', value: courses.length, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-500/10' },
            ].map((stat, i) => (
              <div key={i} className="bg-white border border-slate-200 p-8 rounded-[2rem] hover:border-slate-300 transition-all group relative overflow-hidden">
                <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{stat.label}</p>
                <p className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</p>
                <div className={`absolute -right-4 -bottom-4 w-24 h-24 ${stat.bg} rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity`}></div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[2rem] p-8 lg:p-10 space-y-8">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Traffic & Engagement Pulse</h3>
                <div className="flex bg-slate-50 p-1 rounded-xl">
                  {(['24h', '7d', '30d'] as const).map(p => (
                    <button 
                      key={p} 
                      onClick={() => setAnalyticsPeriod(p)}
                      className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${analyticsPeriod === p ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10' : 'text-slate-400 hover:text-slate-900'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-6">
                {[
                  { label: 'Unique Visitors', value: selectedUnique, sub: `${selectedViews.length} hits` },
                  { label: 'Course Views', value: selectedViews.length, sub: 'Product catalog' },
                  { label: 'Conversion Rate', value: selectedUnique > 0 ? `${Math.round((enrolledStudents / selectedUnique) * 100)}%` : '0%', sub: 'Avg estimation' },
                ].map((m, i) => (
                  <div key={i} className="space-y-1">
                    <p className="text-2xl font-black text-slate-900">{m.value}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{m.label}</p>
                    <p className="text-[9px] text-slate-600 font-bold uppercase">{m.sub}</p>
                  </div>
                ))}
              </div>

              {/* Minimalist chart representation */}
              <div className="pt-8 h-48 flex items-end justify-between gap-2 px-2">
                {getDynamicChartHeights().map((h, i) => (
                  <div key={i} className="flex-1 bg-slate-50 rounded-t-xl relative group overflow-hidden h-full flex items-end">
                    <div 
                      className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-xl transition-all duration-1000 ease-out shadow-lg shadow-indigo-600/10" 
                      style={{ height: `${h}%` }}
                    ></div>
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[2rem] p-8 lg:p-10 text-white relative overflow-hidden shadow-2xl flex flex-col justify-between group ${isAuditing || aiAuditReport ? 'lg:col-span-3' : ''}`}>
              <div className="relative z-10 space-y-6">
                <div className="flex justify-between items-start">
                  <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20 group-hover:rotate-12 transition-transform">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  {isAuditing && (
                    <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-md">
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-white animate-pulse">Running</span>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tight">AI Platform Audit</h3>
                  {!aiAuditReport && !isAuditing && (
                    <p className="text-xs font-medium text-indigo-100/80 mt-3 leading-relaxed">Execute a comprehensive deep-scan of your platform features, database integrity, and conversion optimization rules powered by Gemini.</p>
                  )}
                </div>
              </div>

              {!aiAuditReport && !isAuditing && (
                <button 
                  onClick={runAiAudit}
                  className="relative z-10 w-full py-4 mt-6 bg-white text-indigo-700 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all active:scale-95 shadow-xl shadow-black/10"
                >
                  Launch Smart Auditor
                </button>
              )}

              {/* Progress & Results */}
              <div className="relative z-10 mt-6">
                {isAuditing && (
                  <div className="space-y-4">
                    <p className="text-xs font-bold text-indigo-200 uppercase tracking-widest animate-pulse">{auditStep}</p>
                    <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-white w-1/2 rounded-full animate-bounce" style={{ animationDuration: '2s' }}></div>
                    </div>
                  </div>
                )}
                {auditError && (
                  <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-xl text-xs font-bold text-red-200">
                    {auditError}
                  </div>
                )}
                {aiAuditReport && (
                  <div className="prose prose-sm prose-slate max-w-none prose-p:leading-relaxed prose-headings:text-slate-900 prose-a:text-indigo-300">
                    <div className="markdown-body">
                      <Markdown>{aiAuditReport}</Markdown>
                    </div>
                    <button 
                      onClick={() => setAiAuditReport('')}
                      className="mt-8 px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      Close Report
                    </button>
                  </div>
                )}
              </div>
              
              <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-slate-100 rounded-full blur-3xl group-hover:scale-125 transition-transform pointer-events-none"></div>
            </div>
          </div>
        </div>
      )}

      {/* Courses Tab Content */}
      {activeTab === 'courses' && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700" id="courses-content">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">Product Catalog</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Manage your premium courses and digital downloads.</p>
            </div>
            <button
              onClick={handleOpenAddCourse}
              className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[11px] uppercase tracking-widest py-4 px-8 rounded-2xl shadow-xl shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
              id="add-course-btn"
            >
              <Plus className="w-4 h-4" /> New Product
            </button>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {courses.map((course) => (
              <div key={course.id} className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden group hover:border-indigo-500/30 transition-all duration-500 shadow-2xl flex flex-col">
                <div className="aspect-video relative overflow-hidden">
                  <img src={course.thumbnail} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-transparent to-transparent opacity-80"></div>
                  <div className="absolute top-4 right-4">
                    <span className="px-3 py-1.5 bg-slate-900/40 backdrop-blur-md border border-slate-300 rounded-xl text-[9px] font-black text-slate-900 uppercase tracking-widest">
                      {course.category}
                    </span>
                  </div>
                </div>
                
                <div className="p-8 flex-1 flex flex-col justify-between space-y-6">
                  <div>
                    <h4 className="text-lg font-black text-slate-900 uppercase leading-tight line-clamp-2 group-hover:text-indigo-600 transition-colors">{course.title}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">ID: {course.id}</p>
                  </div>

                  <div className="space-y-6">
                    <div className="flex justify-between items-center text-slate-400 text-[10px] font-black uppercase tracking-widest bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <div className="flex items-center gap-2"><Play className="w-3.5 h-3.5 text-indigo-500" /> {course.videos?.length || 0} Lectures</div>
                      <div className="text-slate-900 text-lg">₹{course.price}</div>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleOpenEditCourse(course)} 
                        className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-200 flex items-center justify-center gap-2"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      {deleteConfirmId === course.id ? (
                        <div className="flex-[1.5] flex gap-1">
                           <button onClick={async () => { await onDeleteCourse(course.id); setDeleteConfirmId(null); }} className="flex-1 py-3 bg-red-600 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest">Confirm</button>
                           <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-3 bg-slate-200 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest">No</button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setDeleteConfirmId(course.id)} 
                          className="px-4 py-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-slate-900 rounded-xl transition-all border border-red-500/10 flex items-center justify-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ledger Tab Content */}
      {activeTab === 'ledger' && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700" id="ledger-content">
          <header>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Transaction Ledger</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Verified payment history and enrollment logs.</p>
          </header>

          <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-2xl" id="ledger-table-container">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" id="ledger-table">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-slate-200">
                    <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student / Course</th>
                    <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                    <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reference ID</th>
                    <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="group hover:bg-white/[0.01] transition-colors">
                      <td className="p-8">
                        <div className="space-y-1">
                          <p className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{tx.studentEmail}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest line-clamp-1">{tx.courseTitle}</p>
                        </div>
                      </td>
                      <td className="p-8">
                        <span className="text-lg font-black text-slate-900">₹{tx.amount}</span>
                      </td>
                      <td className="p-8">
                        <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200 uppercase tracking-wider">{tx.refUtrId}</span>
                      </td>
                      <td className="p-8">
                        <span className={`text-[9px] font-black px-3 py-1 rounded-full border uppercase tracking-widest ${
                          tx.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                          tx.status === 'PENDING' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                          'bg-red-500/10 text-red-600 border-red-500/20'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="p-8 text-right">
                        <div className="flex justify-end gap-2">
                          {tx.status !== 'SUCCESS' && (
                            <button onClick={() => onVerifyTransaction(tx.id)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-600/10">Approve</button>
                          )}
                          <button onClick={() => onDeleteTransaction(tx.id)} className="p-2.5 bg-slate-50 hover:bg-red-600 text-slate-400 hover:text-slate-900 rounded-xl transition-all border border-slate-200"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Gateway Settings Tab Content */}
      {activeTab === 'settings' && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700" id="settings-content">
          <header>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">System Settings</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Configure gateway protocols and secure authentication.</p>
          </header>

          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 lg:p-12 shadow-2xl max-w-4xl" id="settings-form-container">
            {settingsSuccess && (
              <div className="mb-10 p-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[11px] font-black uppercase tracking-widest rounded-2xl text-center flex items-center justify-center gap-3">
                <Check className="w-5 h-5" /> Gateway Configuration updated successfully
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Razorpay Key ID</label>
                  <input type="text" value={keyId} onChange={(e) => setKeyId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 transition-all outline-none" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Razorpay Key Secret</label>
                  <input type="password" value={keySecret} onChange={(e) => setKeySecret(e.target.value)} className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 transition-all outline-none" />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Razorpay Webhook Secret</label>
                <input 
                  type="password" 
                  placeholder="e.g. your_razorpay_webhook_secret_here" 
                  value={webhookSecret} 
                  onChange={(e) => setWebhookSecret(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 transition-all outline-none" 
                />
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 mt-2">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                    🔗 Recommended Webhook URL (HTTPS):
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="text-indigo-600 lowercase bg-indigo-50/50 px-2.5 py-1.5 rounded-lg font-mono text-xs select-all break-all flex-1 border border-indigo-100/30">
                      {typeof window !== 'undefined' ? `${window.location.origin}/api/checkout/webhook` : 'https://<your-domain>/api/checkout/webhook'}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        const url = typeof window !== 'undefined' ? `${window.location.origin}/api/checkout/webhook` : '';
                        if (url) {
                          navigator.clipboard.writeText(url);
                          alert("Webhook URL copied to clipboard!");
                        }
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all shadow-sm active:scale-95"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight leading-relaxed">
                    * Set this HTTPS URL in your Razorpay Dashboard under **Settings &gt; Webhooks** with events: <code className="text-slate-600 lowercase">payment.captured</code> and <code className="text-slate-600 lowercase">order.paid</code>. This guarantees 100% automated real-time enrollment fulfillment even if students close the page.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Merchant UPI Address (VPA)</label>
                <input type="text" value={vpa} onChange={(e) => setVpa(e.target.value)} className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-2xl py-4 px-6 text-sm font-black text-indigo-600 font-mono transition-all outline-none" />
                <p className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">* Encoded directly into student-facing QR scanners.</p>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Platform Access Password</label>
                <div className="relative">
                  <input type="text" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} className={`w-full bg-slate-50 border rounded-2xl py-4 px-6 text-sm font-black font-mono transition-all outline-none ${adminPassword === '@#$sitaram12@#$' ? 'border-red-500/50 text-red-600' : 'border-slate-200 focus:border-indigo-500 text-slate-900'}`} />
                  {adminPassword === '@#$sitaram12@#$' && <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-red-500 uppercase">Warning: Default Insecure</span>}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-8 space-y-6">
                <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">SMTP Gmail & Email Configuration</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Configure your real SMTP credentials (e.g. Gmail App Password) to dispatch physical emails to students in real-time.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">SMTP Host</label>
                    <input 
                      type="text" 
                      placeholder="smtp.gmail.com" 
                      value={smtpHost} 
                      onChange={(e) => setSmtpHost(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-2xl py-3.5 px-5 text-xs font-bold text-slate-900 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">SMTP Port</label>
                    <input 
                      type="text" 
                      placeholder="465 (SSL) or 587 (TLS)" 
                      value={smtpPort} 
                      onChange={(e) => setSmtpPort(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-2xl py-3.5 px-5 text-xs font-bold text-slate-900 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Sender Identity</label>
                    <input 
                      type="text" 
                      placeholder="The New Tips &lt;noreply@thenewtips.com&gt;" 
                      value={smtpSender} 
                      onChange={(e) => setSmtpSender(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-2xl py-3.5 px-5 text-xs font-bold text-slate-900 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">SMTP Username (Gmail Address)</label>
                    <input 
                      type="text" 
                      placeholder="yourname@gmail.com" 
                      value={smtpUser} 
                      onChange={(e) => setSmtpUser(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-2xl py-3.5 px-5 text-xs font-bold text-slate-900 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">SMTP Password (Gmail App Password)</label>
                      <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-[9px] font-black text-indigo-600 uppercase hover:underline">Get App Password ↗</a>
                    </div>
                    <input 
                      type="password" 
                      placeholder="•••• •••• •••• ••••" 
                      value={smtpPass} 
                      onChange={(e) => setSmtpPass(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-2xl py-3.5 px-5 text-xs font-bold text-slate-900 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 mt-4">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">SMTP Connection Test</span>
                    <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">Send a physical verification email to confirm credentials are live.</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={handleTestSmtpConnection}
                    disabled={smtpTestStatus === 'loading'}
                    className="px-5 py-2.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white disabled:bg-slate-100 disabled:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm"
                  >
                    {smtpTestStatus === 'loading' ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>

                {smtpTestStatus !== 'idle' && (
                  <div className={`p-4 rounded-xl text-xs font-bold font-mono border mt-2 ${smtpTestStatus === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : (smtpTestStatus === 'loading' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-rose-50 border-rose-200 text-rose-800')}`}>
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${smtpTestStatus === 'loading' ? 'animate-pulse bg-amber-500' : (smtpTestStatus === 'success' ? 'bg-emerald-500' : 'bg-rose-500')}`}></span>
                      <span>{smtpTestMessage}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Payment API Mode</label>
                <div className="flex bg-slate-50 p-2 rounded-[1.5rem] border border-slate-200 max-w-sm">
                  {[
                    { label: 'API Test', val: false },
                    { label: 'API Live', val: true }
                  ].map(m => (
                    <button key={m.label} type="button" onClick={() => setIsLive(m.val)} className={`flex-1 py-3 rounded-[1rem] text-[10px] font-black uppercase tracking-widest transition-all ${isLive === m.val ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-900'}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className="w-full py-5 bg-white text-indigo-700 hover:bg-indigo-50 rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-2xl shadow-black/10">Save API Settings</button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700" id="users-content">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">Registered Users & Leads</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">View real-time user login credentials, monitor active registrations, and dispatch personalized Emails & SMS alerts.</p>
            </div>
          </header>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 flex items-center gap-5 shadow-sm">
              <div className="w-14 h-14 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center">
                <Users className="w-7 h-7" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">{appUsers.length}</p>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Total Registered Accounts</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 flex items-center gap-5 shadow-sm">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center animate-pulse">
                <Activity className="w-7 h-7" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">
                  {appUsers.filter(u => u.createdAt && new Date(u.createdAt).toDateString() === new Date().toDateString()).length}
                </p>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Registered Users Today</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 flex items-center gap-5 shadow-sm">
              <div className="w-14 h-14 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center">
                <Mail className="w-7 h-7" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">
                  {emails.length + smsLogs.length}
                </p>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Broadcast Actions Logged</p>
              </div>
            </div>
          </div>

          {/* Search bar & Live table */}
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 lg:p-10 shadow-2xl space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-6">
              <div>
                <h3 className="text-lg font-black text-slate-900">User Login Credentials</h3>
                <p className="text-xs text-slate-400 font-bold uppercase mt-1">Live from Cloud Firestore</p>
              </div>
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-4.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Search by Name or Email..." 
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-2xl pl-11 pr-5 py-3 text-xs font-bold text-slate-900 outline-none transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {appUsers.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto border border-slate-200">
                  <Users className="w-8 h-8" />
                </div>
                <p className="text-sm font-black text-slate-900 uppercase">No users found</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">Users who register on your homepage or login with email/phone will automatically appear here in real-time.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student</th>
                      <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Login / Contact</th>
                      <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Password</th>
                      <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Signed Up Date</th>
                      <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Admin Role</th>
                      <th className="py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions & Marketing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {appUsers.filter(u => {
                      const q = userSearchQuery.toLowerCase();
                      return (
                        (u.fullName || '').toLowerCase().includes(q) ||
                        (u.email || '').toLowerCase().includes(q)
                      );
                    }).map((usr) => {
                      const showPass = !!userPasswordVisible[usr.id];
                      return (
                        <tr key={usr.id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 pr-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-sm uppercase">
                                {(usr.fullName || usr.email || 'S').charAt(0)}
                              </div>
                              <div>
                                <div className="font-black text-slate-900">{usr.fullName || 'Student'}</div>
                                {usr.isAdmin && <span className="inline-block bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[8px] font-black uppercase">Admin</span>}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 pr-4">
                            <div className="text-xs font-mono font-bold text-slate-700">{usr.email}</div>
                          </td>
                          <td className="py-4 pr-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                                {showPass ? usr.password || 'N/A' : '••••••••'}
                              </span>
                              <button 
                                onClick={() => setUserPasswordVisible(prev => ({ ...prev, [usr.id]: !prev[usr.id] }))}
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900 transition-colors"
                                title={showPass ? "Hide Password" : "Show Password"}
                              >
                                {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                          <td className="py-4 pr-4 text-xs font-bold text-slate-400 uppercase">
                            {usr.createdAt ? new Date(usr.createdAt).toLocaleString() : 'N/A'}
                          </td>
                          <td className="py-4 pr-4">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${usr.isAdmin ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>
                              {usr.isAdmin ? 'Full Admin' : 'Student Lead'}
                            </span>
                          </td>
                          <td className="py-4 text-right space-x-2">
                            <button 
                              onClick={() => {
                                setSelectedUserForMail(usr);
                                setSelectedCourseIdForMail('');
                                setMailSubject('');
                                setMailBody('');
                              }}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              Mail
                            </button>
                            <button 
                              onClick={() => {
                                setSelectedUserForSms(usr);
                                setSelectedCourseIdForSms('');
                                setSmsText('');
                              }}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-violet-50 hover:bg-violet-600 text-violet-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                            >
                              <Smartphone className="w-3.5 h-3.5" />
                              SMS Alert
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SMS logs list for the sandbox dispatch verification */}
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 lg:p-10 shadow-2xl space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900">Simulated SMS Broadcast Log</h3>
              <p className="text-xs text-slate-400 font-bold uppercase mt-1">Gateway Logs generated in real-time</p>
            </div>

            {smsLogs.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 font-bold uppercase tracking-wider">
                No SMS dispatches logged yet. Try sending an SMS alert to a registered user above!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Recipient</th>
                      <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Message Text</th>
                      <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Gateway Provider</th>
                      <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Dispatched Timestamp</th>
                      <th className="py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {smsLogs.map((log) => (
                      <tr key={log.id} className="text-xs font-bold text-slate-600">
                        <td className="py-4 pr-4">
                          <div className="font-black text-slate-900">{log.studentName || 'Student'}</div>
                          <div className="font-mono text-[10px] text-slate-400">{log.recipientPhoneOrEmail}</div>
                        </td>
                        <td className="py-4 pr-4 max-w-sm text-slate-700">{log.message}</td>
                        <td className="py-4 pr-4 font-mono text-[10px] text-indigo-600 uppercase">{log.gateway}</td>
                        <td className="py-4 pr-4 text-slate-400 uppercase">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="py-4 text-right">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[9px] font-black uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                            {log.status || 'SENT'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Email dispatch Modal */}
          {selectedUserForMail && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
              <div className="bg-white w-full max-w-2xl rounded-[2.5rem] p-8 md:p-10 shadow-2xl space-y-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center border-b border-slate-100 pb-5">
                  <div>
                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full uppercase tracking-widest">Email Campaign Portal</span>
                    <h3 className="text-2xl font-black text-slate-900 mt-2">Send Mail to {selectedUserForMail.fullName || 'Student'}</h3>
                  </div>
                  <button 
                    onClick={() => setSelectedUserForMail(null)}
                    className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSendMailAction} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Autofill Template for Course</label>
                    <select 
                      value={selectedCourseIdForMail} 
                      onChange={(e) => handleCourseSelectForMail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-2xl p-4 text-xs font-bold text-slate-900 outline-none"
                    >
                      <option value="">-- Choose Course to Prefill Campaign Template --</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.title} (₹{c.price})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Recipient Mail / Phone Identifier</label>
                    <input 
                      type="text" 
                      value={selectedUserForMail.email}
                      disabled
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-400 outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Email Subject</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Special Offer: 50% Off on our React syllabus!"
                      value={mailSubject}
                      onChange={(e) => setMailSubject(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-2xl p-4 text-xs font-bold text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Message Body</label>
                    <textarea 
                      rows={6}
                      placeholder="Write your email body copy..."
                      value={mailBody}
                      onChange={(e) => setMailBody(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-2xl p-4 text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-4.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/15"
                  >
                    Send Live SMTP Email Trigger
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* SMS dispatch Modal */}
          {selectedUserForSms && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
              <div className="bg-white w-full max-w-xl rounded-[2.5rem] p-8 md:p-10 shadow-2xl space-y-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center border-b border-slate-100 pb-5">
                  <div>
                    <span className="text-[10px] font-black text-violet-600 bg-violet-50 border border-violet-100 px-3 py-1 rounded-full uppercase tracking-widest">SMS Campaign Portal</span>
                    <h3 className="text-2xl font-black text-slate-900 mt-2">Send SMS Alert to {selectedUserForSms.fullName || 'Student'}</h3>
                  </div>
                  <button 
                    onClick={() => setSelectedUserForSms(null)}
                    className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSendSmsAction} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Autofill Template for Course</label>
                    <select 
                      value={selectedCourseIdForSms} 
                      onChange={(e) => handleCourseSelectForSms(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-2xl p-4 text-xs font-bold text-slate-900 outline-none"
                    >
                      <option value="">-- Choose Course to Prefill SMS Template --</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.title} (₹{c.price})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Recipient Number / Contact Identifier</label>
                    <input 
                      type="text" 
                      value={selectedUserForSms.email}
                      disabled
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-400 outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">SMS Text (Live Sandbox)</label>
                      <span className="text-[10px] font-black text-slate-400">{smsText.length} / 160 chars</span>
                    </div>
                    <textarea 
                      rows={4}
                      placeholder="Type SMS text body here..."
                      value={smsText}
                      onChange={(e) => setSmsText(e.target.value)}
                      required
                      maxLength={160}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-2xl p-4 text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400 font-mono"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-4.5 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-violet-600/15"
                  >
                    Send Live Fast2SMS Dispatch Alert
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'emails' && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700" id="emails-content">
          <header>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Emails Notification Log</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Simulated live SMTP cloud triggers notifying students on registration, checkout, or syllabus releases.</p>
          </header>

          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 lg:p-10 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-6">
              <div>
                <h3 className="text-lg font-black text-slate-900">Triggered Transmissions</h3>
                <p className="text-xs text-slate-400 font-bold uppercase mt-1">Total Sent: {emails.length}</p>
              </div>
            </div>

            {emails.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto border border-slate-200">
                  <Mail className="w-8 h-8" />
                </div>
                <p className="text-sm font-black text-slate-900 uppercase">No emails sent yet</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">Emails will appear here automatically in real-time when new courses are published or student transactions transition status.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Recipient</th>
                      <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                      <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject</th>
                      <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date / Time</th>
                      <th className="py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {emails.map((email) => (
                      <tr key={email.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 pr-4">
                          <div className="font-bold text-slate-900">{email.studentName || 'Student'}</div>
                          <div className="text-xs font-mono text-slate-400">{email.recipientEmail}</div>
                        </td>
                        <td className="py-4 pr-4">
                          <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            email.type === 'WELCOME' ? 'bg-violet-100 text-violet-700' : 
                            email.type === 'VERIFICATION' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-sky-100 text-sky-700'
                          }`}>
                            {email.type}
                          </span>
                        </td>
                        <td className="py-4 pr-4 max-w-xs truncate text-sm font-bold text-slate-700">
                          {email.subject}
                        </td>
                        <td className="py-4 pr-4">
                          {email.dispatched ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[9px] font-black uppercase tracking-wider">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              SMTP Sent
                            </span>
                          ) : email.smtpError ? (
                            <span className="inline-flex flex-col items-start gap-1" title={email.smtpError}>
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full text-[9px] font-black uppercase tracking-wider">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                SMTP Failed
                              </span>
                              <span className="text-[8px] font-mono font-semibold text-rose-500 max-w-[120px] truncate">{email.smtpError}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[9px] font-black uppercase tracking-wider">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                              Simulated
                            </span>
                          )}
                        </td>
                        <td className="py-4 pr-4 text-xs font-bold text-slate-400 uppercase">
                          {new Date(email.timestamp).toLocaleString()}
                        </td>
                        <td className="py-4 text-right">
                          <button 
                            onClick={() => setSelectedEmail(email)}
                            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                          >
                            View Preview
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Simulated Email Modal Viewer */}
          {selectedEmail && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
              <div className="bg-slate-100 w-full max-w-3xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col h-[85vh] animate-in zoom-in-95 duration-300 border border-slate-200">
                {/* Email Window Header */}
                <header className="bg-white px-8 py-5 flex justify-between items-center border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Simulated SMTP Sandbox Viewer</h3>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Transmission Status: SENT ✅</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedEmail(null)}
                    className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-900 transition-all font-bold text-xs uppercase"
                  >
                    Close Viewer
                  </button>
                </header>

                {/* Email Technical Headers Info */}
                <div className="bg-slate-50 border-b border-slate-200 px-8 py-4 space-y-1.5 text-xs">
                  <div className="flex"><span className="w-16 font-black text-slate-400 uppercase">From:</span> <span className="font-bold text-slate-700">The New Tips Admin &lt;noreply@thenewtips.com&gt;</span></div>
                  <div className="flex"><span className="w-16 font-black text-slate-400 uppercase">To:</span> <span className="font-bold text-slate-700">{selectedEmail.studentName || 'Student'} &lt;{selectedEmail.recipientEmail}&gt;</span></div>
                  <div className="flex"><span className="w-16 font-black text-slate-400 uppercase">Subject:</span> <span className="font-black text-indigo-600">{selectedEmail.subject}</span></div>
                  <div className="flex"><span className="w-16 font-black text-slate-400 uppercase">Date:</span> <span className="font-semibold text-slate-500">{new Date(selectedEmail.timestamp).toLocaleString()}</span></div>
                </div>

                {/* Email Body Iframe Sandboxed */}
                <div className="flex-1 bg-white p-6 relative">
                  <iframe 
                    title="Email Render"
                    srcDoc={getSimulatedEmailHTML(selectedEmail)} 
                    className="w-full h-full border-0 rounded-2xl"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'ai_courses' && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700" id="ai-courses-content">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <Brain className="w-8 h-8 text-emerald-600" /> Content Engine
              </h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Automated drafting of premium study material and curation.</p>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Control Panel */}
            <div className="lg:col-span-1 space-y-8">
              <div className="bg-white border border-emerald-500/20 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                <div className="relative space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Synthesis Mode</label>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">AI Publisher</h3>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="YouTube Link or Topic..."
                        value={aiGenerationTopic}
                        onChange={(e) => setAiGenerationTopic(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500/50 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 transition-all outline-none placeholder:text-slate-700"
                      />
                    </div>
                    
                    <button
                      onClick={() => runAiCourseGeneration()}
                      disabled={isGeneratingAICourse}
                      className={`w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-2xl ${
                        isGeneratingAICourse ? 'bg-slate-50 text-slate-600 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-slate-900 shadow-emerald-600/20 active:scale-95'
                      }`}
                    >
                      {isGeneratingAICourse ? <div className="w-4 h-4 border-2 border-slate-300 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {isGeneratingAICourse ? 'Processing...' : 'Start Synthesis'}
                    </button>
                  </div>

                  <div className="space-y-3 pt-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quick Templates</p>
                    <div className="flex flex-wrap gap-2">
                      {["Ethical Hacking", "Python AI", "Web Dev", "Trading"].map(s => (
                        <button key={s} onClick={() => runAiCourseGeneration(s)} className="px-3 py-1.5 bg-slate-50 hover:bg-emerald-500/20 text-[9px] font-black text-slate-400 hover:text-emerald-600 rounded-lg border border-slate-200 transition-all">{s}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {aiGenErrorMsg && (
                <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-600 text-[10px] font-black uppercase tracking-widest text-center animate-shake">
                  {aiGenErrorMsg}
                </div>
              )}
            </div>

            {/* Logs / Output */}
            <div className="lg:col-span-2 space-y-8">
               <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-2xl">
                 <div className="p-8 border-b border-slate-200 flex justify-between items-center bg-white/[0.01]">
                   <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Active Curriculum Logs</h4>
                   <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-600 rounded-full uppercase tracking-widest">
                     {courses.filter(c => c.isAIGenerated || c.id.startsWith('course_ai_')).length} Generated
                   </span>
                 </div>

                 <div className="p-0 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white/[0.02] border-b border-slate-200">
                          <th className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Course Asset</th>
                          <th className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {courses.filter(c => c.isAIGenerated || c.id.startsWith('course_ai_')).length > 0 ? (
                          courses.filter(c => c.isAIGenerated || c.id.startsWith('course_ai_')).map((course) => (
                            <tr key={course.id} className="group hover:bg-white/[0.01] transition-colors">
                              <td className="p-6">
                                <div className="flex items-center gap-4">
                                  <img src={course.thumbnail} className="w-16 h-10 object-cover rounded-xl border border-slate-200" />
                                  <div>
                                    <p className="text-xs font-black text-slate-900 group-hover:text-emerald-600 transition-colors">{course.title}</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">₹{course.price}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-6 text-right">
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => handleOpenEditCourse(course)} className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-xl transition-all border border-slate-200"><Edit2 className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => onDeleteCourse(course.id)} className="p-2.5 bg-slate-50 hover:bg-red-600 text-slate-400 hover:text-slate-900 rounded-xl transition-all border border-slate-200"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan={2} className="p-10 text-center text-[10px] font-black text-slate-600 uppercase tracking-widest opacity-20">No active syntheses</td></tr>
                        )}
                      </tbody>
                    </table>
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Content Health Check Tab Content */}
      {activeTab === 'health_check' && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700" id="health-check-content">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <ShieldCheck className="w-8 h-8 text-rose-500" /> Platform Health
              </h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Verification of assets and infrastructure stability.</p>
              <div className="mt-3 flex items-center gap-2 text-xs bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full font-semibold w-fit">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                {language === 'hi' 
                  ? `ऑटो स्कैनिंग: ${Math.floor(nextScanSeconds / 60)} मिनट ${nextScanSeconds % 60} सेकंड में`
                  : `Next Auto Scan: ${Math.floor(nextScanSeconds / 60)}m ${nextScanSeconds % 60}s`}
              </div>
            </div>
            <div className="flex flex-wrap gap-4 w-full md:w-auto">
              <button onClick={runDatabaseReset} className="px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-slate-50 text-slate-400 hover:text-slate-900 transition-all border border-slate-200 flex items-center gap-2">
                <RotateCcw className="w-4 h-4" /> Reset DB
              </button>
              <button onClick={() => runMassVerification('all')} className="flex-1 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" /> Start Global Scan
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-6 shadow-2xl">
                <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl flex items-center justify-center">
                  <Activity className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Status Filter</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Isolated view of resource availability.</p>
                </div>

                <div className="flex flex-col gap-2">
                  {[
                    { id: 'all', label: 'Global Inventory', icon: Package },
                    { id: 'broken', label: 'Faulty Assets', icon: AlertTriangle, color: 'text-rose-500' },
                    { id: 'working', label: 'Validated Safe', icon: CheckCircle2, color: 'text-emerald-600' }
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setLinkFilterMode(filter.id as any)}
                      className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between group ${
                        linkFilterMode === filter.id 
                          ? 'bg-slate-50 border-slate-300 text-slate-900' 
                          : 'bg-transparent border-transparent text-slate-400 hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <filter.icon className={`w-4 h-4 ${filter.color || 'text-slate-400'}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{filter.label}</span>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${linkFilterMode === filter.id ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0'}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
               <div className="bg-white border border-slate-200 rounded-[2.5rem] p-12 text-center space-y-6 shadow-2xl min-h-[400px] flex flex-col justify-center">
                <div className="w-20 h-20 bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ScanSearch className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-wide leading-tight">Link Stability Audit</h3>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest max-w-lg mx-auto leading-relaxed">Execute a mass verification of all video resources and PDF curriculum links to ensure 100% student availability.</p>
                <div className="pt-6">
                   <button onClick={() => runMassVerification('broken-only')} className="px-8 py-4 bg-slate-50 hover:bg-slate-100 text-slate-900 border border-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all">Scan Broken Only</button>
                </div>
              </div>
            </div>
          </div>

          {verifyStatus && (
            <div className={`p-4 rounded-2xl text-[11px] font-black uppercase tracking-widest border flex items-center gap-3 ${
              verifyStatus.includes('विफल') || verifyStatus.includes('एरर') || verifyStatus.toLowerCase().includes('failed') || verifyStatus.toLowerCase().includes('error')
                ? 'bg-red-950/40 border-red-500/30 text-red-600'
                : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-600'
            }`}>
              <CheckCircle2 className="w-4 h-4" />
              {verifyStatus}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6" id="health-results-grid">
            {(() => {
              const filteredCoursesToShow = courses.filter((course) => {
                const aiResult = healthResults.find(r => r.id === course.id);
                const rawVideos = aiResult?.videos || course.videos || [];
                const rawAttachments = aiResult?.attachments || course.attachments || [];
                
                const totalBroken = [...rawVideos, ...rawAttachments].filter(l => l.isVerified === false).length;
                const totalWorking = [...rawVideos, ...rawAttachments].filter(l => l.isVerified === true).length;
                
                if (linkFilterMode === 'broken') {
                  return totalBroken > 0;
                }
                if (linkFilterMode === 'working') {
                  return totalBroken === 0 && totalWorking > 0;
                }
                return true;
              });

              if (filteredCoursesToShow.length === 0) {
                return (
                  <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-3" id="no-filtered-results-box">
                    <ShieldCheck className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      {linkFilterMode === 'broken' 
                        ? (language === 'hi' ? 'कोई भी टूटा हुआ लिंक नहीं मिला!' : 'No Broken Links Found!') 
                        : (language === 'hi' ? 'कोई चालू लिंक नहीं मिला!' : 'No Working Links Found!')}
                    </h4>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest max-w-md mx-auto">
                      {linkFilterMode === 'broken'
                        ? (language === 'hi' ? 'इस फ़िल्टर के अंतर्गत सभी कोर्सेस के लिंक्स बिल्कुल सही काम कर रहे हैं।' : 'All courses links under this filter are healthy and active.')
                        : (language === 'hi' ? 'कृपया सभी लिंक्स का स्टेटस जांचने के लिए वेरिफिकेशन चलाएं।' : 'Please run verification to check status.')}
                    </p>
                  </div>
                );
              }

              return filteredCoursesToShow.map((course) => {
                const aiResult = healthResults.find(r => r.id === course.id);
                const rawVideos = aiResult?.videos || course.videos || [];
                const rawAttachments = aiResult?.attachments || course.attachments || [];
                
                // Show the entire course's videos and attachments under the filtered course card as requested
                const videos = rawVideos;
                const attachments = rawAttachments;

                const totalLinks = rawVideos.length + rawAttachments.length;
                const brokenLinks = [...rawVideos, ...rawAttachments].filter(l => l.isVerified === false).length;
                const unverifiedLinks = [...rawVideos, ...rawAttachments].filter(l => l.isVerified === undefined).length;

                return (
                  <div key={course.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl hover:border-slate-300 transition-all">
                    <div className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/40 border-b border-slate-200">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-50 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                          <img src={course.thumbnail} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{course.title}</h4>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mr-1">
                              ID: {course.id}
                            </span>
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                              brokenLinks > 0 ? 'bg-red-500/10 text-red-600' : 'bg-emerald-500/10 text-emerald-600'
                            }`}>
                              {brokenLinks > 0 ? `${brokenLinks} Issues Found` : 'All Healthy'}
                            </span>
                            
                            <div className="flex gap-2 w-full sm:w-auto">
                              <button 
                                onClick={() => {
                                  const healthy = healthResults.find(r => r.id === course.id);
                                  setPreviewingCourse({
                                    ...course,
                                    videos: healthy?.videos || course.videos || [],
                                    attachments: healthy?.attachments || course.attachments || []
                                  });
                                }}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border border-slate-200 whitespace-nowrap"
                              >
                                <Eye className="w-3 h-3" /> Preview
                              </button>
                              
                              {brokenLinks > 0 && (
                                <button 
                                  onClick={() => handleFixAllLinks(course, rawVideos, rawAttachments)}
                                  disabled={isFixingAll === course.id}
                                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border whitespace-nowrap ${
                                    isFixingAll === course.id
                                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                      : 'bg-red-950/40 hover:bg-red-900/40 text-red-600 border-red-500/30 shadow-lg shadow-red-950/20'
                                  }`}
                                >
                                  {isFixingAll === course.id ? (
                                    <Clock className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Zap className="w-3 h-3" />
                                  )}
                                  Auto-Fix All
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-4">
                         <div className="text-right">
                           <span className="text-[10px] font-bold text-slate-400 uppercase block">Videos</span>
                           <span className="text-sm font-black text-slate-900">
                             {rawVideos.filter((v: any) => v.isVerified).length}/{rawVideos.length}
                           </span>
                         </div>
                         <div className="text-right border-l border-slate-300 pl-4">
                           <span className="text-[10px] font-bold text-slate-400 uppercase block">PDFs</span>
                           <span className="text-sm font-black text-slate-900">
                             {rawAttachments.filter((a: any) => a.isVerified).length}/{rawAttachments.length}
                           </span>
                         </div>
                      </div>
                    </div>

                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                          <Play className="w-3 h-3 text-emerald-600" /> Lectures Link Health {videos.length !== rawVideos.length && `(${videos.length}/${rawVideos.length})`}
                        </h5>
                        <div className="space-y-2">
                          {videos.length === 0 ? (
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest py-2">
                              {language === 'hi' ? 'कोई लिंक इस फ़िल्टर में नहीं है।' : 'No links under this filter.'}
                            </p>
                          ) : (
                            videos.map((v: any, idx: number) => {
                              // Find original index in rawVideos
                              const originalIdx = rawVideos.findIndex((rv: any) => rv.url === v.url && rv.title === v.title);
                              const actualIndex = originalIdx !== -1 ? originalIdx : idx;

                              return (
                                <div key={idx} className="flex items-center justify-between p-2 bg-white/60 rounded-xl border border-slate-200">
                                  <div className="flex flex-col truncate mr-2">
                                    <span className="text-[10px] font-bold text-slate-500 truncate max-w-[150px]">{v.title}</span>
                                    <span className="text-[8px] text-slate-400 truncate">{v.url}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                      v.isVerified === true ? 'bg-emerald-500/10 text-emerald-600' : 
                                      v.isVerified === false ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-600'
                                    }`}>
                                      {v.isVerified === true ? 'Working' : v.isVerified === false ? 'Broken' : 'Unverified'}
                                    </span>
                                    
                                    {/* Fix/Re-verify Button (Always shown) */}
                                    <button 
                                      onClick={() => v.isVerified === false 
                                        ? handleFixLink(course.id, course.title, 'video', actualIndex, v.title, v.url)
                                        : handleReverifyLink(course.id, 'video', actualIndex, v.url)}
                                      disabled={fixingIndex === `${course.id}-video-${actualIndex}`}
                                      className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${
                                        v.isVerified === false 
                                        ? 'bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-600' 
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-500'
                                      }`}
                                      title={v.isVerified === false ? "AI Fix Link" : "Re-verify Link"}
                                    >
                                      {fixingIndex === `${course.id}-video-${actualIndex}` ? <Clock className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                                    </button>

                                    <button
                                      onClick={() => setEditingManualFix(`${course.id}-video-${actualIndex}`)}
                                      className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors cursor-pointer"
                                      title="Manual Fix Link"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>

                                    <button
                                      onClick={() => handleValidateLink(course.id, 'video', actualIndex)}
                                      className="p-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors cursor-pointer"
                                      title="Validate as Safe"
                                    >
                                      <ShieldCheck className="w-3 h-3" />
                                    </button>


                                    <button 
                                      onClick={() => window.open(v.url, '_blank')}
                                      className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                                      title="Play Video"
                                    >
                                      <Play className="w-3 h-3 text-slate-900" />
                                    </button>
                                  </div>
                                  {editingManualFix === `${course.id}-video-${actualIndex}` && (
                                    <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50 border border-blue-200 rounded-xl w-full">
                                      <input 
                                        type="text" 
                                        value={manualUrls[`${course.id}-video-${actualIndex}`] || v.url}
                                        onChange={(e) => setManualUrls({...manualUrls, [`${course.id}-video-${actualIndex}`]: e.target.value})}
                                        className="flex-grow p-1.5 text-[10px] rounded-lg border border-blue-300"
                                      />
                                      <button 
                                        onClick={() => {
                                          handleManualFix(course.id, 'video', actualIndex, manualUrls[`${course.id}-video-${actualIndex}`] || v.url);
                                          setEditingManualFix(null);
                                        }}
                                        className="p-1.5 bg-blue-600 text-white rounded-lg text-[10px]"
                                      >
                                        Save
                                      </button>
                                      <button 
                                        onClick={() => setEditingManualFix(null)}
                                        className="p-1.5 bg-slate-200 text-slate-700 rounded-lg text-[10px]"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                          <FileText className="w-3 h-3 text-indigo-600" /> Study Guides Health {attachments.length !== rawAttachments.length && `(${attachments.length}/${rawAttachments.length})`}
                        </h5>
                        <div className="space-y-2">
                          {attachments.length === 0 ? (
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest py-2">
                              {language === 'hi' ? 'कोई लिंक इस फ़िल्टर में नहीं है।' : 'No links under this filter.'}
                            </p>
                          ) : (
                            attachments.map((a: any, idx: number) => {
                              // Find original index in rawAttachments
                              const originalIdx = rawAttachments.findIndex((ra: any) => ra.url === a.url && ra.name === a.name);
                              const actualIndex = originalIdx !== -1 ? originalIdx : idx;

                              return (
                                <div key={idx} className="flex items-center justify-between p-2 bg-white/60 rounded-xl border border-slate-200">
                                  <div className="flex flex-col truncate mr-2">
                                    <span className="text-[10px] font-bold text-slate-500 truncate max-w-[150px]">{a.name}</span>
                                    <span className="text-[8px] text-slate-400 truncate">{a.url}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                      a.isVerified === true ? 'bg-emerald-500/10 text-emerald-600' : 
                                      a.isVerified === false ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-600'
                                    }`}>
                                      {a.isVerified === true ? 'Working' : a.isVerified === false ? 'Broken' : 'Unverified'}
                                    </span>

                                    {/* Fix/Re-verify Button (Always shown) */}
                                    <button 
                                      onClick={() => a.isVerified === false 
                                        ? handleFixLink(course.id, course.title, 'attachment', actualIndex, a.name, a.url)
                                        : handleReverifyLink(course.id, 'attachment', actualIndex, a.url)}
                                      disabled={fixingIndex === `${course.id}-attachment-${actualIndex}`}
                                      className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${
                                        a.isVerified === false 
                                        ? 'bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-600' 
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-500'
                                      }`}
                                      title={a.isVerified === false ? "AI Fix PDF" : "Re-verify PDF"}
                                    >
                                      {fixingIndex === `${course.id}-attachment-${actualIndex}` ? <Clock className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                                    </button>

                                    <button
                                      onClick={() => setEditingManualFix(`${course.id}-attachment-${actualIndex}`)}
                                      className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors cursor-pointer"
                                      title="Manual Fix PDF"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>

                                    <button
                                      onClick={() => handleValidateLink(course.id, 'attachment', actualIndex)}
                                      className="p-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors cursor-pointer"
                                      title="Validate as Safe"
                                    >
                                      <ShieldCheck className="w-3 h-3" />
                                    </button>


                                    <button 
                                      onClick={() => window.open(a.url, '_blank')}
                                      className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                                      title="Open PDF"
                                    >
                                      <FileText className="w-3 h-3 text-slate-900" />
                                    </button>
                                  </div>
                                  {editingManualFix === `${course.id}-attachment-${actualIndex}` && (
                                    <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50 border border-blue-200 rounded-xl w-full">
                                      <input 
                                        type="text" 
                                        value={manualUrls[`${course.id}-attachment-${actualIndex}`] || a.url}
                                        onChange={(e) => setManualUrls({...manualUrls, [`${course.id}-attachment-${actualIndex}`]: e.target.value})}
                                        className="flex-grow p-1.5 text-[10px] rounded-lg border border-blue-300"
                                      />
                                      <button 
                                        onClick={() => {
                                          handleManualFix(course.id, 'attachment', actualIndex, manualUrls[`${course.id}-attachment-${actualIndex}`] || a.url);
                                          setEditingManualFix(null);
                                        }}
                                        className="p-1.5 bg-blue-600 text-white rounded-lg text-[10px]"
                                      >
                                        Save
                                      </button>
                                      <button 
                                        onClick={() => setEditingManualFix(null)}
                                        className="p-1.5 bg-slate-200 text-slate-700 rounded-lg text-[10px]"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* AI API Work & Key Monitor Tab */}
      {activeTab === 'ai_api_work' && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700" id="ai-api-monitor-content">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <Cpu className="w-8 h-8 text-indigo-600" /> AI API Monitor
              </h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Real-time status, usage quotas, reset countdowns, and triggers for administrative automations.</p>
            </div>
            <button onClick={fetchAiApiStatus} className="px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-slate-50 text-slate-400 hover:text-slate-900 transition-all border border-slate-200 flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 ${loadingAiKeys ? 'animate-spin' : ''}`} /> Refresh Live Status
            </button>
          </header>

          {aiMonitorError && (
            <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-4 animate-in zoom-in duration-300">
              <div className="p-3 bg-rose-500 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-black text-rose-900 uppercase tracking-tight">Monitor Sync Error</h4>
                <p className="text-xs text-rose-600 font-bold mt-0.5">{aiMonitorError}</p>
              </div>
              <button 
                onClick={fetchAiApiStatus}
                className="ml-auto px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Retry Sync
              </button>
            </div>
          )}

          {/* Daily Publisher System Master Card */}
          <div className="bg-[#0e0e11] border border-slate-800 p-8 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 pointer-events-none opacity-10 group-hover:opacity-20 transition-all duration-300">
              <Cpu className="w-48 h-48 text-indigo-500" />
            </div>
            <div className="relative z-10 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-3.5 py-2 rounded-full border border-indigo-500/20">Daily Automator Engine</span>
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Target Run: 10:00 AM Daily IST</span>
              </div>
              <div className="max-w-2xl">
                <h3 className="text-2xl font-black text-white tracking-tight">Daily 10:00 AM Auto-Course Publisher System</h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-2">
                  This system is configured to run automatically every morning. It selects a high-trending hacking, development, or tech topic, retrieves premium YouTube tutorials from authorized public channels, generates professional course outlines using our robust Hinglish AI model, produces downloadable PDF study cheat sheets, and instantly publishes the course to our live homepage.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  disabled={cronLoading}
                  onClick={handleTriggerDailyAutoUpload}
                  className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/10 flex items-center gap-2"
                >
                  {cronLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                  {cronLoading ? "Generating Course Live..." : "Force Trigger Daily Auto-Upload Now"}
                </button>
              </div>

              {cronMessage && (
                <div className={`p-4 rounded-xl text-xs font-mono border ${cronMessage.startsWith('Error') ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                  {cronMessage}
                </div>
              )}
            </div>
          </div>

          {/* AI Services Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {loadingAiKeys && aiApiKeysStatus.length === 0 ? (
              <div className="col-span-2 p-20 text-center space-y-4 bg-white border border-slate-200 rounded-3xl">
                <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Querying live Gemini API client status...</p>
              </div>
            ) : (
              aiApiKeysStatus.map((service) => {
                const isWorking = service.status.includes("Active");
                const limitPct = (service.limitRemaining / service.limitTotal) * 100;
                const isPingedThis = pingResult && pingResult.id === service.id;

                return (
                  <div key={service.id} className="bg-white border border-slate-200 p-8 rounded-3xl relative flex flex-col justify-between group">
                    <div className="space-y-6">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">{service.name}</h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{service.purpose}</p>
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full whitespace-nowrap border ${isWorking ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                          {isWorking ? "Active (Working)" : "Error / Config Missing"}
                        </span>
                      </div>

                      {/* Quota limit live indicator */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <span>Live Remaining Quota:</span>
                          <span className="font-black text-slate-900 font-mono">{service.limitRemaining} / {service.limitTotal} RPM</span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${limitPct < 30 ? 'bg-rose-500' : limitPct < 60 ? 'bg-amber-500' : 'bg-indigo-600'}`}
                            style={{ width: `${limitPct}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[9px] text-slate-400 uppercase tracking-widest font-black font-mono">
                          <span>Resets Quota In:</span>
                          <span className="text-slate-900 animate-pulse">{service.secondsUntilReset}s</span>
                        </div>
                      </div>

                      {/* Service statistics */}
                      <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
                        <div>
                          <h4 className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Queries This Session</h4>
                          <p className="text-xl font-black text-slate-900 mt-1 font-mono">{service.useCount}</p>
                        </div>
                        <div>
                          <h4 className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Active Model Chain</h4>
                          <p className="text-xs font-black text-slate-900 mt-1.5 uppercase font-mono truncate" title={service.lastModelUsed}>{service.lastModelUsed}</p>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-4 space-y-2">
                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span className="font-bold uppercase tracking-wider">Last Utilized:</span>
                          <span className="font-mono font-black text-slate-700">
                            {service.lastUsed ? new Date(service.lastUsed).toLocaleTimeString() : "Never in this session"}
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span className="font-bold uppercase tracking-wider">Next Run Condition:</span>
                          <span className="font-black text-slate-900 uppercase tracking-wide">{service.nextScheduledRun}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 space-y-4">
                      <button
                        disabled={pingingId !== null}
                        onClick={() => handlePingKey(service.id)}
                        className="w-full px-5 py-3 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-slate-200"
                      >
                        {pingingId === service.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Cpu className="w-3.5 h-3.5" />}
                        {pingingId === service.id ? "Pinging Model..." : "Ping Live Model"}
                      </button>

                      {isPingedThis && (
                        <div className={`p-4 rounded-xl text-[10px] font-mono border ${pingResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                          {pingResult.message}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Render the Preview Modal if active */}
      {previewingCourse && (
        <AdminPreviewModal 
          course={previewingCourse} 
          onClose={() => setPreviewingCourse(null)} 
          language={language}
        />
      )}

      {/* Render the Course Creator / Editor Modal if active */}
      {showCourseModal && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-300">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col p-8 sm:p-10 relative custom-scrollbar">
            <button 
              onClick={() => setShowCourseModal(false)}
              className="absolute top-6 right-6 p-3 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-slate-400 hover:text-slate-900"
            >
              <X className="w-5 h-5" />
            </button>
            
            <header className="mb-8">
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3.5 py-1.5 rounded-full border border-indigo-100">
                {editingCourseId ? 'Product Editor' : 'New Product Creator'}
              </span>
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight mt-3">
                {editingCourseId ? 'Edit Premium Course' : 'Create Custom Premium Course'}
              </h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                Configure your pricing, video modules, and downloadable PDF study manuals.
              </p>
            </header>

            {modalError && (
              <div className="p-4 mb-6 bg-red-50 border border-red-100 rounded-2xl text-xs font-bold text-red-600 flex items-center gap-3">
                <AlertTriangle className="w-4 h-4" />
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveCourse} className="space-y-8 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Course Title</label>
                  <input 
                    type="text" 
                    value={cTitle} 
                    onChange={(e) => setCTitle(e.target.value)}
                    placeholder="e.g. Complete Python Bug Bounty & Exploitation Guide"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Category</label>
                  <select 
                    value={cCategory} 
                    onChange={(e) => setCCategory(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer text-slate-900"
                  >
                    <option value="DEVELOPMENT">DEVELOPMENT</option>
                    <option value="ETHICAL HACKING">ETHICAL HACKING</option>
                    <option value="TRADING & FINANCE">TRADING & FINANCE</option>
                    <option value="DESIGN & EDITING">DESIGN & EDITING</option>
                    <option value="AI & AUTOMATION">AI & AUTOMATION</option>
                    <option value="WEB DEVELOPMENT">WEB DEVELOPMENT</option>
                    <option value="APP DEVELOPMENT">APP DEVELOPMENT</option>
                    <option value="MARKETING">MARKETING</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Course Description</label>
                <textarea 
                  value={cDesc} 
                  onChange={(e) => setCDesc(e.target.value)}
                  placeholder="Describe the course, what the student will learn, prerequisites, etc..."
                  rows={4}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Selling Price (₹)</label>
                  <input 
                    type="number" 
                    value={cPrice} 
                    onChange={(e) => setCPrice(Number(e.target.value))}
                    min={0}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono text-slate-900"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Original Price (₹)</label>
                  <input 
                    type="number" 
                    value={cOriginalPrice} 
                    onChange={(e) => setCOriginalPrice(Number(e.target.value))}
                    min={0}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono text-slate-900"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Thumbnail Image URL</label>
                  <input 
                    type="text" 
                    value={cThumbnail} 
                    onChange={(e) => setCThumbnail(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900"
                  />
                </div>
              </div>

              {/* Course Lectures Section */}
              <div className="border-t border-slate-100 pt-8 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">Video Modules</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Specify lecture titles and standard public streaming video links.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setCourseVideos([...courseVideos, { title: `Lecture ${courseVideos.length + 1}: `, url: '' }])}
                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border border-indigo-100 flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Lecture
                  </button>
                </div>

                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {courseVideos.map((v, idx) => (
                    <div key={idx} className="flex gap-4 items-start bg-slate-50 p-4 rounded-2xl border border-slate-200 relative group/row">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lecture {idx + 1} Title</span>
                          <input 
                            type="text" 
                            value={v.title} 
                            onChange={(e) => {
                              const newList = [...courseVideos];
                              newList[idx].title = e.target.value;
                              setCourseVideos(newList);
                            }}
                            placeholder="e.g. Introduction & Setting Up Environment"
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-indigo-500 outline-none text-slate-900"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            {videoUploadingIndexes[idx] ? (
                              <span className="text-indigo-600 animate-pulse">{videoUploadingIndexes[idx]}</span>
                            ) : (
                              "Lecture Video URL"
                            )}
                          </span>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              value={v.url} 
                              onChange={(e) => {
                                const newList = [...courseVideos];
                                newList[idx].url = e.target.value;
                                setCourseVideos(newList);
                              }}
                              placeholder="e.g. https://www.youtube.com/watch?v=..."
                              className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-indigo-500 outline-none text-slate-900"
                              disabled={!!videoUploadingIndexes[idx]}
                            />
                            <div className="relative group/upload flex items-stretch">
                              <button
                                type="button"
                                onClick={() => setActiveUploadDropdown(activeUploadDropdown === idx ? null : idx)}
                                className="px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-indigo-100 flex items-center justify-center gap-1 min-w-[85px] text-center select-none cursor-pointer"
                                disabled={!!videoUploadingIndexes[idx]}
                              >
                                <span>Upload</span>
                              </button>
                              {activeUploadDropdown === idx && (
                                <div className="absolute right-0 bottom-full mb-1 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50 min-w-[170px]">
                                  <label className="block w-full px-4 py-2.5 hover:bg-slate-50 text-left text-xs font-bold text-slate-700 cursor-pointer select-none">
                                    <span>To Server (No Limit)</span>
                                    <input 
                                      type="file" 
                                      className="hidden" 
                                      accept="video/*"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        await handleVideoUpload(file, idx, 'server');
                                      }}
                                    />
                                  </label>
                                  <label className="block w-full px-4 py-2.5 hover:bg-slate-50 text-left text-xs font-bold text-indigo-600 cursor-pointer select-none border-t border-slate-100">
                                    <span>To Telegram Bot</span>
                                    <input 
                                      type="file" 
                                      className="hidden" 
                                      accept="video/*"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        await handleVideoUpload(file, idx, 'telegram');
                                      }}
                                    />
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => setActiveUploadDropdown(null)}
                                    className="block w-full px-4 py-2 hover:bg-rose-50 text-left text-[10px] font-bold text-rose-500 uppercase tracking-wider border-t border-slate-100 cursor-pointer select-none"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          if (courseVideos.length > 1) {
                            setCourseVideos(courseVideos.filter((_, i) => i !== idx));
                          }
                        }}
                        className="p-2.5 mt-5 bg-white border border-slate-200 hover:bg-rose-500 hover:text-white rounded-xl text-slate-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attachments Section */}
              <div className="border-t border-slate-100 pt-8 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">Premium Study Manuals / Guides</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Offer cheat sheets, syllabus maps, or zip files for downloads.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setAttachmentsList([...attachmentsList, { id: `att_${Math.random().toString(36).substring(2, 6)}`, name: '', url: '', size: '1.5 MB' }])}
                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border border-indigo-100 flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Guide
                  </button>
                </div>

                <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                  {attachmentsList.map((a, idx) => (
                    <div key={idx} className="flex gap-4 items-start bg-slate-50 p-4 rounded-2xl border border-slate-200 relative group/row">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Document Name</span>
                          <input 
                            type="text" 
                            value={a.name} 
                            onChange={(e) => {
                              const newList = [...attachmentsList];
                              newList[idx].name = e.target.value;
                              setAttachmentsList(newList);
                            }}
                            placeholder="e.g. Master Cheat Sheet.pdf"
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-indigo-500 outline-none text-slate-900"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">File Download URL</span>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              value={a.url} 
                              onChange={(e) => {
                                const newList = [...attachmentsList];
                                newList[idx].url = e.target.value;
                                setAttachmentsList(newList);
                              }}
                              placeholder="e.g. # or /api/courses/download-guide"
                              className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-indigo-500 outline-none text-slate-900"
                            />
                            <label className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border border-indigo-100 flex items-center justify-center gap-1 min-w-[75px] text-center select-none">
                              <span>Upload</span>
                              <input 
                                type="file" 
                                className="hidden" 
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  
                                  const formData = new FormData();
                                  formData.append('file', file);
                                  
                                  const newList = [...attachmentsList];
                                  newList[idx].url = 'Uploading...';
                                  newList[idx].name = file.name;
                                  setAttachmentsList([...newList]);
                                  
                                  try {
                                    const uploadRes = await fetch('/api/admin/upload', {
                                      method: 'POST',
                                      body: formData
                                    });
                                    const uploadData = await uploadRes.json();
                                    if (uploadData.success) {
                                      const updatedList = [...attachmentsList];
                                      updatedList[idx].url = uploadData.url;
                                      updatedList[idx].name = uploadData.name;
                                      updatedList[idx].size = uploadData.size;
                                      setAttachmentsList(updatedList);

                                      // Auto-save/update Firestore if course is already saved
                                      const currentCourseId = editingCourseIdRef.current;
                                      if (currentCourseId) {
                                        try {
                                          const { db, doc, getDoc, setDoc } = await import('../lib/firebase');
                                          const courseDocRef = doc(db, 'courses', currentCourseId);
                                          const courseSnap = await getDoc(courseDocRef);
                                          if (courseSnap.exists()) {
                                            const courseData = courseSnap.data() as Course;
                                            const updatedAtts = courseData.attachments ? [...courseData.attachments] : [];
                                            while (updatedAtts.length <= idx) {
                                              updatedAtts.push({ id: `a${updatedAtts.length + 1}`, name: 'Attachment', url: '', size: '1.5 MB' });
                                            }
                                            updatedAtts[idx] = {
                                              ...updatedAtts[idx],
                                              url: uploadData.url,
                                              name: uploadData.name,
                                              size: uploadData.size,
                                              isVerified: true
                                            };
                                            await setDoc(courseDocRef, { ...courseData, attachments: updatedAtts });
                                            console.log("Successfully updated course attachment directly in Firestore:", currentCourseId);
                                          }
                                        } catch (dbErr) {
                                          console.error("Error updating course attachment in Firestore:", dbErr);
                                        }
                                      }
                                    } else {
                                      alert("Upload failed: " + uploadData.error);
                                      const updatedList = [...attachmentsList];
                                      updatedList[idx].url = '';
                                      setAttachmentsList(updatedList);
                                    }
                                  } catch (err: any) {
                                    console.error(err);
                                    alert("Upload error: " + (err.message || String(err)));
                                    const updatedList = [...attachmentsList];
                                    updatedList[idx].url = '';
                                    setAttachmentsList(updatedList);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">File Size</span>
                          <input 
                            type="text" 
                            value={a.size} 
                            onChange={(e) => {
                              const newList = [...attachmentsList];
                              newList[idx].size = e.target.value;
                              setAttachmentsList(newList);
                            }}
                            placeholder="e.g. 2.4 MB"
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-indigo-500 outline-none text-slate-900"
                          />
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          setAttachmentsList(attachmentsList.filter((_, i) => i !== idx));
                        }}
                        className="p-2.5 mt-5 bg-white border border-slate-200 hover:bg-rose-500 hover:text-white rounded-xl text-slate-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-8 flex gap-4 justify-end">
                <button 
                  type="button" 
                  onClick={() => setShowCourseModal(false)}
                  className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-indigo-600/20"
                >
                  {editingCourseId ? 'Save Changes' : 'Publish Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </div>
      </main>
    </div>
  );
}

// Preview Modal Component
function AdminPreviewModal({ course, onClose, language }: { course: any, onClose: () => void, language: Language }) {
  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex flex-col p-4 sm:p-8 animate-fade-in">
      <div className="flex justify-between items-center mb-6 max-w-6xl mx-auto w-full">
        <div>
          <span className="bg-indigo-500 text-white text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full shadow-lg shadow-indigo-500/20">
            Admin Preview Mode
          </span>
          <h2 className="text-xl font-black text-slate-900 mt-1 uppercase tracking-tight">{course.title}</h2>
        </div>
        <button 
          onClick={onClose}
          className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-2xl transition-all cursor-pointer shadow-xl border border-slate-200 flex items-center gap-2 font-black text-xs uppercase tracking-widest"
        >
          <X className="w-5 h-5" /> Exit Preview
        </button>
      </div>
      
      <div className="flex-1 min-h-[70vh] overflow-y-auto rounded-[40px] border border-slate-300 shadow-2xl bg-slate-50 custom-scrollbar">
        <div className="min-h-full">
        <CourseViewer 
          course={course} 
          onBack={onClose} 
          userEmail="admin@admin.com" 
          userName="Administrator" 
          language={language}
        />
        </div>
      </div>
    </div>
  );
}

function getSimulatedEmailHTML(email: EmailNotification): string {
  const isWelcome = email.type === 'WELCOME';
  const isNewCourse = email.type === 'NEW_COURSE';
  const accentColor = isWelcome ? '#4f46e5' : (isNewCourse ? '#0ea5e9' : '#10b981');
  const headerTitle = isWelcome ? 'Welcome Onboard!' : (isNewCourse ? 'New Course Alert!' : 'Payment Verified');
  const bannerBg = isWelcome ? 'linear-gradient(135deg, #4f46e5 0%, #312e81 100%)' : (isNewCourse ? 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)' : 'linear-gradient(135deg, #10b981 0%, #064e3b 100%)');

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; padding: 40px 20px; color: #1f2937;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
        
        <!-- Header Banner -->
        <div style="background: ${bannerBg}; padding: 40px 30px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 800; text-transform: uppercase;">${headerTitle}</h1>
          <p style="margin: 8px 0 0; font-size: 14px; opacity: 0.9; font-weight: 600;">LEARNSPHERE MASTERCLASS</p>
        </div>

        <!-- Body -->
        <div style="padding: 40px 30px; line-height: 1.6;">
          <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 700; color: #111827;">Hello ${email.studentName || 'Learner'},</h2>
          
          <div style="font-size: 15px; color: #4b5563; margin-bottom: 24px;">
            ${email.body.split('\n\n').join('</div><div style="font-size: 15px; color: #4b5563; margin-bottom: 24px;">')}
          </div>

          <!-- Invoice Details Card -->
          <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; border: 1px solid #e5e7eb; margin-bottom: 30px;">
            <h4 style="margin: 0 0 12px; font-size: 12px; font-weight: 800; color: #9ca3af; text-transform: uppercase; tracking-wider;">Transaction Summary</h4>
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #6b7280; text-align: left;">Course Name:</td>
                <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #111827;">${email.courseTitle}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280; text-align: left;">Transaction ID:</td>
                <td style="padding: 6px 0; text-align: right; font-family: monospace; color: #374151; font-weight: 500;">${email.transactionId}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280; text-align: left;">Delivery Status:</td>
                <td style="padding: 6px 0; text-align: right; font-weight: 700; color: ${accentColor};">${email.status}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280; text-align: left;">Timestamp:</td>
                <td style="padding: 6px 0; text-align: right; color: #374151;">${new Date(email.timestamp).toLocaleString()}</td>
              </tr>
            </table>
          </div>

          <!-- Call to Action -->
          <div style="text-align: center; margin-top: 30px; margin-bottom: 20px;">
            <a href="https://thenewtips.com/dashboard" target="_blank" style="display: inline-block; background-color: ${accentColor}; color: #ffffff; text-decoration: none; padding: 14px 30px; font-size: 14px; font-weight: 700; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
              Access Your Dashboard
            </a>
          </div>

        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
          <p style="margin: 0 0 4px;">This is a system-generated email regarding your transaction on The New Tips.</p>
          <p style="margin: 0;">&copy; ${new Date().getFullYear()} The New Tips. All rights reserved.</p>
        </div>

      </div>
    </div>
  `;
}
