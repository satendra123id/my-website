import { 
  db, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  auth
} from './firebase';
import { Course, Transaction, GatewaySettings, Review, EmailNotification } from '../types';
import { DEFAULT_COURSES, DEFAULT_TRANSACTIONS, DEFAULT_SETTINGS } from './seedData';

// Collection references
const COURSES_COLLECTION = 'courses';
const TRANSACTIONS_COLLECTION = 'transactions';
const SETTINGS_COLLECTION = 'settings';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  const stringified = JSON.stringify(errInfo);
  const isOffline = errInfo.error.includes('offline') || errInfo.error.includes('Could not reach') || errInfo.error.includes('unavailable');
  if (isOffline) {
    console.warn('Firestore Offline/Network Warning: ', stringified);
  } else {
    console.error('Firestore Error: ', stringified);
  }
  throw new Error(stringified);
}

/**
 * Initialize Firestore with seed data if empty
 */
export async function initializeDatabase() {
  try {
    // Attempt proxy check first
    const coursesRes = await fetch('/api/proxy/courses');
    if (coursesRes.ok) {
      const courses = await coursesRes.json();
      if (courses.length === 0) {
        console.log('Seeding courses via proxy...');
        for (const course of DEFAULT_COURSES) {
          await fetch('/api/proxy/courses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(course)
          });
        }
      }
    }

    const txRes = await fetch('/api/proxy/transactions');
    if (txRes.ok) {
      const txs = await txRes.json();
      if (txs.length === 0) {
        console.log('Seeding transactions via proxy...');
        for (const tx of DEFAULT_TRANSACTIONS) {
          await fetch('/api/proxy/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tx)
          });
        }
      }
    }

    const settingsRes = await fetch('/api/proxy/settings/gateway');
    if (settingsRes.status === 404) {
      console.log('Seeding gateway settings via proxy...');
      await fetch('/api/proxy/settings/gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(DEFAULT_SETTINGS)
      });
    }
  } catch (err) {
    console.warn('initializeDatabase: Proxy check/seed failed, running direct fallback seeding.', err);
    try {
      // 1. Seed Courses if empty
      let coursesSnapshot;
      try {
        coursesSnapshot = await getDocs(collection(db, COURSES_COLLECTION));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, COURSES_COLLECTION);
      }

      if (coursesSnapshot && coursesSnapshot.empty) {
        console.log('Seeding courses database...');
        for (const course of DEFAULT_COURSES) {
          try {
            await setDoc(doc(db, COURSES_COLLECTION, course.id), course);
          } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, `${COURSES_COLLECTION}/${course.id}`);
          }
        }
      }

      // 2. Seed Transactions if empty
      let transactionsSnapshot;
      try {
        transactionsSnapshot = await getDocs(collection(db, TRANSACTIONS_COLLECTION));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, TRANSACTIONS_COLLECTION);
      }

      if (transactionsSnapshot && transactionsSnapshot.empty) {
        console.log('Seeding transactions database...');
        for (const tx of DEFAULT_TRANSACTIONS) {
          try {
            await setDoc(doc(db, TRANSACTIONS_COLLECTION, tx.id), tx);
          } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, `${TRANSACTIONS_COLLECTION}/${tx.id}`);
          }
        }
      }

      // 3. Seed Gateway Settings if empty
      let settingsDoc;
      try {
        settingsDoc = await getDoc(doc(db, SETTINGS_COLLECTION, 'gateway'));
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `${SETTINGS_COLLECTION}/gateway`);
      }

      if (settingsDoc && !settingsDoc.exists()) {
        console.log('Seeding gateway settings...');
        try {
          await setDoc(doc(db, SETTINGS_COLLECTION, 'gateway'), DEFAULT_SETTINGS);
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `${SETTINGS_COLLECTION}/gateway`);
        }
      }
    } catch (error) {
      console.error('Error seeding database:', error);
    }
  }
}

/**
 * Course Services
 */
export async function getAllCourses(): Promise<Course[]> {
  try {
    const response = await fetch('/api/proxy/courses');
    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to fetch from backend proxy');
  } catch (err) {
    console.warn('getAllCourses: Proxy failed, using fallback SDK.', err);
    try {
      let snapshot;
      try {
        snapshot = await getDocs(collection(db, COURSES_COLLECTION));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, COURSES_COLLECTION);
      }

      const courses: Course[] = [];
      snapshot.forEach((doc) => {
        courses.push(doc.data() as Course);
      });
      // Sort by createdAt desc
      return courses.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('Error fetching courses:', error);
      return DEFAULT_COURSES;
    }
  }
}

export async function runSimulatedCloudFunctionForNewCourse(course: Course): Promise<void> {
  try {
    const txs = await getAllTransactions();
    const studentEmails = Array.from(new Set(txs.map(t => t.studentEmail)));
    
    if (studentEmails.length === 0) {
      studentEmails.push('student@thenewtips.com');
    }
    
    for (const email of studentEmails) {
      const emailId = 'email_new_course_' + Math.random().toString(36).substring(2, 11).toUpperCase();
      const newCourseEmail: EmailNotification = {
        id: emailId,
        transactionId: 'N/A',
        recipientEmail: email,
        studentName: email.split('@')[0] || "Student",
        courseTitle: course.title,
        type: 'NEW_COURSE',
        subject: `New Course Released: "${course.title}"! 🎓`,
        body: `Hi there,\n\nWe have exciting news! A brand new premium course has just been published on our platform.\n\nCourse Title: "${course.title}"\nPrice: ₹${course.price}\n\nCheck it out and enroll today to start mastering this topic!\n\nBest regards,\nThe New Tips Team`,
        status: 'SENT',
        timestamp: Date.now()
      };
      
      try {
        // Log via proxy if possible
        await fetch('/api/proxy/email_notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newCourseEmail)
        });
      } catch (proxyErr) {
        // Fallback to direct SDK
        await setDoc(doc(db, 'email_notifications', emailId), newCourseEmail);
      }
    }
  } catch (err) {
    console.error('Failed to run simulated email cloud function trigger for new course:', err);
  }
}

export async function addCourse(course: Course): Promise<void> {
  try {
    const res = await fetch('/api/proxy/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(course)
    });
    if (res.ok) {
      runSimulatedCloudFunctionForNewCourse(course).catch(console.error);
      return;
    }
    throw new Error('Failed to post course to proxy');
  } catch (err) {
    console.warn('addCourse: Proxy failed, using fallback SDK.', err);
    try {
      await setDoc(doc(db, COURSES_COLLECTION, course.id), course);
      await runSimulatedCloudFunctionForNewCourse(course);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${COURSES_COLLECTION}/${course.id}`);
    }
  }
}

export async function updateCourse(id: string, updates: Partial<Course>): Promise<void> {
  try {
    const res = await fetch(`/api/proxy/courses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (res.ok) return;
    throw new Error('Failed to update course via proxy');
  } catch (err) {
    console.warn('updateCourse: Proxy failed, using fallback SDK.', err);
    try {
      await updateDoc(doc(db, COURSES_COLLECTION, id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${COURSES_COLLECTION}/${id}`);
    }
  }
}

export async function deleteCourse(id: string): Promise<void> {
  try {
    const res = await fetch(`/api/proxy/courses/${id}`, {
      method: 'DELETE'
    });
    if (res.ok) return;
    throw new Error('Failed to delete course via proxy');
  } catch (err) {
    console.warn('deleteCourse: Proxy failed, using fallback SDK.', err);
    try {
      await deleteDoc(doc(db, COURSES_COLLECTION, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COURSES_COLLECTION}/${id}`);
    }
  }
}

/**
 * Transaction / Ledger Services
 */
export async function getAllTransactions(): Promise<Transaction[]> {
  try {
    const res = await fetch('/api/proxy/transactions');
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to get transactions from proxy');
  } catch (err) {
    console.warn('getAllTransactions: Proxy failed, using fallback SDK.', err);
    try {
      let snapshot;
      try {
        snapshot = await getDocs(collection(db, TRANSACTIONS_COLLECTION));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, TRANSACTIONS_COLLECTION);
      }

      const txs: Transaction[] = [];
      snapshot.forEach((doc) => {
        txs.push(doc.data() as Transaction);
      });
      // Sort by timestamp desc
      return txs.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return DEFAULT_TRANSACTIONS;
    }
  }
}

export async function addTransaction(tx: Transaction): Promise<void> {
  try {
    const res = await fetch('/api/proxy/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tx)
    });
    if (res.ok) {
      runSimulatedCloudFunctionForTransaction('create', tx).catch(console.error);
      return;
    }
    throw new Error('Failed to add transaction via proxy');
  } catch (err) {
    console.warn('addTransaction: Proxy failed, using fallback SDK.', err);
    try {
      await setDoc(doc(db, TRANSACTIONS_COLLECTION, tx.id), tx);
      await runSimulatedCloudFunctionForTransaction('create', tx);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${TRANSACTIONS_COLLECTION}/${tx.id}`);
    }
  }
}

export async function updateTransactionStatus(id: string, status: 'SUCCESS' | 'PENDING' | 'FAILED'): Promise<void> {
  try {
    const res = await fetch(`/api/proxy/transactions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      try {
        const snap = await getDoc(doc(db, TRANSACTIONS_COLLECTION, id));
        if (snap.exists()) {
          const beforeData = snap.data() as Transaction;
          const afterData = { ...beforeData, status };
          await runSimulatedCloudFunctionForTransaction('update', afterData, beforeData);
        }
      } catch (innerErr) {
        console.warn('Failed to run simulation after proxy transaction update:', innerErr);
      }
      return;
    }
    throw new Error('Failed to update transaction status via proxy');
  } catch (err) {
    console.warn('updateTransactionStatus: Proxy failed, using fallback SDK.', err);
    try {
      const docRef = doc(db, TRANSACTIONS_COLLECTION, id);
      const snap = await getDoc(docRef);
      let beforeData: Transaction | undefined;
      if (snap.exists()) {
        beforeData = snap.data() as Transaction;
      }

      await updateDoc(docRef, { status });

      if (beforeData) {
        const afterData = { ...beforeData, status };
        await runSimulatedCloudFunctionForTransaction('update', afterData, beforeData);

        // Client-side fallback: Automatically unlock the course for the student when set to SUCCESS
        if (status === 'SUCCESS' && beforeData.studentEmail && beforeData.courseId) {
          const sanitizedId = beforeData.studentEmail.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
          const userDocRef = doc(db, 'app_users', sanitizedId);
          const userDoc = await getDoc(userDocRef);
          const userData = userDoc.exists() ? userDoc.data() : {};
          const unlockedCourses = userData.unlockedCourses || [];
          if (!unlockedCourses.includes(beforeData.courseId)) {
            unlockedCourses.push(beforeData.courseId);
            await setDoc(userDocRef, { ...userData, unlockedCourses });
          }
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${TRANSACTIONS_COLLECTION}/${id}`);
    }
  }
}

async function runSimulatedCloudFunctionForTransaction(
  event: 'create' | 'update',
  afterData: Transaction,
  beforeData?: Transaction
) {
  try {
    const recipientEmail = afterData.studentEmail;
    const studentName = afterData.studentName || afterData.studentEmail.split('@')[0] || "Student";
    const courseTitle = afterData.courseTitle || "Course";
    const amount = afterData.amount;
    const transactionId = afterData.id;

    if (event === 'create') {
      // 1. Create WELCOME email
      const welcomeId = 'email_welcome_' + Math.random().toString(36).substr(2, 9).toUpperCase();
      const welcomeEmail: EmailNotification = {
        id: welcomeId,
        transactionId,
        recipientEmail,
        studentName,
        courseTitle,
        type: 'WELCOME',
        subject: `Welcome to "${courseTitle}"! 🚀`,
        body: `Hi ${studentName},\n\nThank you for purchasing "${courseTitle}"! We are thrilled to have you onboard.\n\nYou can access your lectures and downloadable reference guides from your dashboard anytime.\n\nBest regards,\nThe New Tips Team`,
        status: 'SENT',
        timestamp: Date.now()
      };
      
      try {
        await fetch('/api/proxy/email_notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(welcomeEmail)
        });
      } catch (proxyErr) {
        await setDoc(doc(db, 'email_notifications', welcomeId), welcomeEmail);
      }

      // 2. If status is SUCCESS, also send VERIFICATION email
      if (afterData.status === 'SUCCESS') {
        const verifyId = 'email_verify_' + Math.random().toString(36).substr(2, 9).toUpperCase();
        const verifyEmail: EmailNotification = {
          id: verifyId,
          transactionId,
          recipientEmail,
          studentName,
          courseTitle,
          type: 'VERIFICATION',
          subject: `Payment Verified: Course Unlocked! ✅`,
          body: `Hi ${studentName},\n\nGood news! Your transaction (ID: ${transactionId}) of ₹${amount} for "${courseTitle}" has been verified successfully. Your access is fully unlocked!\n\nStart learning now: https://thenewtips.com/dashboard\n\nBest regards,\nThe New Tips Team`,
          status: 'SENT',
          timestamp: Date.now()
        };
        try {
          await fetch('/api/proxy/email_notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(verifyEmail)
          });
        } catch (proxyErr) {
          await setDoc(doc(db, 'email_notifications', verifyId), verifyEmail);
        }
      }
    } else if (event === 'update' && beforeData) {
      // 3. Status transition from PENDING to SUCCESS
      if (beforeData.status !== 'SUCCESS' && afterData.status === 'SUCCESS') {
        const verifyId = 'email_verify_' + Math.random().toString(36).substr(2, 9).toUpperCase();
        const verifyEmail: EmailNotification = {
          id: verifyId,
          transactionId,
          recipientEmail,
          studentName,
          courseTitle,
          type: 'VERIFICATION',
          subject: `Payment Verified: Course Unlocked! ✅`,
          body: `Hi ${studentName},\n\nGood news! Your transaction (ID: ${transactionId}) of ₹${amount} for "${courseTitle}" has been verified successfully. Your access is fully unlocked!\n\nStart learning now: https://thenewtips.com/dashboard\n\nBest regards,\nThe New Tips Team`,
          status: 'SENT',
          timestamp: Date.now()
        };
        try {
          await fetch('/api/proxy/email_notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(verifyEmail)
          });
        } catch (proxyErr) {
          await setDoc(doc(db, 'email_notifications', verifyId), verifyEmail);
        }
      }
    }
  } catch (err) {
    console.error('Failed to run simulated email cloud function trigger:', err);
  }
}

export async function getEmailNotifications(): Promise<EmailNotification[]> {
  try {
    const res = await fetch('/api/proxy/email_notifications');
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to fetch email notifications via proxy');
  } catch (err) {
    console.warn('getEmailNotifications: Proxy failed, using fallback SDK.', err);
    try {
      const q = query(collection(db, 'email_notifications'), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      const list: EmailNotification[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as EmailNotification);
      });
      return list;
    } catch (error) {
      console.error('Error fetching email notifications:', error);
      return [];
    }
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  try {
    const res = await fetch(`/api/proxy/transactions/${id}`, {
      method: 'DELETE'
    });
    if (res.ok) return;
    throw new Error('Failed to delete transaction via proxy');
  } catch (err) {
    console.warn('deleteTransaction: Proxy failed, using fallback SDK.', err);
    try {
      await deleteDoc(doc(db, TRANSACTIONS_COLLECTION, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${TRANSACTIONS_COLLECTION}/${id}`);
    }
  }
}

/**
 * Settings Services
 */
export async function getGatewaySettings(): Promise<GatewaySettings> {
  try {
    const res = await fetch('/api/proxy/settings/gateway');
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to get gateway settings from proxy');
  } catch (err) {
    console.warn('getGatewaySettings: Proxy failed, using fallback SDK.', err);
    try {
      let settingsDoc;
      try {
        settingsDoc = await getDoc(doc(db, SETTINGS_COLLECTION, 'gateway'));
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `${SETTINGS_COLLECTION}/gateway`);
      }

      if (settingsDoc && settingsDoc.exists()) {
        return settingsDoc.data() as GatewaySettings;
      }
      return DEFAULT_SETTINGS;
    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const isOffline = errorMsg.includes('offline') || errorMsg.includes('Could not reach') || errorMsg.includes('unavailable');
      if (isOffline) {
        console.warn('Offline warning during fetching gateway settings:', errorMsg);
      } else {
        console.error('Error fetching gateway settings:', error);
      }
      return DEFAULT_SETTINGS;
    }
  }
}

export async function updateGatewaySettings(settings: GatewaySettings): Promise<void> {
  try {
    const res = await fetch('/api/proxy/settings/gateway', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (res.ok) return;
    throw new Error('Failed to update gateway settings via proxy');
  } catch (err) {
    console.warn('updateGatewaySettings: Proxy failed, using fallback SDK.', err);
    try {
      await setDoc(doc(db, SETTINGS_COLLECTION, 'gateway'), settings);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${SETTINGS_COLLECTION}/gateway`);
    }
  }
}

/**
 * Analytics View Services
 */
function getOrCreateDeviceId(): string {
  try {
    let devId = localStorage.getItem('tnt_device_id');
    if (!devId) {
      devId = 'device_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      localStorage.setItem('tnt_device_id', devId);
    }
    return devId;
  } catch (e) {
    return 'device_fallback_' + Math.random().toString(36).substring(2, 7);
  }
}

export async function logPageView(pageName: string, courseId: string | null = null): Promise<void> {
  try {
    const deviceId = getOrCreateDeviceId();
    const viewId = 'view_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
    const viewData = {
      id: viewId,
      page: pageName,
      courseId: courseId || null,
      timestamp: Date.now(),
      user: auth.currentUser?.email || 'anonymous',
      deviceId: deviceId
    };

    try {
      await fetch('/api/proxy/analytics/views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(viewData)
      });
    } catch (proxyErr) {
      await setDoc(doc(db, 'analytics_views', viewId), viewData);
    }
  } catch (error) {
    console.error('Error logging page view:', error);
  }
}

/**
 * Review Services
 */
export async function getCourseReviews(courseId: string): Promise<Review[]> {
  try {
    const res = await fetch(`/api/proxy/courses/${courseId}/reviews`);
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to get reviews via proxy');
  } catch (err) {
    console.warn('getCourseReviews: Proxy failed, using fallback SDK.', err);
    try {
      const reviewsRef = collection(db, COURSES_COLLECTION, courseId, 'reviews');
      let snapshot;
      try {
        snapshot = await getDocs(query(reviewsRef, orderBy('timestamp', 'desc')));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, `${COURSES_COLLECTION}/${courseId}/reviews`);
      }

      const reviews: Review[] = [];
      snapshot?.forEach((doc) => {
        reviews.push(doc.data() as Review);
      });
      return reviews;
    } catch (error) {
      console.error('Error fetching reviews:', error);
      return [];
    }
  }
}

export async function addReview(courseId: string, review: Review): Promise<void> {
  try {
    const res = await fetch(`/api/proxy/courses/${courseId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(review)
    });
    if (res.ok) return;
    throw new Error('Failed to add review via proxy');
  } catch (err) {
    console.warn('addReview: Proxy failed, using fallback SDK.', err);
    try {
      await setDoc(doc(db, COURSES_COLLECTION, courseId, 'reviews', review.id), review);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${COURSES_COLLECTION}/${courseId}/reviews/${review.id}`);
    }
  }
}

export async function isStudentEnrolled(email: string, courseId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/proxy/enrollment?email=${encodeURIComponent(email)}&courseId=${encodeURIComponent(courseId)}`);
    if (res.ok) {
      const data = await res.json();
      return !!data.enrolled;
    }
    throw new Error('Failed to check enrollment via proxy');
  } catch (err) {
    console.warn('isStudentEnrolled: Proxy failed, using fallback SDK.', err);
    try {
      const q = query(
        collection(db, TRANSACTIONS_COLLECTION),
        where('studentEmail', '==', email),
        where('courseId', '==', courseId),
        where('status', '==', 'SUCCESS')
      );
      let snapshot;
      try {
        snapshot = await getDocs(q);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, TRANSACTIONS_COLLECTION);
      }
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking enrollment:', error);
      return false;
    }
  }
}
