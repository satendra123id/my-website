import { Course, Transaction, GatewaySettings } from '../types';

export const DEFAULT_COURSES: Course[] = [
  {
    id: 'mern-bootcamp',
    title: 'Full-Stack Web Development Bootcamp (MERN Stack)',
    description: 'Master HTML, CSS, JavaScript, React 19, Node.js, Express, and MongoDB. Build and deploy real production-ready websites and APIs from scratch.',
    price: 499,
    originalPrice: 4999,
    thumbnail: 'https://images.unsplash.com/photo-1547082299-de196ea013d6?q=80&w=600&auto=format&fit=crop',
    category: 'DEVELOPMENT',
    lecturesCount: 2,
    filesCount: 3,
    videos: [
      { id: 'v1', title: 'Getting Started with React 19 & Vite', url: 'https://www.youtube.com/watch?v=kYJ462wX1i0' },
      { id: 'v2', title: 'Express & Node JS Server Setup', url: 'https://www.youtube.com/watch?v=ZfKn_7YtK04' },
      { id: 'v3', title: 'MongoDB Database Integration', url: 'https://www.youtube.com/watch?v=kYJ462wX1i0' },
      { id: 'v4', title: 'Building the UI Components', url: 'https://www.youtube.com/watch?v=ZfKn_7YtK04' },
      { id: 'v5', title: 'Authentication & Deployment', url: 'https://www.youtube.com/watch?v=kYJ462wX1i0' }
    ],
    attachments: [
      { id: 'a1', name: 'React 19 Core Cheat Sheet.pdf', url: 'https://raw.githubusercontent.com/duong-g/react-cheat-sheet/master/react-cheat-sheet.pdf', size: '1.2 MB' },
      { id: 'a2', name: 'Express Boilerplate Architecture Guide.pdf', url: 'https://raw.githubusercontent.com/duong-g/react-cheat-sheet/master/react-cheat-sheet.pdf', size: '4.5 MB' },
      { id: 'a3', name: 'MERN Stack Architecture Roadmap.png', url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1200&auto=format&fit=crop', size: '840 KB' },
      { id: 'a4', name: 'MongoDB Setup Guide.pdf', url: 'https://raw.githubusercontent.com/duong-g/react-cheat-sheet/master/react-cheat-sheet.pdf', size: '2.1 MB' },
      { id: 'a5', name: 'Deployment Checklist.pdf', url: 'https://raw.githubusercontent.com/duong-g/react-cheat-sheet/master/react-cheat-sheet.pdf', size: '950 KB' }
    ],
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000
  },
  {
    id: 'ai-automation',
    title: 'Artificial Intelligence & ChatGPT Automation Guide',
    description: 'Learn professional prompt engineering, setting up LLM agent automations, writing custom GPTS, and running high-speed neural networks in custom workflows.',
    price: 199,
    originalPrice: 1999,
    thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?q=80&w=600&auto=format&fit=crop',
    category: 'AI / AUTOMATION',
    lecturesCount: 1,
    filesCount: 2,
    videos: [
      { id: 'v1', title: 'Automating Workflows with Gemini & ChatGPT API', url: 'https://www.youtube.com/watch?v=Ke90Tje7VS0' },
      { id: 'v2', title: 'Building Custom AI Agents', url: 'https://www.youtube.com/watch?v=Ke90Tje7VS0' },
      { id: 'v3', title: 'Advanced Prompt Engineering', url: 'https://www.youtube.com/watch?v=Ke90Tje7VS0' },
      { id: 'v4', title: 'Integrating LLMs into Web Apps', url: 'https://www.youtube.com/watch?v=Ke90Tje7VS0' }
    ],
    attachments: [
      { id: 'a1', name: 'ChatGPT Prompt Engineering Handbook.pdf', url: 'https://static.googleusercontent.com/media/www.google.com/en//webmasters/docs/search-engine-optimization-starter-guide.pdf', size: '2.8 MB' },
      { id: 'a2', name: 'Gemini API Quickstart Script.js', url: 'https://raw.githubusercontent.com/google-gemini/cookbook/main/quickstarts/Gemini_API_Quickstart.ipynb', size: '12 KB' },
      { id: 'a3', name: 'AI Agent Architecture Guide.pdf', url: 'https://static.googleusercontent.com/media/www.google.com/en//webmasters/docs/search-engine-optimization-starter-guide.pdf', size: '1.5 MB' },
      { id: 'a4', name: 'LLM Integration Checklist.pdf', url: 'https://static.googleusercontent.com/media/www.google.com/en//webmasters/docs/search-engine-optimization-starter-guide.pdf', size: '800 KB' }
    ],
    createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000
  },
  {
    id: 'digital-marketing',
    title: 'Digital Marketing & Content Mastery',
    description: 'Unlock Google Ads, SEO blueprint formulas, copy writing with conversion optimization, and social media organic growth frameworks easily.',
    price: 299,
    originalPrice: 2999,
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=600&auto=format&fit=crop',
    category: 'MARKETING',
    lecturesCount: 2,
    filesCount: 3,
    videos: [
      { id: 'v1', title: 'SEO Keyword Research Masterclass', url: 'https://www.youtube.com/watch?v=9_pco8X5F5E' },
      { id: 'v2', title: 'High-Converting Landing Page Frameworks', url: 'https://www.youtube.com/watch?v=U_P2FNDoMlw' },
      { id: 'v3', title: 'Google Ads Campaign Setup', url: 'https://www.youtube.com/watch?v=9_pco8X5F5E' },
      { id: 'v4', title: 'Facebook Ads Targeting Strategy', url: 'https://www.youtube.com/watch?v=U_P2FNDoMlw' }
    ],
    attachments: [
      { id: 'a1', name: 'High-Converting Copywriting Templates.docx', url: 'https://raw.githubusercontent.com/dianper/copywriting-templates/master/README.md', size: '150 KB' },
      { id: 'a2', name: 'Google Ads Launch Checklist.xlsx', url: 'https://raw.githubusercontent.com/google/google-ads-api-report-templates/main/README.md', size: '220 KB' },
      { id: 'a3', name: 'Social Media Growth Roadmap.pdf', url: 'https://raw.githubusercontent.com/facebook/facebook-nodejs-business-sdk/main/README.md', size: '1.7 MB' },
      { id: 'a4', name: 'SEO Optimization Guide.pdf', url: 'https://raw.githubusercontent.com/facebook/facebook-nodejs-business-sdk/main/README.md', size: '2.5 MB' },
      { id: 'a5', name: 'Email Marketing Campaign Planner.xlsx', url: 'https://raw.githubusercontent.com/facebook/facebook-nodejs-business-sdk/main/README.md', size: '300 KB' }
    ],
    createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000
  }
];

export const DEFAULT_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx_1',
    studentEmail: 'google_student@gmail.com',
    studentName: 'Google Student',
    courseId: 'mern-bootcamp',
    courseTitle: 'Full-Stack Web Development Bootcamp (MERN Stack)',
    amount: 499,
    method: 'UPI',
    refUtrId: '5431282781349',
    status: 'SUCCESS',
    timestamp: Date.now() - 4 * 3600 * 1000
  },
  {
    id: 'tx_2',
    studentEmail: 'satendrlodhi711@gmail.com',
    studentName: 'Satendra Lodhi',
    courseId: 'mern-bootcamp',
    courseTitle: 'Full-Stack Web Development Bootcamp (MERN Stack)',
    amount: 499,
    method: 'UPI',
    refUtrId: '247791760872',
    status: 'SUCCESS',
    timestamp: Date.now() - 2 * 3600 * 1000
  },
  {
    id: 'tx_3',
    studentEmail: 'satendrlodhi711@gmail.com',
    studentName: 'Satendra Lodhi',
    courseId: 'ai-automation',
    courseTitle: 'Artificial Intelligence & ChatGPT Automation Guide',
    amount: 199,
    method: 'UPI',
    refUtrId: '904857391039',
    status: 'SUCCESS',
    timestamp: Date.now() - 1 * 3600 * 1000
  },
  {
    id: 'tx_4',
    studentEmail: 'rahul_kumar@gmail.com',
    studentName: 'Rahul Kumar',
    courseId: 'mern-bootcamp',
    courseTitle: 'Full-Stack Web Development Bootcamp (MERN Stack)',
    amount: 499,
    method: 'UPI',
    refUtrId: '103948573920',
    status: 'PENDING',
    timestamp: Date.now() - 30 * 60 * 1000
  }
];

export const DEFAULT_SETTINGS: GatewaySettings = {
  razorpayKeyId: 'rzp_live_T9VYFGs0wv50Fc',
  razorpayKeySecret: 'yG4z16yoBijp6qLM4hlvpC0y',
  razorpayWebhookSecret: 'sitaram12',
  upiVpa: 'sitaram322530.rzp@rxairtel',
  isLiveMode: true,
  adminPassword: '@#$sitaram12@#$',
  smtpHost: '',
  smtpPort: '',
  smtpUser: '',
  smtpPass: '',
  smtpSender: ''
};
