import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc,
  setDoc, 
  query, 
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
  CheckCheck,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Lock,
  ArrowLeft,
  Users,
  MessageCircle,
  Sparkles
} from 'lucide-react';
import { PublicGroupMessage, PrivateMessage } from '../types';

interface PublicGroupChatProps {
  lang: 'ar' | 'en' | 'he';
  currentUserRole: 'client' | 'technician' | 'admin' | null;
  currentUserName: string;
  currentUserEmail?: string;
  currentUserAvatar?: string;
}

const LOCAL_STORAGE_KEY = 'systro_public_group_chat_v2';
const PRIVATE_STORAGE_KEY = 'systro_private_chat_v2';
const BROADCAST_CHANNEL_NAME = 'systro_chat_channel_v2';
const PRIVATE_BROADCAST_CHANNEL = 'systro_private_chat_channel_v2';
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export const PublicGroupChat: React.FC<PublicGroupChatProps> = ({
  lang,
  currentUserRole,
  currentUserName,
  currentUserEmail,
  currentUserAvatar
}) => {
  // Navigation State
  const [chatTabMode, setChatTabMode] = useState<'public' | 'private'>('public');

  // Public Group Chat State
  const [messages, setMessages] = useState<PublicGroupMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Private Direct Chat State
  const [privatePartner, setPrivatePartner] = useState<{
    name: string;
    email?: string;
    role: 'client' | 'technician' | 'admin';
    avatar?: string;
  } | null>(null);
  const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>([]);
  const [privateInputText, setPrivateInputText] = useState('');
  const [isSendingPrivate, setIsSendingPrivate] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const privateContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const privateInputRef = useRef<HTMLInputElement>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Helper to filter messages strictly within the last 24 hours
  const filter24Hours = <T extends { createdTime?: number }>(msgs: T[]): T[] => {
    const cutoff = Date.now() - TWENTY_FOUR_HOURS_MS;
    return msgs.filter(m => {
      const msgTime = m.createdTime || Date.now();
      return msgTime >= cutoff;
    });
  };

  // Helper to compute unique deterministic chatId for 1-on-1 private chat
  const getChatId = (partnerName: string, partnerEmail?: string) => {
    const myId = (currentUserEmail || currentUserName || 'user_me').trim().toLowerCase();
    const partnerId = (partnerEmail || partnerName || 'user_partner').trim().toLowerCase();
    const sorted = [myId, partnerId].sort();
    const sanitize = (str: string) => str.replace(/[^a-z0-9]/g, '_');
    return `dm_${sanitize(sorted[0])}_${sanitize(sorted[1])}`;
  };

  // Helper to merge and deduplicate messages
  const mergeAndSortMessages = (
    existing: PublicGroupMessage[], 
    incoming: PublicGroupMessage[]
  ): PublicGroupMessage[] => {
    const result: PublicGroupMessage[] = [];
    const all = [...existing, ...incoming];

    all.forEach(m => {
      const isDuplicate = result.some(item => 
        (item.id && m.id && item.id === m.id) ||
        (item.senderName === m.senderName && 
         item.text === m.text && 
         Math.abs((item.createdTime || 0) - (m.createdTime || 0)) < 3000)
      );
      if (!isDuplicate) {
        result.push(m);
      }
    });

    const valid24h = filter24Hours(result);
    valid24h.sort((a, b) => (a.createdTime || 0) - (b.createdTime || 0));
    return valid24h;
  };

  // Save public messages to LocalStorage
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

    const now = Date.now();
    const defaultInitial: PublicGroupMessage[] = [
      {
        id: 'welcome-01',
        senderName: lang === 'ar' ? 'إدارة سيسترو (البث المباشر)' : 'Systro Central Broadcast',
        senderRole: 'admin',
        text: lang === 'ar' 
          ? '👋 أهلاً بكم في غرفة المحادثة المباشرة العامة! القناة مفتوحة ومتاحة لجميع الزبائن والفنيين والإدارة للتواصل فوراً. اضغط على "🔒 محادثة خاصة" بجانب أي رسالة لبدء محادثة سرية مستظلة مع المرسل.' 
          : '👋 Welcome to the public live chat room! Open to all clients, technicians, and admins. Click "🔒 Private Chat" beside any message to open a 1-on-1 conversation.',
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

  // Setup Real-Time Syncing for Public & Private Chat
  useEffect(() => {
    // 1. Load initial local public cache
    const initialMsgs = loadFromLocalStorage();
    setMessages(initialMsgs);

    // 2. Load private chat local cache
    try {
      const savedPMsgs = localStorage.getItem(PRIVATE_STORAGE_KEY);
      if (savedPMsgs) {
        const parsedPMsgs: PrivateMessage[] = JSON.parse(savedPMsgs);
        setPrivateMessages(filter24Hours(parsedPMsgs));
      }
    } catch (e) {}

    // Fetch latest global public chat
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
      } catch (e) {}
    };

    // Fetch latest private messages for current user
    const fetchPrivateServerMessages = async () => {
      const userIdent = currentUserEmail || currentUserName || '';
      if (!userIdent) return;
      try {
        const res = await fetch(`/api/private-chat?userIdentifier=${encodeURIComponent(userIdent)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.messages)) {
            setPrivateMessages(prev => {
              const all = [...prev, ...data.messages];
              const uniqueMap = new Map<string, PrivateMessage>();
              all.forEach(m => uniqueMap.set(m.id, m));
              const valid = filter24Hours(Array.from(uniqueMap.values()));
              valid.sort((a, b) => (a.createdTime || 0) - (b.createdTime || 0));
              try {
                localStorage.setItem(PRIVATE_STORAGE_KEY, JSON.stringify(valid.slice(-200)));
              } catch (e) {}
              return valid;
            });
          }
        }
      } catch (e) {}
    };

    fetchServerMessages();
    fetchPrivateServerMessages();

    const serverPollInterval = setInterval(() => {
      fetchServerMessages();
      fetchPrivateServerMessages();
    }, 2500);

    // BroadcastChannel for Public Chat
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
          }
        };

        const pbc = new BroadcastChannel(PRIVATE_BROADCAST_CHANNEL);
        pbc.onmessage = (event) => {
          if (event.data && event.data.message) {
            setPrivateMessages(prev => {
              const exists = prev.some(m => m.id === event.data.message.id);
              if (!exists) {
                const updated = [...prev, event.data.message];
                try {
                  localStorage.setItem(PRIVATE_STORAGE_KEY, JSON.stringify(updated.slice(-200)));
                } catch (e) {}
                return updated;
              }
              return prev;
            });
          }
        };
      }
    } catch (e) {}

    // Storage Event Listener for multi-window sync
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_KEY && e.newValue) {
        try {
          const parsed: PublicGroupMessage[] = JSON.parse(e.newValue);
          setMessages(prev => mergeAndSortMessages(prev, parsed));
        } catch (err) {}
      } else if (e.key === PRIVATE_STORAGE_KEY && e.newValue) {
        try {
          const parsed: PrivateMessage[] = JSON.parse(e.newValue);
          setPrivateMessages(parsed);
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Custom window events
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

    const handleCustomPrivateWindowChat = (e: any) => {
      if (e.detail) {
        setPrivateMessages(prev => {
          const exists = prev.some(m => m.id === e.detail.id);
          if (!exists) {
            const updated = [...prev, e.detail];
            try {
              localStorage.setItem(PRIVATE_STORAGE_KEY, JSON.stringify(updated.slice(-200)));
            } catch (e) {}
            return updated;
          }
          return prev;
        });
      }
    };
    window.addEventListener('systro_private_chat_update', handleCustomPrivateWindowChat);

    // Firestore Listener for Public Chat
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
      });
    } catch (e) {}

    // Firestore Listener for Private Chat
    let unsubscribePrivateFirestore = () => {};
    try {
      const pChatRef = collection(db, 'private_chats');
      const pq = query(pChatRef, limit(100));

      unsubscribePrivateFirestore = onSnapshot(pq, (snapshot) => {
        if (!snapshot.empty) {
          const fetchedPMsgs: PrivateMessage[] = [];
          const myIdent = (currentUserEmail || currentUserName || '').toLowerCase();

          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as PrivateMessage;
            if (data && data.chatId) {
              const senderClean = (data.senderEmail || data.senderName || '').toLowerCase();
              const recipClean = (data.recipientEmail || data.recipientName || '').toLowerCase();

              if (senderClean === myIdent || recipClean === myIdent || myIdent === '') {
                fetchedPMsgs.push({
                  id: docSnap.id,
                  chatId: data.chatId,
                  senderName: data.senderName,
                  senderEmail: data.senderEmail,
                  senderRole: data.senderRole,
                  senderAvatar: data.senderAvatar,
                  recipientName: data.recipientName,
                  recipientEmail: data.recipientEmail,
                  recipientRole: data.recipientRole,
                  text: data.text,
                  timestamp: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  createdTime: data.createdTime || Date.now()
                });
              }
            }
          });

          if (fetchedPMsgs.length > 0) {
            setPrivateMessages(prev => {
              const all = [...prev, ...fetchedPMsgs];
              const uniqueMap = new Map<string, PrivateMessage>();
              all.forEach(m => uniqueMap.set(m.id, m));
              const valid = filter24Hours(Array.from(uniqueMap.values()));
              valid.sort((a, b) => (a.createdTime || 0) - (b.createdTime || 0));
              return valid;
            });
          }
        }
      });
    } catch (e) {}

    return () => {
      clearInterval(serverPollInterval);
      unsubscribeFirestore();
      unsubscribePrivateFirestore();
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('systro_chat_update', handleCustomWindowChat);
      window.removeEventListener('systro_private_chat_update', handleCustomPrivateWindowChat);
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
    };
  }, [lang, currentUserEmail, currentUserName]);

  const isAtBottomRef = useRef<boolean>(true);
  const shouldForceScrollRef = useRef<boolean>(true);

  const handleContainerScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    isAtBottomRef.current = distanceToBottom < 100;
  };

  // Auto scroll logic (only scrolls if user is near bottom or sent a new message)
  useEffect(() => {
    if (chatTabMode === 'public' && messagesContainerRef.current) {
      if (isAtBottomRef.current || shouldForceScrollRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        shouldForceScrollRef.current = false;
      }
    } else if (chatTabMode === 'private' && privateContainerRef.current) {
      if (isAtBottomRef.current || shouldForceScrollRef.current) {
        privateContainerRef.current.scrollTop = privateContainerRef.current.scrollHeight;
        shouldForceScrollRef.current = false;
      }
    }
  }, [messages, privateMessages, chatTabMode]);

  // Extract list of active private chat partners
  const activeContacts = React.useMemo(() => {
    const map = new Map<string, { name: string; email?: string; role: 'client' | 'technician' | 'admin'; avatar?: string; lastMsg?: string; lastTime?: string }>();

    const myNameClean = currentUserName.trim().toLowerCase();
    const myEmailClean = (currentUserEmail || '').trim().toLowerCase();

    privateMessages.forEach(m => {
      const isSender = (myEmailClean && m.senderEmail?.toLowerCase() === myEmailClean) || m.senderName.toLowerCase() === myNameClean;
      
      const partnerName = isSender ? m.recipientName : m.senderName;
      const partnerEmail = isSender ? m.recipientEmail : m.senderEmail;
      const partnerRole = isSender ? (m.recipientRole || 'client') : m.senderRole;
      const partnerAvatar = isSender ? undefined : m.senderAvatar;

      if (partnerName && partnerName.toLowerCase() !== myNameClean) {
        const key = (partnerEmail || partnerName).toLowerCase();
        map.set(key, {
          name: partnerName,
          email: partnerEmail,
          role: partnerRole,
          avatar: partnerAvatar,
          lastMsg: m.text,
          lastTime: m.timestamp
        });
      }
    });

    return Array.from(map.values());
  }, [privateMessages, currentUserEmail, currentUserName]);

  // Public message send handler
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

    setInputText('');
    shouldForceScrollRef.current = true;

    setMessages(prev => {
      const updated = mergeAndSortMessages(prev, [newMsgObj]);
      saveToLocalStorage(updated);
      
      try {
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({ type: 'NEW_MESSAGE', message: newMsgObj });
        }
        window.dispatchEvent(new CustomEvent('systro_chat_update', { detail: newMsgObj }));
      } catch (err) {}

      return updated;
    });

    setTimeout(() => {
      setIsSending(false);
      inputRef.current?.focus();
    }, 80);

    try {
      fetch('/api/public-group-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMsgObj })
      }).catch(err => console.warn(err));
    } catch (err) {}

    try {
      setDoc(doc(db, 'public_group_chat', newMsgObj.id), {
        ...newMsgObj,
        createdAtServer: serverTimestamp()
      }).catch(err => console.warn(err));
    } catch (error) {}
  };

  // Private message send handler
  const handleSendPrivateMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!privatePartner) return;
    const cleanText = privateInputText.trim();
    if (!cleanText || isSendingPrivate) return;

    setIsSendingPrivate(true);

    const now = Date.now();
    const formattedTime = new Date(now).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    const myName = currentUserName?.trim() || (currentUserRole === 'technician' 
      ? (lang === 'ar' ? 'فني معتمد' : 'Tech') 
      : currentUserRole === 'admin' 
      ? (lang === 'ar' ? 'إدارة سيسترو' : 'Admin') 
      : (lang === 'ar' ? 'زبون' : 'Client'));

    const chatId = getChatId(privatePartner.name, privatePartner.email);

    const newPMsg: PrivateMessage = {
      id: `pmsg_${now}_${Math.random().toString(36).substring(2, 8)}`,
      chatId,
      senderName: myName,
      senderEmail: currentUserEmail || '',
      senderRole: currentUserRole || 'client',
      senderAvatar: currentUserAvatar || '',
      recipientName: privatePartner.name,
      recipientEmail: privatePartner.email || '',
      recipientRole: privatePartner.role,
      text: cleanText,
      timestamp: formattedTime,
      createdTime: now
    };

    setPrivateInputText('');
    shouldForceScrollRef.current = true;

    setPrivateMessages(prev => {
      const updated = [...prev, newPMsg];
      try {
        localStorage.setItem(PRIVATE_STORAGE_KEY, JSON.stringify(updated.slice(-200)));
      } catch (e) {}
      return updated;
    });

    try {
      window.dispatchEvent(new CustomEvent('systro_private_chat_update', { detail: newPMsg }));
      if ('BroadcastChannel' in window) {
        const pbc = new BroadcastChannel(PRIVATE_BROADCAST_CHANNEL);
        pbc.postMessage({ type: 'NEW_PRIVATE_MESSAGE', message: newPMsg });
        pbc.close();
      }
    } catch (e) {}

    setTimeout(() => {
      setIsSendingPrivate(false);
      privateInputRef.current?.focus();
    }, 80);

    try {
      fetch('/api/private-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newPMsg })
      }).catch(e => console.warn(e));
    } catch (e) {}

    try {
      setDoc(doc(db, 'private_chats', newPMsg.id), {
        ...newPMsg,
        createdAtServer: serverTimestamp()
      }).catch(e => console.warn(e));
    } catch (e) {}
  };

  const startPrivateChatWith = (partner: { name: string; email?: string; role: 'client' | 'technician' | 'admin'; avatar?: string }) => {
    shouldForceScrollRef.current = true;
    setPrivatePartner(partner);
    setChatTabMode('private');
  };

  const sendQuickTemplate = (text: string) => {
    if (chatTabMode === 'public') {
      setInputText(text);
      inputRef.current?.focus();
    } else {
      setPrivateInputText(text);
      privateInputRef.current?.focus();
    }
  };

  const handleAcceptTaskInChat = async (msg: PublicGroupMessage) => {
    const techName = currentUserName || (lang === 'ar' ? 'فني معتمد' : 'Verified Technician');
    
    setMessages(prev => prev.map(m => {
      if (m.id === msg.id || (m.taskId && m.taskId === msg.taskId)) {
        return {
          ...m,
          taskStatus: 'accepted' as const,
          acceptedByTechName: techName,
          acceptedByTechId: currentUserEmail || 'tech_id'
        };
      }
      return m;
    }));

    const acceptReplyMsg: PublicGroupMessage = {
      id: `msg_accept_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderName: techName,
      senderEmail: currentUserEmail || '',
      senderRole: 'technician',
      senderAvatar: currentUserAvatar,
      text: lang === 'ar'
        ? `✅ تم قبول واستلام المهمة رقم #${msg.taskId || 'TASK'} بواسطة الفني (${techName})! وهو في طريقه لموقع الزبون الآن 🚚💨`
        : `✅ Task #${msg.taskId || 'TASK'} accepted by Tech (${techName})! En route to client 🚚💨`,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      createdTime: Date.now()
    };

    try {
      fetch('/api/public-group-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: acceptReplyMsg })
      }).catch(e => console.warn(e));

      if (msg.id) {
        setDoc(doc(db, "public_group_chat", msg.id), {
          ...msg,
          taskStatus: 'accepted',
          acceptedByTechName: techName
        }, { merge: true }).catch(e => console.warn(e));
      }

      setDoc(doc(db, "public_group_chat", acceptReplyMsg.id), acceptReplyMsg).catch(e => console.warn(e));

      if (msg.taskId) {
        setDoc(doc(db, "requests", msg.taskId), {
          status: 'accepted',
          selectedTechnicianId: currentUserEmail || 'tech-01'
        }, { merge: true }).catch(e => console.warn(e));

        fetch('/api/requests/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: msg.taskId,
            updates: { status: 'accepted', selectedTechnicianId: currentUserEmail || 'tech-01' }
          })
        }).catch(e => console.warn(e));
      }

      window.dispatchEvent(new CustomEvent('systro_chat_update', { detail: acceptReplyMsg }));

      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        bc.postMessage({ type: 'NEW_MESSAGE', message: acceptReplyMsg });
        bc.close();
      }
    } catch (err) {
      console.error("Error accepting task in chat:", err);
    }
  };

  // Filter current active private messages
  const currentPrivateChatId = privatePartner ? getChatId(privatePartner.name, privatePartner.email) : '';
  const currentConversationMessages = privateMessages.filter(m => m.chatId === currentPrivateChatId);

  return (
    <div className={isExpanded 
      ? "fixed inset-0 z-[100] bg-white p-4 md:p-6 flex flex-col justify-between h-full w-full animate-fade-in font-sans text-slate-900 overflow-hidden" 
      : "w-full bg-white border-2 border-amber-400 rounded-3xl p-4 md:p-6 shadow-xl relative overflow-hidden font-sans text-slate-900"
    }>
      {/* Soft Background Accent Gradients */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-100/60 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-100/60 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/30 shrink-0">
            {chatTabMode === 'public' ? (
              <MessageSquare className="w-6 h-6 fill-slate-950" />
            ) : (
              <Lock className="w-6 h-6 fill-slate-950" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base md:text-lg font-black text-slate-900 tracking-tight">
                {chatTabMode === 'public' 
                  ? (lang === 'ar' ? '💬 المحادثة الجماعية المباشرة (شبكة الفنيين والزبائن)' : '💬 Live Network Group Chat')
                  : (lang === 'ar' ? '🔒 بوابة المحادثات الخاصة المباشرة (1-على-1)' : '🔒 Private Direct 1-on-1 Chat Portal')}
              </h3>
              <span className="flex items-center gap-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full text-xs font-black font-mono shadow-sm">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                <span>{lang === 'ar' ? 'مباشر وآمن 🔒' : 'SECURE LIVE 🔒'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-600 font-bold mt-0.5">
              {chatTabMode === 'public' 
                ? (lang === 'ar' ? 'قناة تواصل عامة وتشاركية للجميع. يمكنك النقر على "🔒 محادثة خاصة" للبدء بحوار فردي خاص.' : 'Public broadcast channel connecting everyone. Click "🔒 Private Chat" on any message to talk 1-on-1.')
                : (lang === 'ar' ? 'محادثات فردية ومشفرة ومستقلة بين شخصين للتفاوض المباشر والاتفاق على التفاصيل.' : 'Private, isolated 1-on-1 messaging for direct negotiations.')}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center flex-wrap">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-2xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 border border-amber-600 shrink-0"
            title={isExpanded ? (lang === 'ar' ? 'تصغير الشاشة' : 'Minimize') : (lang === 'ar' ? 'توسيع المحادثة' : 'Expand')}
          >
            {isExpanded ? (
              <>
                <Minimize2 className="w-4 h-4 text-slate-950" />
                <span>{lang === 'ar' ? 'تصغير ↙' : 'Minimize ↙'}</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4 text-slate-950" />
                <span>{lang === 'ar' ? 'توسيع ⤢' : 'Expand ⤢'}</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-2xl border border-slate-300 shadow-sm">
            <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-bold overflow-hidden shadow-inner">
              {currentUserAvatar ? (
                <img src={currentUserAvatar} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-3.5 h-3.5" />
              )}
            </div>
            <span className="text-xs font-black text-slate-900 font-sans">
              {currentUserRole === 'technician' ? (
                <span className="text-emerald-700">🛠️ {currentUserName || 'فني'}</span>
              ) : currentUserRole === 'admin' ? (
                <span className="text-purple-700">🛡️ {lang === 'ar' ? 'إدارة' : 'Admin'}</span>
              ) : (
                <span className="text-blue-700">👤 {currentUserName || 'زبون'}</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex items-center gap-2 my-3 relative z-10 flex-wrap">
        <button
          type="button"
          onClick={() => {
            shouldForceScrollRef.current = true;
            setChatTabMode('public');
          }}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 border ${
            chatTabMode === 'public'
              ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-md'
              : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{lang === 'ar' ? '💬 المحادثة الجماعية العامة' : '💬 Public Group Chat'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            shouldForceScrollRef.current = true;
            setChatTabMode('private');
          }}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 relative border ${
            chatTabMode === 'private'
              ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-md'
              : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>{lang === 'ar' ? '🔒 المحادثات الخاصة (1-على-1)' : '🔒 Private Direct Chats'}</span>
          {activeContacts.length > 0 && (
            <span className="bg-red-600 text-white text-[10px] font-mono px-2 py-0.2 rounded-full font-black animate-pulse shadow">
              {activeContacts.length}
            </span>
          )}
        </button>
      </div>

      {/* VIEW MODE 1: PUBLIC GROUP CHAT */}
      {chatTabMode === 'public' && (
        <>
          {/* Quick Prompts */}
          <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none relative z-10">
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
          </div>

          {/* Messages Display Stream */}
          <div 
            ref={messagesContainerRef}
            onScroll={handleContainerScroll}
            className={`bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 overflow-y-auto overflow-x-hidden overscroll-y-contain touch-pan-y space-y-3.5 shadow-inner relative z-10 ${
              isExpanded ? 'flex-1 my-3 max-h-none' : 'h-72 md:h-80'
            }`}
          >
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

                const isTaskAlertMsg = msg.isTaskAlert || Boolean(msg.taskId) || msg.text?.includes('🚨 [بلاغ');
                const isTaskAccepted = msg.taskStatus === 'accepted' || Boolean(msg.acceptedByTechName);

                if (isTaskAlertMsg) {
                  return (
                    <div key={msg.id || `${msg.createdTime}_${msg.senderName}`} className="my-2.5">
                      <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 text-right rtl:text-right ltr:text-left shadow-md space-y-3 relative overflow-hidden">
                        <div className="flex items-center justify-between border-b border-amber-200 pb-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center font-black text-xs animate-bounce shadow-sm">
                              🚨
                            </div>
                            <span className="text-xs font-black text-amber-950">
                              {lang === 'ar' ? 'بلاغ عاجل - طلب خدمة إنقاذ' : 'Emergency Task Alert'}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full">
                            {msg.timestamp}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs text-slate-900 font-bold leading-relaxed bg-white/90 p-3 rounded-xl border border-amber-200 shadow-inner">
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>

                        <div className="pt-1 flex flex-col sm:flex-row items-center justify-between gap-2">
                          {!isMe && (
                            <button
                              type="button"
                              onClick={() => startPrivateChatWith({
                                name: msg.senderName,
                                email: msg.senderEmail,
                                role: msg.senderRole,
                                avatar: msg.senderAvatar
                              })}
                              className="w-full sm:w-auto py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow active:scale-95 border border-amber-600"
                            >
                              <Lock className="w-3.5 h-3.5 text-slate-950" />
                              <span>{lang === 'ar' ? '🔒 محادثة خاصة مع صاحب الطلب' : '🔒 Direct Chat'}</span>
                            </button>
                          )}

                          {isTaskAccepted ? (
                            <div className="w-full py-2.5 px-4 bg-emerald-100 border border-emerald-400 rounded-xl text-emerald-950 text-xs font-black flex items-center justify-center gap-2 shadow-sm">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>
                                {lang === 'ar'
                                  ? `تم قبول المهمة بواسطة: ${msg.acceptedByTechName || 'فني معتمد'} ✅`
                                  : `Task Accepted by: ${msg.acceptedByTechName || 'Technician'} ✅`}
                              </span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAcceptTaskInChat(msg)}
                              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 border-2 border-emerald-300"
                            >
                              <Wrench className="w-4 h-4 text-white animate-spin" />
                              <span>{lang === 'ar' ? 'قبول المهمة واستلام البلاغ الآن 🛠️' : 'Accept & Claim Task Now 🛠️'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

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
                      {/* Header Badge */}
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

                      {/* Text */}
                      <p className={`text-xs leading-relaxed whitespace-pre-wrap ${isMe ? 'text-slate-950 font-black' : 'text-slate-900 font-bold'}`}>
                        {msg.text}
                      </p>

                      {/* Action to Start Private Chat */}
                      {!isMe && (
                        <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center justify-start">
                          <button
                            type="button"
                            onClick={() => startPrivateChatWith({
                              name: msg.senderName,
                              email: msg.senderEmail,
                              role: msg.senderRole,
                              avatar: msg.senderAvatar
                            })}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-600 rounded-xl text-[11px] font-black transition-all cursor-pointer shadow-xs active:scale-95"
                          >
                            <Lock className="w-3.5 h-3.5 text-slate-950" />
                            <span>{lang === 'ar' ? '🔒 محادثة خاصة ومباشرة' : '🔒 Direct Private Chat'}</span>
                          </button>
                        </div>
                      )}
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
          </div>

          {/* Input Box */}
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
        </>
      )}

      {/* VIEW MODE 2: PRIVATE DIRECT CHAT */}
      {chatTabMode === 'private' && (
        <div className="relative z-10 space-y-3">
          {/* Active Contacts Selector Strip */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200">
            <span className="text-xs font-black text-slate-800 shrink-0 flex items-center gap-1">
              💬 {lang === 'ar' ? 'المحادثات الخاصة:' : 'Direct Contacts:'}
            </span>

            {activeContacts.length === 0 ? (
              <span className="text-xs text-slate-500 font-bold italic">
                {lang === 'ar' ? 'لا توجد محادثات خاصة قائمة حالياً. انقر على "🔒 محادثة خاصة" بجانب أي رسالة في القناة العامة للبدء!' : 'No direct chats yet. Click "Private Chat" beside any group message to start!'}
              </span>
            ) : (
              activeContacts.map((contact) => {
                const isSelected = privatePartner && (
                  (contact.email && privatePartner.email === contact.email) ||
                  contact.name === privatePartner.name
                );

                return (
                  <button
                    key={contact.email || contact.name}
                    type="button"
                    onClick={() => setPrivatePartner({
                      name: contact.name,
                      email: contact.email,
                      role: contact.role,
                      avatar: contact.avatar
                    })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer flex items-center gap-2 border ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-md scale-105'
                        : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] overflow-hidden">
                      {contact.avatar ? <img src={contact.avatar} alt="p" className="w-full h-full object-cover" /> : contact.name.substring(0, 1)}
                    </div>
                    <span>{contact.name}</span>
                  </button>
                );
              })
            )}
          </div>

          {/* Active Conversation View or Empty Selector Notice */}
          {!privatePartner ? (
            <div className="bg-slate-50 border-2 border-dashed border-amber-400 rounded-2xl p-8 text-center space-y-3 my-4">
              <Lock className="w-10 h-10 text-amber-500 mx-auto animate-bounce" />
              <h4 className="text-sm md:text-base font-black text-slate-900">
                {lang === 'ar' ? 'اختر شخصاً لبدء المحادثة الخاصة والمباشرة' : 'Select a person to start a private conversation'}
              </h4>
              <p className="text-xs text-slate-600 font-bold max-w-md mx-auto">
                {lang === 'ar' 
                  ? 'يمكنك الانتقال للمحادثة الجماعية العامة، والضغط على زر "🔒 محادثة خاصة" الظاهر أسفل اسم المرسل للبدء فوراً.'
                  : 'Go to the public group chat tab and click "🔒 Private Chat" below any message to connect directly.'}
              </p>
              <button
                type="button"
                onClick={() => setChatTabMode('public')}
                className="mt-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                <span>{lang === 'ar' ? 'العودة للمحادثة الجماعية العامة 💬' : 'Return to Public Group Chat 💬'}</span>
              </button>
            </div>
          ) : (
            <div>
              {/* Partner Conversation Header */}
              <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-3.5 mb-3 flex items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-md overflow-hidden shrink-0 border border-amber-600">
                    {privatePartner.avatar ? (
                      <img src={privatePartner.avatar} alt="partner" className="w-full h-full object-cover" />
                    ) : (
                      <span>{privatePartner.name.substring(0, 1)}</span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-slate-950">{privatePartner.name}</span>
                      {privatePartner.role === 'technician' ? (
                        <span className="bg-emerald-200 text-emerald-950 border border-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Wrench className="w-3 h-3 text-emerald-800" />
                          <span>{lang === 'ar' ? 'فني معتمد' : 'Tech'}</span>
                        </span>
                      ) : privatePartner.role === 'admin' ? (
                        <span className="bg-purple-200 text-purple-950 border border-purple-400 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-purple-800" />
                          <span>{lang === 'ar' ? 'إدارة سيسترو' : 'Admin'}</span>
                        </span>
                      ) : (
                        <span className="bg-blue-200 text-blue-950 border border-blue-400 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Car className="w-3 h-3 text-blue-800" />
                          <span>{lang === 'ar' ? 'زبون' : 'Client'}</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-600 font-bold block mt-0.5">
                      🔒 {lang === 'ar' ? 'قناة خاصة ومباشرة بين الطرفين فقط' : 'Isolated 1-on-1 private messaging'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setChatTabMode('public')}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 font-black text-xs rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1 shadow-xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'العامة 💬' : 'Public 💬'}</span>
                </button>
              </div>

              {/* Private Fast Templates */}
              <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-xs text-slate-700 font-black shrink-0 flex items-center gap-1">
                  ⚡ {lang === 'ar' ? 'رسائل مفاوضة سريعة:' : 'Quick Negotiation:'}
                </span>
                <button
                  type="button"
                  onClick={() => sendQuickTemplate(lang === 'ar' ? '📍 أرسل لي موقعك الجغرافي الدقيق للوصول فوراً' : '📍 Send me exact location coordinates')}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  📍 {lang === 'ar' ? 'طلب الموقع' : 'Location'}
                </button>
                <button
                  type="button"
                  onClick={() => sendQuickTemplate(lang === 'ar' ? '💰 نعم، اتفقنا على السعر المقترح والخدمة 👍' : '💰 Yes, agreed on proposed price & service 👍')}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  💰 {lang === 'ar' ? 'تأكيد الاتفاق' : 'Agree Price'}
                </button>
                <button
                  type="button"
                  onClick={() => sendQuickTemplate(lang === 'ar' ? '⏱️ كم الوقت المتوقع لوصولك للموقع؟' : '⏱️ What is your expected ETA?')}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  ⏱️ {lang === 'ar' ? 'سؤال عن الوقت' : 'Ask ETA'}
                </button>
              </div>

              {/* Private Messages Stream Display */}
              <div
                ref={privateContainerRef}
                onScroll={handleContainerScroll}
                className={`bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 overflow-y-auto overflow-x-hidden overscroll-y-contain touch-pan-y space-y-3.5 shadow-inner relative z-10 ${
                  isExpanded ? 'flex-1 my-3 max-h-none' : 'h-72 md:h-80'
                }`}
              >
                {currentConversationMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 font-bold text-center gap-2">
                    <MessageCircle className="w-8 h-8 text-amber-500 animate-pulse" />
                    <span className="text-xs font-bold text-slate-700">
                      {lang === 'ar' 
                        ? `لا توجد رسائل خاصة سابقة مع (${privatePartner.name}). اكتب أول رسالة لبدء الحوار السرّي!` 
                        : `No previous private messages with (${privatePartner.name}). Type a message to start!`}
                    </span>
                  </div>
                ) : (
                  currentConversationMessages.map((pmsg) => {
                    const isMe = (currentUserEmail && pmsg.senderEmail === currentUserEmail) || pmsg.senderName === currentUserName;

                    return (
                      <div 
                        key={pmsg.id} 
                        className={`flex gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isMe && (
                          <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 border border-amber-600 flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden mt-1 shadow-sm">
                            {pmsg.senderAvatar ? (
                              <img src={pmsg.senderAvatar} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                              <span>{pmsg.senderName.substring(0, 1)}</span>
                            )}
                          </div>
                        )}

                        <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 text-right rtl:text-right ltr:text-left shadow-sm transition-all ${
                          isMe 
                            ? 'bg-amber-500 text-slate-950 rounded-tr-none border border-amber-600 font-black' 
                            : 'bg-white text-slate-900 rounded-tl-none border border-slate-300'
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-black ${isMe ? 'text-slate-950' : 'text-slate-900'}`}>
                              {pmsg.senderName}
                            </span>
                            <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-black">
                              🔒 {lang === 'ar' ? 'خاصة' : 'Private'}
                            </span>
                            <span className={`text-[10px] font-mono font-bold ml-auto flex items-center gap-1 ${isMe ? 'text-slate-900' : 'text-slate-500'}`}>
                              <span>{pmsg.timestamp}</span>
                              {isMe && <CheckCheck className="w-3 h-3 text-slate-950" />}
                            </span>
                          </div>

                          <p className={`text-xs leading-relaxed whitespace-pre-wrap ${isMe ? 'text-slate-950 font-black' : 'text-slate-900 font-bold'}`}>
                            {pmsg.text}
                          </p>
                        </div>

                        {isMe && (
                          <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-xs text-slate-800 font-bold shrink-0 overflow-hidden mt-1 shadow-sm">
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
              </div>

              {/* Private Input Form */}
              <form onSubmit={handleSendPrivateMessage} className="mt-3 flex items-center gap-2 relative z-10">
                <div className="flex-1 relative">
                  <input
                    ref={privateInputRef}
                    type="text"
                    value={privateInputText}
                    onChange={(e) => setPrivateInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendPrivateMessage();
                      }
                    }}
                    placeholder={lang === 'ar' ? `اكتب رسالة خاصة وسرية إلى (${privatePartner.name})...` : `Type a private message to (${privatePartner.name})...`}
                    className="w-full px-4 py-3.5 bg-white border-2 border-slate-300 focus:border-amber-500 rounded-2xl outline-none text-xs font-bold text-slate-900 placeholder-slate-400 transition-colors shadow-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!privateInputText.trim()}
                  className="px-6 py-3.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:hover:bg-amber-500 text-slate-950 font-black rounded-2xl transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-amber-500/30 shrink-0 border border-amber-600 active:scale-95"
                >
                  <Send className="w-4 h-4 fill-slate-950" />
                  <span className="text-xs font-black">{lang === 'ar' ? 'إرسال خاص 🔒' : 'Send Private 🔒'}</span>
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PublicGroupChat;
