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
  Car,
  Bot
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
    <div className="w-full bg-[#0A0D18] border border-amber-500/30 rounded-3xl p-4 md:p-6 shadow-2xl relative overflow-hidden font-sans">
      {/* Background Accent Gradient */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 shrink-0">
            <MessageSquare className="w-5 h-5 fill-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm md:text-base font-black text-white tracking-wide">
                {lang === 'ar' ? '💬 المحادثة الجماعية المباشرة (شبكة الفنيين والزبائن)' : '💬 Live Public Network Group Chat'}
              </h3>
              <span className="flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-black font-mono">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                <span>{lang === 'ar' ? 'بث حي 📡' : 'LIVE 📡'}</span>
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-semibold mt-0.5">
              {lang === 'ar' 
                ? 'قناة تواصل عامة وتشاركية تتيح للجميع (الفنيين، الزبائن، الإدارة) تبادل الرسائل فوراً.' 
                : 'Open real-time broadcast chat channel connecting all technicians, clients, and platform support.'}
            </p>
          </div>
        </div>

        {/* Sender Info Badge */}
        <div className="flex items-center gap-2 bg-[#111625] px-3 py-1.5 rounded-2xl border border-gray-800 shrink-0 self-start sm:self-center">
          <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold overflow-hidden">
            {currentUserAvatar ? (
              <img src={currentUserAvatar} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-3.5 h-3.5" />
            )}
          </div>
          <div className="text-right rtl:text-right ltr:text-left">
            <span className="text-[10px] text-gray-400 font-bold block leading-none">
              {lang === 'ar' ? 'تتحدث بصفتك:' : 'Posting as:'}
            </span>
            <span className="text-[11px] font-black text-amber-400 flex items-center gap-1 font-sans">
              {currentUserRole === 'technician' ? (
                <>
                  <Wrench className="w-3 h-3 text-emerald-400" />
                  <span>{currentUserName || (lang === 'ar' ? 'فني معتمد' : 'Technician')}</span>
                </>
              ) : currentUserRole === 'admin' ? (
                <>
                  <ShieldCheck className="w-3 h-3 text-amber-400" />
                  <span>{lang === 'ar' ? 'إدارة سيسترو' : 'Systro Admin'}</span>
                </>
              ) : (
                <>
                  <Car className="w-3 h-3 text-blue-400" />
                  <span>{currentUserName || (lang === 'ar' ? 'زبون' : 'Client')}</span>
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Fast Action Templates */}
      <div className="flex items-center gap-2 my-3 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[10px] text-gray-500 font-bold shrink-0">
          ⚡ {lang === 'ar' ? 'اختصارات سريعة:' : 'Quick Prompts:'}
        </span>
        <button
          type="button"
          onClick={() => sendQuickTemplate(lang === 'ar' ? '🚨 محتاج مساعدة عاجلة وتدخل فوري على الطريق!' : '🚨 Need immediate emergency breakdown assistance!')}
          className="px-2.5 py-1 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-900/50 rounded-xl text-[10px] font-bold shrink-0 transition-all cursor-pointer"
        >
          🚨 {lang === 'ar' ? 'طلب إنقاذ عاجل' : 'Emergency Help'}
        </button>
        <button
          type="button"
          onClick={() => sendQuickTemplate(lang === 'ar' ? '🛠️ متواجد حالياً وجاهز لتقديم خدمة الصيانة والإنقاذ' : '🛠️ Active & ready to provide maintenance service')}
          className="px-2.5 py-1 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-900/50 rounded-xl text-[10px] font-bold shrink-0 transition-all cursor-pointer"
        >
          🛠️ {lang === 'ar' ? 'فني متوفر الآن' : 'Tech Available'}
        </button>
        <button
          type="button"
          onClick={() => sendQuickTemplate(lang === 'ar' ? '📍 أرجو تزويدي بالموقع الجغرافي دقيقاً' : '📍 Please send exact GPS coordinates')}
          className="px-2.5 py-1 bg-blue-950/40 hover:bg-blue-900/60 text-blue-300 border border-blue-900/50 rounded-xl text-[10px] font-bold shrink-0 transition-all cursor-pointer"
        >
          📍 {lang === 'ar' ? 'طلب الموقع' : 'Location Request'}
        </button>
        <button
          type="button"
          onClick={() => sendQuickTemplate(lang === 'ar' ? 'السلام عليكم ورأفة بالسلامة للجميع 👍' : 'Hello everyone, drive safe! 👍')}
          className="px-2.5 py-1 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-900/50 rounded-xl text-[10px] font-bold shrink-0 transition-all cursor-pointer"
        >
          👋 {lang === 'ar' ? 'تحية السلام' : 'Greeting'}
        </button>
      </div>

      {/* Messages Display Stream */}
      <div className="bg-[#05070E] border border-gray-900 rounded-2xl p-4 h-72 md:h-80 overflow-y-auto space-y-3.5 shadow-inner">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 font-bold text-center gap-2">
            <Radio className="w-8 h-8 text-amber-500/40 animate-pulse" />
            <span className="text-xs">
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
                  <div className="w-8 h-8 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center text-xs text-amber-400 font-bold shrink-0 overflow-hidden mt-1">
                    {msg.senderAvatar ? (
                      <img src={msg.senderAvatar} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span>{msg.senderName?.substring(0, 1) || 'U'}</span>
                    )}
                  </div>
                )}

                <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 text-right rtl:text-right ltr:text-left shadow-md transition-all ${
                  isMe 
                    ? 'bg-amber-500 text-slate-950 rounded-tr-none border border-amber-400' 
                    : isAdmin
                    ? 'bg-gradient-to-r from-purple-950/80 to-[#121024] text-purple-200 rounded-tl-none border border-purple-800/60'
                    : isTech
                    ? 'bg-emerald-950/60 text-emerald-100 rounded-tl-none border border-emerald-900/60'
                    : 'bg-[#111827] text-gray-100 rounded-tl-none border border-gray-850'
                }`}>
                  {/* Sender Name & Role Badge */}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[11px] font-black font-sans ${isMe ? 'text-slate-950' : 'text-white'}`}>
                      {msg.senderName}
                    </span>

                    {isAdmin ? (
                      <span className="bg-purple-500/30 text-purple-300 border border-purple-500/40 text-[9px] font-extrabold px-2 py-0.2 rounded-full uppercase flex items-center gap-1">
                        <ShieldCheck className="w-2.5 h-2.5 text-purple-400" />
                        <span>{lang === 'ar' ? 'إدارة المنصة' : 'Admin'}</span>
                      </span>
                    ) : isTech ? (
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-extrabold px-2 py-0.2 rounded-full uppercase flex items-center gap-1">
                        <Wrench className="w-2.5 h-2.5 text-emerald-400" />
                        <span>{lang === 'ar' ? 'فني معتمد' : 'Tech'}</span>
                      </span>
                    ) : (
                      <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[9px] font-extrabold px-2 py-0.2 rounded-full uppercase flex items-center gap-1">
                        <Car className="w-2.5 h-2.5 text-blue-400" />
                        <span>{lang === 'ar' ? 'عميل' : 'Client'}</span>
                      </span>
                    )}

                    <span className={`text-[9px] font-mono opacity-70 ml-auto ${isMe ? 'text-slate-900' : 'text-gray-400'}`}>
                      {msg.timestamp}
                    </span>
                  </div>

                  {/* Message Content */}
                  <p className={`text-xs font-semibold leading-relaxed whitespace-pre-wrap ${isMe ? 'text-slate-950 font-extrabold' : 'text-gray-200'}`}>
                    {msg.text}
                  </p>
                </div>

                {isMe && (
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xs text-amber-400 font-bold shrink-0 overflow-hidden mt-1">
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
      <form onSubmit={handleSendMessage} className="mt-3 flex items-center gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={lang === 'ar' ? 'اكتب رسالتك للمحادثة الجماعية الحية...' : 'Type a message to the public group chat...'}
            className="w-full px-4 py-3 bg-[#111625] border border-gray-800 focus:border-amber-500 rounded-2xl outline-none text-xs text-white placeholder-gray-500 transition-colors shadow-sm"
          />
        </div>

        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          className="px-5 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:hover:bg-amber-500 text-slate-950 font-black rounded-2xl transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-amber-500/20 shrink-0 active:scale-95"
        >
          <Send className="w-4 h-4 fill-slate-950" />
          <span className="text-xs">{lang === 'ar' ? 'إرسال 🚀' : 'Send 🚀'}</span>
        </button>
      </form>
    </div>
  );
};

export default PublicGroupChat;
