export interface Video {
  id: string;
  title: string;
  url: string;
  duration?: string;
  isVerified?: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  size: string;
  isVerified?: boolean;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  guideMarkdown?: string;
  price: number;
  originalPrice: number;
  thumbnail: string;
  category: string;
  lecturesCount: number;
  filesCount: number;
  videos: Video[];
  attachments: Attachment[];
  createdAt: number;
  isAIGenerated?: boolean;
  status?: 'published' | 'draft';
}

export interface Transaction {
  id: string;
  studentEmail: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
  amount: number;
  method: 'UPI' | 'Razorpay';
  refUtrId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  timestamp: number;
}

export interface GatewaySettings {
  razorpayKeyId: string;
  razorpayKeySecret: string;
  razorpayWebhookSecret?: string;
  upiVpa: string;
  isLiveMode: boolean;
  adminPassword?: string;
  smtpHost?: string;
  smtpPort?: string;
  smtpUser?: string;
  smtpPass?: string;
  smtpSender?: string;
}

export interface Review {
  id: string;
  courseId: string;
  studentId: string;
  studentName: string;
  rating: number;
  comment: string;
  timestamp: number;
}

export interface SupportMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: number;
  isRead: boolean;
  courseId?: string;
}

export interface EmailNotification {
  id: string;
  transactionId: string;
  recipientEmail: string;
  studentName: string;
  courseTitle: string;
  type: 'WELCOME' | 'VERIFICATION' | 'NEW_COURSE';
  subject: string;
  body: string;
  status: 'SENT' | 'FAILED';
  timestamp: number;
  dispatched?: boolean;
  smtpError?: string;
}

export interface AppUser {
  id: string;
  email: string;
  displayName: string;
  unlockedCourses: string[];
  isAdmin: boolean;
  createdAt?: number;
}

