import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  query, 
  orderBy, 
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  MessageSquare, 
  Send, 
  Users, 
  Radio, 
  Sparkles,
  User,
  ShieldCheck,
  Wrench,
  Car
} from 'lucide-react';
import { PublicGroupMessage } from '../types';

interface PublicGroupChatProps {
  lang: 'ar' | 'en' | 'he';
  currentUserRole: 'client' | 'technician' | 'admin' | null;
  currentUserName: string;
  currentUserEmail?: string;
  currentUserAvatar?: string;
}

export const PublicGroupChat: React.FC<PublicGroupChatProps> = ({
  lang,
  currentUserRole,
  currentUserName,
  currentUserEmail,
  currentUserAvatar
}) => {
  const [messages, setMessages] = useState<PublicGroupMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial Seed Messages if collection is empty
  const defaultInitialMessages: PublicGroupMessage[] = [
    {
      id: 'welcome-01',
      senderName: lang === 'ar' ? 'إدارة سيسترو (البث المباشر)' : 'Systro Central Broadcast',
      senderRole: 'admin',
      text: lang === 'ar' 
        ? '👋 أهلاً بك في غرفة المحادثة الجماعية المباشرة! يمكن للزبائن والفنيين التواصل فوراً وتداول الاستفسارات هنا.' 
        : '👋 Welcome to the live group chat room! Clients and technicians can communicate in real time here.',
      timestamp: new Date().toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
      createdTime: Date.now() - 3600000
    },
    {
      id: 'welcome-02',
      senderName: lang === 'ar' ? 'المهندس أحمد (فني معتمد)' : 'Eng. Ahmed (Certified Tech)',
      senderRole: 'technician',
      senderAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=120',
      text: lang === 'ar' 
        ? '🛠️ متواجد الآن على الطريق السريع وجاهز لتقديم خدمة السحب والإنعاش الميكانيكي!' 
        : '🛠️ Available now on the highway ready for towing & roadside recovery!',
      timestamp: new Date(Date.now() - 1800000).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
      createdTime: Date.now() - 1800000
    }
  ];

  // Subscribe to real-time updates from Firestore 'public_group_chat'
  useEffect(() => {
    let unsubscribe: () => void = () => {};
    try {
      const chatRef = collection(db, 'public_group_chat');
      const q = query(chatRef, orderBy('createdTime', 'asc'), limit(100));

      unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const fetchedMsgs: PublicGroupMessage[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            fetchedMsgs.push({
              id: docSnap.id,
              senderName: data.senderName || (lang === 'ar' ? 'مستخدم' : 'User'),
              senderEmail: data.senderEmail || '',
              senderRole: data.senderRole || 'client',
              senderAvatar: data.senderAvatar || '',
              text: data.text || '',
              timestamp: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              createdTime: data.createdTime || Date.now()
            });
          });
          setMessages(fetchedMsgs);
        } else {
          setMessages(defaultInitialMessages);
        }
      }, (err) => {
        console.warn('Firestore group chat snapshot notice:', err);
        setMessages(defaultInitialMessages);
      });
    } catch (e) {
      console.warn('Firestore group chat setup notice:', e);
      setMessages(defaultInitialMessages);
    }

    return () => unsubscribe();
  }, [lang]);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanText = inputText.trim();
    if (!cleanText || isSending) return;

    setIsSending(true);

    const now = new Date();
    const formattedTime = now.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    const displayName = currentUserName?.trim() || (currentUserRole === 'technician' 
      ? (lang === 'ar' ? 'فني معتمد' : 'Certified Tech') 
      : (lang === 'ar' ? 'زبون' : 'Client'));

    const newMsgData: Omit<PublicGroupMessage, 'id'> = {
      senderName: displayName,
      senderEmail: currentUserEmail || '',
      senderRole: currentUserRole || 'client',
      senderAvatar: currentUserAvatar || '',
      text: cleanText,
      timestamp: formattedTime,
      createdTime: Date.now()
    };

    // Optimistic local update
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: PublicGroupMessage = { id: tempId, ...newMsgData };
    setMessages(prev => [...prev, optimisticMsg]);
    setInputText('');

    try {
      await addDoc(collection(db, 'public_group_chat'), {
        ...newMsgData,
        createdAtServer: serverTimestamp()
      });
    } catch (error) {
      console.warn('Firestore chat write notice, kept local:', error);
    } finally {
      setIsSending(false);
    }
  };

  const sendQuickTemplate = (text: string) => {
    setInputText(text);
  };

  return (
    <div className="w-full bg-white border-2 border-amber-400/90 rounded-3xl p-4 md:p-6 shadow-xl relative overflow-hidden font-sans text-slate-900">
      {/* Soft Background Accent Gradients */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-100/60 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-100/60 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/30 shrink-0">
            <MessageSquare className="w-6 h-6 fill-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base md:text-lg font-black text-slate-900 tracking-tight">
                {lang === 'ar' ? '💬 المحادثة الجماعية المباشرة (شبكة الفنيين والزبائن)' : '💬 Live Network Group Chat'}
              </h3>
              <span className="flex items-center gap-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full text-xs font-black font-mono shadow-sm">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                <span>{lang === 'ar' ? 'بث حي 📡' : 'LIVE 📡'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-600 font-bold mt-0.5">
              {lang === 'ar' 
                ? 'قناة تواصل عامة وتشاركية تتيح للجميع (الفنيين، الزبائن، الإدارة) تبادل الرسائل فوراً.' 
                : 'Open real-time broadcast chat channel connecting all technicians, clients, and platform support.'}
            </p>
          </div>
        </div>

        {/* Sender Info Badge */}
        <div className="flex items-center gap-2 bg-slate-100 px-3.5 py-2 rounded-2xl border border-slate-300 shrink-0 self-start sm:self-center shadow-sm">
          <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-bold overflow-hidden shadow-inner">
            {currentUserAvatar ? (
              <img src={currentUserAvatar} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-4 h-4" />
            )}
          </div>
          <div className="text-right rtl:text-right ltr:text-left">
            <span className="text-[10px] text-slate-500 font-bold block leading-none">
              {lang === 'ar' ? 'تتحدث بصفتك:' : 'Posting as:'}
            </span>
            <span className="text-xs font-black text-slate-900 flex items-center gap-1 font-sans mt-0.5">
              {currentUserRole === 'technician' ? (
                <>
                  <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">{currentUserName || (lang === 'ar' ? 'فني معتمد' : 'Technician')}</span>
                </>
              ) : currentUserRole === 'admin' ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                  <span className="text-purple-700">{lang === 'ar' ? 'إدارة سيسترو' : 'Systro Admin'}</span>
                </>
              ) : (
                <>
                  <Car className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-blue-700">{currentUserName || (lang === 'ar' ? 'زبون' : 'Client')}</span>
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Fast Action Templates */}
      <div className="flex items-center gap-2 my-3 overflow-x-auto pb-1 scrollbar-none relative z-10">
        <span className="text-xs text-slate-700 font-black shrink-0 flex items-center gap-1">
          ⚡ {lang === 'ar' ? 'اختصارات سريعة:' : 'Quick Prompts:'}
        </span>
        <button
          type="button"
          onClick={() => sendQuickTemplate(lang === 'ar' ? '🚨 محتاج مساعدة عاجلة وتدخل فوري على الطريق!' : '🚨 Need immediate emergency breakdown assistance!')}
          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer shadow-sm active:scale-95"
        >
          🚨 {lang === 'ar' ? 'طلب إنقاذ عاجل' : 'Emergency Help'}
        </button>
        <button
          type="button"
          onClick={() => sendQuickTemplate(lang === 'ar' ? '🛠️ متواجد حالياً وجاهز لتقديم خدمة الصيانة والإنقاذ' : '🛠️ Active & ready to provide maintenance service')}
          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer shadow-sm active:scale-95"
        >
          🛠️ {lang === 'ar' ? 'فني متوفر الآن' : 'Tech Available'}
        </button>
        <button
          type="button"
          onClick={() => sendQuickTemplate(lang === 'ar' ? '📍 أرجو تزويدي بالموقع الجغرافي دقيقاً' : '📍 Please send exact GPS coordinates')}
          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer shadow-sm active:scale-95"
        >
          📍 {lang === 'ar' ? 'طلب الموقع' : 'Location Request'}
        </button>
        <button
          type="button"
          onClick={() => sendQuickTemplate(lang === 'ar' ? 'السلام عليكم ورأفة بالسلامة للجميع 👍' : 'Hello everyone, drive safe! 👍')}
          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer shadow-sm active:scale-95"
        >
          👋 {lang === 'ar' ? 'تحية السلام' : 'Greeting'}
        </button>
      </div>

      {/* Messages Display Stream */}
      <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 h-72 md:h-80 overflow-y-auto space-y-3.5 shadow-inner relative z-10">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 font-bold text-center gap-2">
            <Radio className="w-8 h-8 text-amber-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-700">
              {lang === 'ar' ? 'لا توجد رسائل سابقة. كن أول من يبدأ المحادثة الآن!' : 'No messages yet. Be the first to start the chat!'}
            </span>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = (currentUserEmail && msg.senderEmail === currentUserEmail) || msg.senderName === currentUserName;
            const isTech = msg.senderRole === 'technician';
            const isAdmin = msg.senderRole === 'admin';

            return (
              <div 
                key={msg.id} 
                className={`flex gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                {!isMe && (
                  <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-xs text-slate-800 font-bold shrink-0 overflow-hidden mt-1 shadow-sm">
                    {msg.senderAvatar ? (
                      <img src={msg.senderAvatar} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span>{msg.senderName?.substring(0, 1) || 'U'}</span>
                    )}
                  </div>
                )}

                <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 text-right rtl:text-right ltr:text-left shadow-sm transition-all ${
                  isMe 
                    ? 'bg-amber-500 text-slate-950 rounded-tr-none border border-amber-600 font-black' 
                    : isAdmin
                    ? 'bg-purple-50 text-purple-950 rounded-tl-none border border-purple-300'
                    : isTech
                    ? 'bg-emerald-50 text-emerald-950 rounded-tl-none border border-emerald-300'
                    : 'bg-white text-slate-900 rounded-tl-none border border-slate-300'
                }`}>
                  {/* Sender Name & Role Badge */}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs font-black font-sans ${isMe ? 'text-slate-950' : 'text-slate-900'}`}>
                      {msg.senderName}
                    </span>

                    {isAdmin ? (
                      <span className="bg-purple-200 text-purple-900 border border-purple-300 text-[10px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-purple-700" />
                        <span>{lang === 'ar' ? 'إدارة المنصة' : 'Admin'}</span>
                      </span>
                    ) : isTech ? (
                      <span className="bg-emerald-200 text-emerald-900 border border-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                        <Wrench className="w-3 h-3 text-emerald-700" />
                        <span>{lang === 'ar' ? 'فني معتمد' : 'Tech'}</span>
                      </span>
                    ) : (
                      <span className="bg-blue-200 text-blue-900 border border-blue-300 text-[10px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                        <Car className="w-3 h-3 text-blue-700" />
                        <span>{lang === 'ar' ? 'عميل' : 'Client'}</span>
                      </span>
                    )}

                    <span className={`text-[10px] font-mono font-bold ml-auto ${isMe ? 'text-slate-900' : 'text-slate-500'}`}>
                      {msg.timestamp}
                    </span>
                  </div>

                  {/* Message Content */}
                  <p className={`text-xs leading-relaxed whitespace-pre-wrap ${isMe ? 'text-slate-950 font-black' : 'text-slate-900 font-bold'}`}>
                    {msg.text}
                  </p>
                </div>

                {isMe && (
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 border border-amber-600 flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden mt-1 shadow-sm">
                    {currentUserAvatar ? (
                      <img src={currentUserAvatar} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span>{currentUserName?.substring(0, 1) || 'Me'}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Send Message Input Controls */}
      <form onSubmit={handleSendMessage} className="mt-3 flex items-center gap-2 relative z-10">
        <div className="flex-1 relative">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={lang === 'ar' ? 'اكتب رسالتك للمحادثة الجماعية الحية...' : 'Type a message to the public group chat...'}
            className="w-full px-4 py-3.5 bg-white border-2 border-slate-300 focus:border-amber-500 rounded-2xl outline-none text-xs font-bold text-slate-900 placeholder-slate-400 transition-colors shadow-sm"
          />
        </div>

        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          className="px-6 py-3.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:hover:bg-amber-500 text-slate-950 font-black rounded-2xl transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-amber-500/30 shrink-0 border border-amber-600 active:scale-95"
        >
          <Send className="w-4 h-4 fill-slate-950" />
          <span className="text-xs font-black">{lang === 'ar' ? 'إرسال 🚀' : 'Send 🚀'}</span>
        </button>
      </form>
    </div>
  );
};

export default PublicGroupChat;
