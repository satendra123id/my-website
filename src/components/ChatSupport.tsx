import React, { useState, useEffect, useRef } from 'react';
import { Send, X, MessageSquare } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';

interface ChatSupportProps {
  courseId?: string;
  studentEmail?: string;
  studentName?: string;
  onCloseChat?: () => void;
}

export default function ChatSupport({ courseId, studentEmail, studentName, onCloseChat }: ChatSupportProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Monitor Firebase Auth state change as well
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
        console.log("ChatSupport auth state changed:", currentUser?.email);
        setUser(currentUser);
    });
    return () => {
        unsubscribeAuth();
    };
  }, []);

  // Determine the active user credentials (either from props or from firebase auth)
  const activeEmail = studentEmail || user?.email || '';
  const activeName = studentName || user?.displayName || activeEmail.split('@')[0] || 'Student';

  // Listen to support messages in real-time
  useEffect(() => {
    if (!activeEmail) {
      console.log("ChatSupport: No activeEmail, resetting messages");
      setMessages([]);
      return;
    }

    const emailLower = activeEmail.toLowerCase();
    console.log("ChatSupport: Subscribing to messages for:", emailLower);

    const q = query(
        collection(db, 'support_messages'),
        orderBy('timestamp', 'asc')
    );

    const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
      console.log("ChatSupport: Snapshot received, count:", snapshot.docs.length);
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      const filteredMsgs = msgs.filter(m => {
        const sender = m.senderId?.toLowerCase();
        const recipient = m.recipientId?.toLowerCase();
        return sender === emailLower || recipient === emailLower;
      });

      // Explicitly sort messages by timestamp in ascending order in JavaScript to ensure 100% correct chronological layout.
      const sortedMsgs = filteredMsgs.sort((a, b) => {
        const timeA = typeof a.timestamp === 'number' ? a.timestamp : (a.timestamp?.seconds ? a.timestamp.seconds * 1000 : 0);
        const timeB = typeof b.timestamp === 'number' ? b.timestamp : (b.timestamp?.seconds ? b.timestamp.seconds * 1000 : 0);
        return timeA - timeB;
      });

      console.log("ChatSupport: Sorted messages count:", sortedMsgs.length);
      setMessages(sortedMsgs);
    }, (error) => {
      console.error("ChatSupport: onSnapshot error:", error);
    });

    return () => {
      unsubscribeSnapshot();
    };
  }, [activeEmail]);

  useEffect(() => {
    // Scroll smoothly to bottom on load, new messages, or typing status changes
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
    return () => clearTimeout(timer);
  }, [messages, isAiTyping]);

  const sendMessage = async () => {
    console.log("ChatSupport sendMessage start");
    
    if (!newMessage.trim()) {
        console.log("ChatSupport sendMessage: Message is empty");
        return;
    }
    
    console.log("ChatSupport sendMessage: activeEmail:", activeEmail);
    
    if (!activeEmail) {
        console.log("ChatSupport sendMessage: Active email not found");
        alert("You must be logged in to send messages.");
        return;
    }

    const msgToSend = newMessage;
    setNewMessage('');

    try {
      console.log("ChatSupport sendMessage: Attempting to add message to Firestore");
      const messageData = {
        senderId: activeEmail.toLowerCase(),
        senderName: activeName,
        message: msgToSend,
        timestamp: Date.now(),
        isRead: false,
        courseId: courseId || null,
        recipientId: 'admin@admin.com'
      };
      console.log("ChatSupport sendMessage: messageData:", messageData);
      
      const docRef = await addDoc(collection(db, 'support_messages'), messageData);
      console.log("ChatSupport sendMessage: Message added successfully with ID:", docRef.id);
      
      // Trigger Gemini AI Support Reply
      setIsAiTyping(true);
      
      // Map current messages for chat history context
      const historyContext = messages.map(m => ({
        senderId: m.senderId,
        senderName: m.senderName,
        message: m.message
      }));

      fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentEmail: activeEmail,
          studentName: activeName,
          message: msgToSend,
          courseId: courseId || null,
          history: historyContext
        })
      })
      .then(res => res.json())
      .then(data => {
        console.log("AI reply processed:", data);
      })
      .catch(err => {
        console.error("AI reply triggering failed:", err);
      })
      .finally(() => {
        setIsAiTyping(false);
      });

    } catch (error) {
      console.error("ChatSupport sendMessage: Error sending message: ", error);
      alert("Failed to send message: " + (error as Error).message);
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 h-full flex flex-col shadow-2xl">
      <div className="flex items-center justify-between mb-4 border-b border-slate-200/80 pb-3" id="support-chat-header">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <div>
            <h3 className="text-slate-900 font-bold text-sm tracking-wide">Support Chat</h3>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">We typically reply in minutes</span>
          </div>
        </div>
        {onCloseChat && (
          <button 
            type="button" 
            onClick={onCloseChat} 
            className="text-slate-500 hover:text-slate-900 p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Close Chat"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
        {messages.map(msg => {
          const isSenderMe = msg.senderId?.toLowerCase() === activeEmail.toLowerCase();
          return (
            <div key={msg.id} className={`flex flex-col ${isSenderMe ? 'items-end' : 'items-start'} space-y-1`}>
              <span className="text-[10px] text-slate-400 font-bold px-1">
                {isSenderMe ? 'You' : (msg.senderName || 'Support Team')}
              </span>
              <div className={`p-3 rounded-2xl max-w-[85%] shadow-md leading-relaxed ${
                isSenderMe 
                  ? 'bg-indigo-600 text-white font-semibold rounded-tr-none' 
                  : 'bg-slate-100/90 text-slate-900 rounded-tl-none border border-slate-100'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
              </div>
            </div>
          );
        })}
        {isAiTyping && (
          <div className="flex flex-col items-start space-y-1">
            <span className="text-[10px] text-slate-400 font-bold px-1">Support Team</span>
            <div className="p-3 bg-slate-100/90 border border-slate-100 rounded-2xl rounded-tl-none max-w-[80%] flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold animate-pulse">typing</span>
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex gap-2">
        <input
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              sendMessage();
            }
          }}
          placeholder="Type your message..."
          className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-indigo-600/50 focus:ring-1 focus:ring-indigo-600/50 transition-all placeholder:text-slate-400 font-medium"
        />
        <button 
          type="button" 
          onClick={() => { console.log("Button clicked"); sendMessage(); }} 
          className="bg-accent-600 hover:bg-indigo-600 text-white p-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-md shadow-accent-950/25 flex items-center justify-center shrink-0"
        >
          <Send className="w-4 h-4 font-bold" />
        </button>
      </div>
    </div>
  );
}
