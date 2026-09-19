import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  HeartHandshake, 
  Wifi, 
  WifiOff, 
  LayoutDashboard, 
  PlusCircle, 
  ClipboardList, 
  Clock, 
  BarChart3, 
  ShieldCheck,
  Home,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Bell,
  Search
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';
import { useLanguage } from '../context/LanguageContext';
import { getNotifications } from '../services/api';

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const { isOnline, isSimulatedOffline, toggleSimulatedOffline, offlineQueue } = useOffline();
  const { lang, changeLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'asha') {
      getNotifications()
        .then(data => {
          if (data && typeof data.unread_count === 'number') {
            setUnreadNotifCount(data.unread_count);
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated, user?.role, location.pathname]);

  // Strict Role-based Navigation
  const isAdmin = user?.role === 'admin';

  const ashaNavItems = [
    { path: '/dashboard', label: t('navDashboard', 'Dashboard'), icon: LayoutDashboard },
    { path: '/households', label: t('navHouseholds', 'Households & Members'), icon: Home },
    { path: '/encounters/new', label: t('navNewVisit', '+ New Visit'), icon: PlusCircle, highlight: true },
    { path: '/history', label: t('navHistory', 'Visit History'), icon: ClipboardList },
    { 
      path: '/followups', 
      label: unreadNotifCount > 0 ? `Follow-ups (${unreadNotifCount})` : t('navFollowups', 'Follow-ups'), 
      icon: Clock,
      badge: unreadNotifCount > 0 ? unreadNotifCount : null,
      alert: unreadNotifCount > 0
    },
    { path: '/retrieval', label: 'Data Retrieval', icon: Search },
    { path: '/offline-sync', label: `${t('navSync', 'Offline Sync')} (${offlineQueue.length})`, icon: isOnline ? Wifi : WifiOff, alert: offlineQueue.length > 0 },
    { path: '/privacy', label: t('navPrivacy', 'Safety & Governance'), icon: ShieldCheck }
  ];

  const adminNavItems = [
    { path: '/admin/history', label: 'All Visit History', icon: ClipboardList },
    { path: '/retrieval', label: 'Data Retrieval', icon: Search },
    { path: '/admin/operations', label: 'Admin Operations & Health', icon: LayoutDashboard },
    { path: '/admin/safety-governance', label: 'Safety & Governance Audit', icon: ShieldCheck }
  ];


  const navItems = isAdmin ? adminNavItems : ashaNavItems;

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo */}
          <Link 
            to={isAdmin ? "/admin/history" : "/dashboard"} 
            className="flex items-center gap-3 group shrink-0"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-sm shadow-teal-500/20 group-hover:bg-teal-700 transition">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg tracking-tight text-slate-900">ASHA OneCapture</span>
                <span className="bg-teal-50 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-teal-200">
                  PS-H02
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                {t('tagline', 'One Visit. One Entry. Multiple Records.')}
              </p>
            </div>
          </Link>

          {/* Right Controls: Language Selector, Offline Toggle & Profile */}
          <div className="flex items-center gap-2.5">
            {/* Language Selector Switcher */}
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-xs border border-slate-200">
              <button
                type="button"
                onClick={() => changeLanguage('en')}
                className={`px-2 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                  lang === 'en' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="English"
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => changeLanguage('te')}
                className={`px-2 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                  lang === 'te' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="తెలుగు (Telugu)"
              >
                తెలుగు
              </button>
              <button
                type="button"
                onClick={() => changeLanguage('hi')}
                className={`px-2 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                  lang === 'hi' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="हिंदी (Hindi)"
              >
                हिंदी
              </button>
            </div>

            {/* Offline Simulation Toggle Button */}
            <button
              onClick={toggleSimulatedOffline}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition cursor-pointer ${
                isOnline 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100' 
                  : 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
              }`}
              title="Click to simulate offline / online network state"
            >
              {isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{t('online', 'Online')}</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span className="font-semibold">Offline ({offlineQueue.length})</span>
                </>
              )}
            </button>

            {/* User Profile / Menu */}
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 transition cursor-pointer text-xs font-bold text-slate-800"
                >
                  <div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-[11px] font-black">
                    {(user.full_name || user.name || user.username || 'A')[0].toUpperCase()}
                  </div>
                  <span className="hidden sm:inline max-w-[120px] truncate">
                    {user.full_name || user.name || user.username}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-500" />
                </button>

                {isUserMenuOpen && (
                  <div 
                    className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs font-medium"
                    onMouseLeave={() => setIsUserMenuOpen(false)}
                  >
                    <div className="px-3.5 py-2 border-b border-slate-100">
                      <p className="font-bold text-slate-900">{user.full_name || user.name || user.username}</p>
                      <p className="text-[10px] text-slate-500 capitalize">{user.role || 'ASHA Worker'} • {user.area || user.sector || 'Sub-center'}</p>
                    </div>

                    <Link
                      to="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3.5 py-2 hover:bg-slate-50 text-slate-700"
                    >
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Worker Profile</span>
                    </Link>

                    <Link
                      to="/settings"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3.5 py-2 hover:bg-slate-50 text-slate-700"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-400" />
                      <span>System Settings</span>
                    </Link>

                    <div className="border-t border-slate-100 my-1"></div>

                    <button
                      onClick={handleLogout}
                      className="w-full text-left flex items-center gap-2 px-3.5 py-2 text-rose-600 hover:bg-rose-50 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>

        {/* Navigation Bar Pills */}
        <nav className="flex items-center space-x-1 py-2 overflow-x-auto border-t border-slate-100 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/');
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive: linkActive }) => {
                  const active = linkActive || isActive;
                  return `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                    active
                      ? 'bg-teal-600 text-white shadow-xs'
                      : item.highlight
                      ? 'bg-teal-50 text-teal-800 hover:bg-teal-100 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`;
                }}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : item.alert ? 'text-amber-600' : 'text-slate-500'}`} />
                <span>{item.label}</span>
                {item.alert && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
