import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Bell } from 'lucide-react';

export default function DailyCourseNotifier() {
  const [notification, setNotification] = useState<string | null>(null);
  const firstRun = useRef(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system_config', 'latest_course'), (doc) => {
      if (firstRun.current) {
        firstRun.current = false;
        return;
      }
      if (doc.exists()) {
        setNotification('New Daily Course Posted!');
        setTimeout(() => setNotification(null), 10000); // Hide after 10s
      }
    });
    return unsub;
  }, []);

  if (!notification) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] bg-slate-50 border border-accent-500/50 p-4 rounded-2xl shadow-2xl animate-fade-in flex items-center gap-3">
        <Bell className="w-5 h-5 text-indigo-600 animate-pulse" />
        <p className="text-sm font-bold text-slate-900">{notification}</p>
        <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-900">✕</button>
    </div>
  );
}
