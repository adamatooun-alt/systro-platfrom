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
  User, 
  ShieldCheck, 
  Wrench, 
  Car,
  Clock,
  Radio,
  CheckCheck
} from 'lucide-react';
import { PublicGroupMessage } from '../types';

interface PublicGroupChatProps {
  lang: 'ar' | 'en' | 'he';
  currentUserRole: 'client' | 'technician' | 'admin' | null;
  currentUserName: string;
  currentUserEmail?: string;
  currentUserAvatar?: string;
}

const LOCAL_STORAGE_KEY = 'systro_public_group_chat_v2';
const BROADCAST_CHANNEL_NAME = 'systro_chat_channel_v2';
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

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
  const inputRef = useRef<HTMLInputElement>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Helper to filter messages strictly within the last 24 hours
  const filter24Hours = (msgs: PublicGroupMessage[]): PublicGroupMessage[] => {
    const cutoff = Date.now() - TWENTY_FOUR_HOURS_MS;
    return msgs.filter(m => {
      const msgTime = m.createdTime || Date.now();
      return msgTime >= cutoff;
    });
  };

  // Helper to merge and deduplicate messages by ID or time+sender+text
  const mergeAndSortMessages = (
    existing: PublicGroupMessage[], 
    incoming: PublicGroupMessage[]
  ): PublicGroupMessage[] => {
    const map = new Map<string, PublicGroupMessage>();

    [...existing, ...incoming].forEach(m => {
      const key = m.id || `${m.createdTime}_${m.senderName}_${m.text}`;
      if (!map.has(key)) {
        map.set(key, m);
      }
    });

    const merged = Array.from(map.values());
    const valid24h = filter24Hours(merged);
    valid24h.sort((a, b) => (a.createdTime || 0) - (b.createdTime || 0));
    return valid24h;
  };

  // Save messages to LocalStorage
  const saveToLocalStorage = (msgs: PublicGroupMessage[]) => {
    try {
      const valid = filter24Hours(msgs);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(valid));
    } catch (e) {
      console.warn('LocalStorage save notice:', e);
    }
  };

  // Load initial messages from LocalStorage or seed defaults
  const loadFromLocalStorage = (): PublicGroupMessage[] => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed: PublicGroupMessage[] = JSON.parse(saved);
        const valid = filter24Hours(parsed);
        if (valid.length > 0) return valid;
      }
    } catch (e) {
      console.warn('LocalStorage load notice:', e);
    }

    // Default initial broadcast welcome messages within the 24h window
    const now = Date.now();
    const defaultInitial: PublicGroupMessage[] = [
      {
        id: 'welcome-01',
        senderName: lang === 'ar' ? 'إدارة سيسترو (البث المباشر)' : 'Systro Central Broadcast',
        senderRole: 'admin',
        text: lang === 'ar' 
          ? '👋 أهلاً بكم في غرفة المحادثة المباشرة العامة! القناة مفتوحة ومتاحة لجميع الزبائن والفنيين والإدارة للتواصل فوراً (تُحفظ الرسائل لمدة 24 ساعة).' 
          : '👋 Welcome to the public live chat room! Open to all clients, technicians, and admins in real time (messages retained for 24h).',
        timestamp: new Date(now - 1800000).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
        createdTime: now - 1800000
      },
      {
        id: 'welcome-02',
        senderName: lang === 'ar' ? 'المهندس أحمد (فني معتمد)' : 'Eng. Ahmed (Tech)',
        senderRole: 'technician',
        senderAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=120',
        text: lang === 'ar' 
          ? '🛠️ متواجد الآن وجاهز لتقديم خدمات الصيانة والسحب الطارئ في جميع المناطق!' 
          : '🛠️ Available now and ready for maintenance & towing support everywhere!',
        timestamp: new Date(now - 900000).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
        createdTime: now - 900000
      }
    ];

    saveToLocalStorage(defaultInitial);
    return defaultInitial;
  };

  // Setup Real-Time Syncing across Firestore, BroadcastChannel, Window Events, and LocalStorage
  useEffect(() => {
    // 1. Load initial local cache
    const initialMsgs = loadFromLocalStorage();
    setMessages(initialMsgs);

    // Helper to fetch latest global messages from server API
    const fetchServerMessages = async () => {
      try {
        const res = await fetch('/api/public-group-chat');
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.messages)) {
            setMessages(prev => {
              const merged = mergeAndSortMessages(prev, data.messages);
              saveToLocalStorage(merged);
              return merged;
            });
          }
        }
      } catch (e) {
        console.warn('Server chat fetch notice:', e);
      }
    };

    // Initial server fetch
    fetchServerMessages();

    // Fast polling interval (every 2.5 seconds) for instant cross-device sync
    const serverPollInterval = setInterval(fetchServerMessages, 2500);

    // 2. Setup BroadcastChannel for cross-tab instant messaging
    try {
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        broadcastChannelRef.current = bc;
        bc.onmessage = (event) => {
          if (event.data && event.data.message) {
            setMessages(prev => {
              const updated = mergeAndSortMessages(prev, [event.data.message]);
              saveToLocalStorage(updated);
              return updated;
            });
          } else if (event.data && Array.isArray(event.data.messages)) {
            setMessages(prev => {
              const updated = mergeAndSortMessages(prev, event.data.messages);
              saveToLocalStorage(updated);
              return updated;
            });
          }
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel notice:', e);
    }

    // 3. Setup Storage Event Listener for multi-window sync
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_KEY && e.newValue) {
        try {
          const parsed: PublicGroupMessage[] = JSON.parse(e.newValue);
          setMessages(prev => mergeAndSortMessages(prev, parsed));
        } catch (err) {
          console.warn('Storage event notice:', err);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // 4. Setup custom window event for same-window component instances
    const handleCustomWindowChat = (e: any) => {
      if (e.detail) {
        setMessages(prev => {
          const updated = mergeAndSortMessages(prev, [e.detail]);
          saveToLocalStorage(updated);
          return updated;
        });
      }
    };
    window.addEventListener('systro_chat_update', handleCustomWindowChat);

    // 5. Setup Firestore Realtime Subscription (as additional secondary stream)
    let unsubscribeFirestore = () => {};
    try {
      const chatRef = collection(db, 'public_group_chat');
      const q = query(chatRef, limit(150));

      unsubscribeFirestore = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const fetched: PublicGroupMessage[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            fetched.push({
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

          setMessages(prev => {
            const merged = mergeAndSortMessages(prev, fetched);
            saveToLocalStorage(merged);
            return merged;
          });
        }
      }, (err) => {
        console.warn('Firestore snapshot listener notice:', err);
      });
    } catch (e) {
      console.warn('Firestore setup notice:', e);
    }

    // 6. Interval timer to automatically purge messages older than 24h
    const interval = setInterval(() => {
      setMessages(prev => {
        const cleaned = filter24Hours(prev);
        if (cleaned.length !== prev.length) {
          saveToLocalStorage(cleaned);
        }
        return cleaned;
      });
    }, 60000); // Check every minute

    return () => {
      clearInterval(serverPollInterval);
      unsubscribeFirestore();
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('systro_chat_update', handleCustomWindowChat);
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
      clearInterval(interval);
    };
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

    const now = Date.now();
    const formattedTime = new Date(now).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    const displayName = currentUserName?.trim() || (currentUserRole === 'technician' 
      ? (lang === 'ar' ? 'فني معتمد' : 'Certified Tech') 
      : currentUserRole === 'admin'
      ? (lang === 'ar' ? 'إدارة سيسترو' : 'Systro Admin')
      : (lang === 'ar' ? 'زبون' : 'Client'));

    const newMsgObj: PublicGroupMessage = {
      id: `msg_${now}_${Math.random().toString(36).substring(2, 9)}`,
      senderName: displayName,
      senderEmail: currentUserEmail || '',
      senderRole: currentUserRole || 'client',
      senderAvatar: currentUserAvatar || '',
      text: cleanText,
      timestamp: formattedTime,
      createdTime: now
    };

    // Clear input box immediately so user can continue typing instantly
    setInputText('');

    // 1. Instant local state update & 24h retention filter
    setMessages(prev => {
      const updated = mergeAndSortMessages(prev, [newMsgObj]);
      saveToLocalStorage(updated);
      
      // Broadcast to other tabs & windows
      try {
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({ type: 'NEW_MESSAGE', message: newMsgObj });
        }
      } catch (err) {
        console.warn('Broadcast post notice:', err);
      }

      // Dispatch window event for same-tab instances
      try {
        window.dispatchEvent(new CustomEvent('systro_chat_update', { detail: newMsgObj }));
      } catch (err) {
        // ignore
      }

      return updated;
    });

    // Unblock sending state immediately (within 80ms) so user is never stuck
    setTimeout(() => {
      setIsSending(false);
      inputRef.current?.focus();
    }, 80);

    // 2. Global Server API POST sync for all accounts & devices
    try {
      fetch('/api/public-group-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMsgObj })
      }).then(res => {
        if (res.ok) {
          return res.json();
        }
      }).then(data => {
        if (data && Array.isArray(data.messages)) {
          setMessages(prev => {
            const merged = mergeAndSortMessages(prev, data.messages);
            saveToLocalStorage(merged);
            return merged;
          });
        }
      }).catch(err => {
        console.warn('Server chat POST notice:', err);
      });
    } catch (err) {
      console.warn('Server chat dispatch notice:', err);
    }

    // 3. Secondary background sync with Cloud Firestore
    try {
      addDoc(collection(db, 'public_group_chat'), {
        senderName: newMsgObj.senderName,
        senderEmail: newMsgObj.senderEmail,
        senderRole: newMsgObj.senderRole,
        senderAvatar: newMsgObj.senderAvatar,
        text: newMsgObj.text,
        timestamp: newMsgObj.timestamp,
        createdTime: newMsgObj.createdTime,
        createdAtServer: serverTimestamp()
      }).catch(err => {
        console.warn('Background Firestore write notice:', err);
      });
    } catch (error) {
      console.warn('Firestore chat write notice:', error);
    }
  };

  const sendQuickTemplate = (text: string) => {
    setInputText(text);
    inputRef.current?.focus();
  };

  return (
    <div className="w-full bg-white border-2 border-amber-400 rounded-3xl p-4 md:p-6 shadow-xl relative overflow-hidden font-sans text-slate-900">
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
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <p className="text-xs text-slate-600 font-bold">
                {lang === 'ar' 
                  ? 'قناة تواصل عامة وتشاركية تتيح للجميع (الفنيين، الزبائن، الإدارة) تبادل الرسائل فوراً.' 
                  : 'Open real-time broadcast chat channel connecting all technicians, clients, and platform support.'}
              </p>
              <span className="inline-flex items-center gap-1 text-[11px] bg-amber-100 text-amber-900 border border-amber-300 font-black px-2 py-0.5 rounded-full shadow-xs">
                <Clock className="w-3 h-3 text-amber-700" />
                <span>{lang === 'ar' ? 'حفظ الرسائل لمدة 24 ساعة ⏱️' : '24 Hours Auto Retention ⏱️'}</span>
              </span>
            </div>
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
                key={msg.id || `${msg.createdTime}_${msg.senderName}`} 
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
                        <span>{lang === 'ar' ? 'زبون' : 'Client'}</span>
                      </span>
                    )}

                    <span className={`text-[10px] font-mono font-bold ml-auto flex items-center gap-1 ${isMe ? 'text-slate-900' : 'text-slate-500'}`}>
                      <span>{msg.timestamp}</span>
                      {isMe && <CheckCheck className="w-3 h-3 text-slate-950" />}
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
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={lang === 'ar' ? 'اكتب رسالتك للمحادثة الجماعية الحية...' : 'Type a message to the public group chat...'}
            className="w-full px-4 py-3.5 bg-white border-2 border-slate-300 focus:border-amber-500 rounded-2xl outline-none text-xs font-bold text-slate-900 placeholder-slate-400 transition-colors shadow-sm"
          />
        </div>

        <button
          type="submit"
          disabled={!inputText.trim()}
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
