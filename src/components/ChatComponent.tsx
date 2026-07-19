import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';

interface ChatComponentProps {
  courseId?: string;
  isAdminView?: boolean;
  studentEmail?: string;
  studentName?: string;
}

export default function ChatComponent({ courseId, isAdminView, studentEmail, studentName }: ChatComponentProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [selectedStudentEmail, setSelectedStudentEmail] = useState<string | null>(studentEmail || null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
        console.log("Auth state changed, user:", currentUser?.email);
        setUser(currentUser);
    });

    const q = query(
        collection(db, 'support_messages'),
        orderBy('timestamp', 'asc')
    );

    const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log("Fetched messages:", msgs.length);
      setMessages(msgs);
    });

    return () => {
        unsubscribeAuth();
        unsubscribeSnapshot();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedStudentEmail]);

  const students = Array.from(
    new Set(
      messages
        .flatMap(m => [m.senderId, m.recipientId])
        .filter((id): id is string => !!id && id.toLowerCase() !== 'admin@admin.com')
    )
  );

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    const currentUser = auth.currentUser;
    if (isAdminView && !selectedStudentEmail) {
      alert("Please select a student to reply to.");
      return;
    }

    try {
      await addDoc(collection(db, 'support_messages'), {
        senderId: isAdminView ? 'admin@admin.com' : (currentUser?.email?.toLowerCase() || 'anonymous'),
        senderName: isAdminView ? 'Support Team' : (currentUser?.displayName || currentUser?.email || 'Anonymous Student'),
        message: newMessage,
        timestamp: serverTimestamp(),
        isRead: false,
        courseId: courseId || null,
        recipientId: isAdminView ? selectedStudentEmail?.toLowerCase() : 'admin@admin.com'
      });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message: ", error);
      alert("Failed to send message: " + (error as Error).message);
    }
  };

  const filteredMessages = isAdminView
    ? (selectedStudentEmail 
        ? messages.filter(m => m.senderId?.toLowerCase() === selectedStudentEmail.toLowerCase() || m.recipientId?.toLowerCase() === selectedStudentEmail.toLowerCase())
        : messages) 
    : messages.filter(m => {
        const userEmail = user?.email?.toLowerCase();
        if (!userEmail) return false;
        return m.senderId?.toLowerCase() === userEmail || m.recipientId?.toLowerCase() === userEmail;
    });

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 h-[500px] flex gap-4">
      {isAdminView && (
        <div className="w-1/3 border-r border-slate-200 overflow-y-auto pr-4">
          <h4 className="text-slate-900 font-bold mb-4">Students</h4>
          {students.map(studentId => (
            <div 
                key={studentId} 
                className={`p-3 rounded-lg cursor-pointer ${selectedStudentEmail === studentId ? 'bg-slate-100' : 'hover:bg-slate-100'}`}
                onClick={() => setSelectedStudentEmail(studentId)}
            >
                <p className="text-slate-900 text-sm font-medium">{studentId}</p>
            </div>
          ))}
        </div>
      )}
      <div className={`flex-1 flex flex-col ${isAdminView && !selectedStudentEmail ? 'items-center justify-center text-slate-400' : ''}`}>
        {isAdminView && !selectedStudentEmail ? (
            <p>Select a student to start chatting</p>
        ) : (
            <>
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {filteredMessages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.senderId === (isAdminView ? 'admin@admin.com' : user?.email) ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-3 rounded-xl max-w-[80%] ${msg.senderId === (isAdminView ? 'admin@admin.com' : user?.email) ? 'bg-indigo-600' : 'bg-slate-100'}`}>
                      <p className="text-xs text-slate-400 mb-1">{msg.senderName}</p>
                      <p className="text-sm text-slate-900">{msg.message}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="flex gap-2">
                <input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      sendMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-900 text-sm"
                />
                <button onClick={sendMessage} className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 cursor-pointer">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
        )}
      </div>
    </div>
  );
}
