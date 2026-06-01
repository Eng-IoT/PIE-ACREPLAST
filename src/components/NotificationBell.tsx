import { useEffect, useMemo, useRef, useState } from 'react';
import { arrayUnion, collection, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Bell, BellRing, CheckCheck, ExternalLink, Mail, ShieldAlert, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';

type NotificationType = 'info' | 'warning' | 'critical' | 'success';

type AppNotification = {
  id: string;
  title?: string;
  message?: string;
  type?: NotificationType;
  link?: string;
  userId?: string;
  targetUserId?: string;
  targetEmail?: string;
  targetRole?: string;
  read?: boolean;
  readBy?: string[];
  createdAt?: { toDate?: () => Date } | Date | string | null;
};

function formatDate(value: AppNotification['createdAt']) {
  if (!value) return 'Agora';
  const date = typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function'
    ? value.toDate()
    : new Date(value as string | Date);
  if (Number.isNaN(date.getTime())) return 'Agora';
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function typeStyle(type?: NotificationType) {
  switch (type) {
    case 'critical': return 'border-red-500/40 bg-red-950/10 text-red-400';
    case 'warning': return 'border-amber-500/40 bg-amber-950/10 text-amber-400';
    case 'success': return 'border-emerald-500/40 bg-emerald-950/10 text-emerald-400';
    default: return 'border-cyan-500/40 bg-cyan-950/10 text-cyan-400';
  }
}

export default function NotificationBell() {
  const { user, role } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  const lastSeenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    const unsub = onSnapshot(collection(db, 'notifications'), (snapshot) => {
      const items = snapshot.docs
        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as AppNotification))
        .filter(item => {
          const target = item.targetUserId || item.userId;
          const targetEmail = item.targetEmail?.toLowerCase();
          return !target
            || target === 'all'
            || target === user.uid
            || targetEmail === user.email?.toLowerCase()
            || item.targetRole === role
            || item.targetRole === 'all';
        })
        .sort((a, b) => {
          const aTime = a.createdAt && typeof a.createdAt === 'object' && 'toDate' in a.createdAt && typeof a.createdAt.toDate === 'function'
            ? a.createdAt.toDate().getTime()
            : new Date((a.createdAt as string | Date | null) || 0).getTime();
          const bTime = b.createdAt && typeof b.createdAt === 'object' && 'toDate' in b.createdAt && typeof b.createdAt.toDate === 'function'
            ? b.createdAt.toDate().getTime()
            : new Date((b.createdAt as string | Date | null) || 0).getTime();
          return bTime - aTime;
        })
        .slice(0, 20);

      setNotifications(items);

      if (browserPermission === 'granted') {
        items.slice(0, 5).forEach(item => {
          const readByMe = item.readBy?.includes(user.uid) || item.read;
          if (!readByMe && !lastSeenIds.current.has(item.id) && (item.type === 'critical' || item.type === 'warning')) {
            lastSeenIds.current.add(item.id);
            try {
              new Notification(item.title || 'Alerta do PIE', {
                body: item.message || 'Existe uma nova pendência no prontuário.',
                icon: '/icons/icon-192.png',
                badge: '/icons/icon-192.png',
              });
            } catch {
              // Navegadores podem bloquear notificação em contexto não seguro.
            }
          }
        });
      }
    });

    return () => unsub();
  }, [browserPermission, role, user]);

  const unreadCount = useMemo(() => notifications.filter(item => {
    if (!user) return false;
    return !item.read && !item.readBy?.includes(user.uid);
  }).length, [notifications, user]);

  const requestBrowserNotifications = async () => {
    if (!('Notification' in window)) {
      setBrowserPermission('unsupported');
      return;
    }
    const permission = await Notification.requestPermission();
    setBrowserPermission(permission);
  };

  const markAsRead = async (item: AppNotification) => {
    if (!user) return;
    await updateDoc(doc(db, 'notifications', item.id), {
      readBy: arrayUnion(user.uid),
      [`readAt.${user.uid}`]: serverTimestamp(),
    });
  };

  const markAllAsRead = async () => {
    if (!user) return;
    const unread = notifications.filter(item => !item.read && !item.readBy?.includes(user.uid));
    await Promise.all(unread.map(item => markAsRead(item)));
  };

  return (
    <div className="relative">
      <button
        type="button"
        className="relative text-text-secondary hover:text-text-primary transition-colors"
        title="Central de notificações"
        onClick={() => setOpen(prev => !prev)}
      >
        {unreadCount > 0 ? <BellRing size={20} className="text-orange-400" /> : <Bell size={20} />}
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 min-w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center px-1 font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-[min(92vw,420px)] rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display font-bold text-text-primary text-sm uppercase tracking-[0.18em]">Notificações</h3>
              <p className="text-[11px] text-text-tertiary mt-1">Alertas automáticos do prontuário</p>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-text-secondary hover:text-orange-400" title="Marcar todas como lidas">
                  <CheckCheck size={18} />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-text-secondary hover:text-red-400" title="Fechar">
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="p-3 border-b border-border bg-surface-hover/40">
            {browserPermission === 'default' && (
              <button onClick={requestBrowserNotifications} className="w-full text-left text-[11px] text-orange-400 border border-orange-500/30 rounded-xl p-3 hover:bg-orange-500/10 transition-colors">
                Ativar aviso do navegador/PWA quando o app estiver aberto.
              </button>
            )}
            {browserPermission === 'unsupported' && (
              <p className="text-[11px] text-text-tertiary">Este navegador não oferece suporte à API de notificações.</p>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto main-scrollbar p-3 space-y-2">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-text-secondary border border-border rounded-xl">
                Nenhuma notificação criada ainda.
              </div>
            ) : notifications.map(item => {
              const isUnread = user && !item.read && !item.readBy?.includes(user.uid);
              return (
                <div key={item.id} className={`rounded-xl border p-3 ${typeStyle(item.type)} ${isUnread ? 'ring-1 ring-orange-500/40' : 'opacity-80'}`}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {item.type === 'critical' ? <ShieldAlert size={18} /> : item.type === 'success' ? <CheckCheck size={18} /> : item.type === 'warning' ? <BellRing size={18} /> : <Mail size={18} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-bold text-text-primary">{item.title || 'Notificação'}</h4>
                        <span className="text-[10px] text-text-tertiary whitespace-nowrap">{formatDate(item.createdAt)}</span>
                      </div>
                      <p className="text-xs text-text-secondary mt-1 leading-relaxed">{item.message}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {item.link && (
                          <Link to={item.link} onClick={() => { markAsRead(item); setOpen(false); }} className="inline-flex items-center gap-1 text-[11px] text-orange-400 hover:text-orange-300">
                            Abrir <ExternalLink size={12} />
                          </Link>
                        )}
                        {isUnread && (
                          <button onClick={() => markAsRead(item)} className="text-[11px] text-text-secondary hover:text-text-primary">Marcar como lida</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
