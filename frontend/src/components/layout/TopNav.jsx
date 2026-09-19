import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  Menu, 
  Search, 
  Bell, 
  Wifi, 
  WifiOff, 
  Globe, 
  User, 
  Settings, 
  LogOut, 
  ShieldCheck,
  ChevronDown,
  Clock,
  PlusCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOffline } from '../../context/OfflineContext';
import { useLanguage } from '../../context/LanguageContext';
import { getNotifications } from '../../services/api';
import Breadcrumb from '../ui/Breadcrumb';

const ROUTE_TITLES = {
  '/dashboard': { title: 'Dashboard', category: 'Overview' },
  '/households': { title: 'Households & Members', category: 'Community Registry' },
  '/encounters/new': { title: 'New Household Visit', category: 'Frontline Capture' },
  '/history': { title: 'Visit Encounters History', category: 'Field History' },
  '/followups': { title: 'Follow-ups & SMS Reminders', category: 'Clinical Actions' },
  '/retrieval': { title: 'Data Retrieval & Registry', category: 'Global Search' },
  '/offline-sync': { title: 'Offline Synchronization', category: 'Device & Network' },
  '/analytics': { title: 'Impact Analytics', category: 'System Metrics' },
  '/profile': { title: 'User Profile', category: 'Account' },
  '/settings': { title: 'Settings & Preferences', category: 'System Configuration' },
  '/privacy': { title: 'Privacy & Data Governance', category: 'Compliance' },
  '/admin/history': { title: 'All Encounters & Programme Reports', category: 'Administration' },
  '/admin/operations': { title: 'Worker Operations & System Health', category: 'Administration' },
  '/admin/safety-governance': { title: 'Safety & Governance Audit', category: 'Administration' }
};

export default function TopNav({ onToggleMobileMenu, notificationCount: initialCount = 0 }) {
  const { user, logout } = useAuth();
  const { isOnline, offlineQueue, syncOfflineEncounters, isSyncing } = useOffline();
  const { lang, changeLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [notificationCount, setNotificationCount] = useState(initialCount);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  const userMenuRef = useRef(null);
  const langMenuRef = useRef(null);

  useEffect(() => {
    if (user?.role === 'asha') {
      getNotifications()
        .then(data => {
          if (data && typeof data.unread_count === 'number') {
            setNotificationCount(data.unread_count);
          }
        })
        .catch(() => {});
    }
  }, [user?.role, location.pathname]);

  // Click outside to close menus
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
      if (langMenuRef.current && !langMenuRef.current.contains(e.target)) {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      navigate(`/retrieval?q=${encodeURIComponent(globalSearch.trim())}`);
      setGlobalSearch('');
    }
  };

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    await logout();
    navigate('/login');
  };

  // Compute breadcrumbs
  const getBreadcrumbs = () => {
    const path = location.pathname;
    const items = [];

    if (path.startsWith('/households/')) {
      const parts = path.split('/');
      items.push({ label: 'Households', to: '/households' });
      if (parts[2]) {
        items.push({ label: parts[2], to: `/households/${parts[2]}` });
      }
      if (parts[3] === 'visit') {
        items.push({ label: 'Visit' });
      } else if (parts[3] === 'history') {
        items.push({ label: 'History' });
      }
      return items;
    }

    if (path.startsWith('/encounters/')) {
      const parts = path.split('/');
      if (parts[2] === 'new') {
        items.push({ label: 'New Visit' });
      } else if (parts[2] === 'review') {
        items.push({ label: 'Review Visit' });
      } else if (parts[3] === 'reports' || parts[3] === 'records') {
        items.push({ label: 'Encounters', to: '/history' });
        items.push({ label: `#${parts[2]}` });
        items.push({ label: 'Programme Records' });
      } else {
        items.push({ label: 'Encounters', to: '/history' });
        items.push({ label: `#${parts[2]}` });
      }
      return items;
    }

    const currentMeta = ROUTE_TITLES[path];
    if (currentMeta) {
      items.push({ label: currentMeta.title });
    } else {
      const title = path.slice(1).replace('-', ' ');
      items.push({ label: title.charAt(0).toUpperCase() + title.slice(1) });
    }
    return items;
  };

  const pageMeta = ROUTE_TITLES[location.pathname] || { title: 'ASHA OneCapture', category: 'Healthcare' };

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs border-b border-slate-200/90 h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left: Mobile Toggle & Page Breadcrumb / Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="md:hidden text-slate-500 hover:text-slate-800 hover:bg-slate-100 p-2 rounded-xl transition cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="hidden sm:block mb-0.5">
            <Breadcrumb items={getBreadcrumbs()} />
          </div>
          <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight truncate leading-none">
            {pageMeta.title}
          </h1>
        </div>
      </div>

      {/* Right: Global Search, Connectivity, Notifications, Language, Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Global Search Bar (hidden on very small screens) */}
        <form onSubmit={handleSearchSubmit} className="hidden lg:block w-52 xl:w-64">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Search people, IDs..."
              className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition"
            />
          </div>
        </form>

        {/* Quick New Visit Action for ASHA */}
        {user?.role === 'asha' && (
          <Link
            to="/encounters/new"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-2xs transition"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Visit</span>
          </Link>
        )}

        {/* Network / Offline Sync Status */}
        <div className="flex items-center">
          <Link
            to="/offline-sync"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border transition ${
              !isOnline 
                ? 'bg-rose-50 text-rose-700 border-rose-200' 
                : offlineQueue.length > 0
                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
            }`}
            title={!isOnline ? "Device is offline" : `${offlineQueue.length} records pending sync`}
          >
            {!isOnline ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden xl:inline text-[11px]">Offline</span>
              </>
            ) : offlineQueue.length > 0 ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                <span className="text-[11px]">Sync ({offlineQueue.length})</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden xl:inline text-[11px]">Synced</span>
              </>
            )}
          </Link>
        </div>

        {/* Notification Bell */}
        {user?.role === 'asha' && (
          <Link
            to="/followups"
            className="relative p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            title="Follow-up Notifications"
          >
            <Bell className="w-4.5 h-4.5" />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 ring-2 ring-white">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </Link>
        )}

        {/* Language Switcher Dropdown */}
        <div className="relative" ref={langMenuRef}>
          <button
            type="button"
            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer shadow-2xs"
          >
            <Globe className="w-3.5 h-3.5 text-teal-700" />
            <span className="uppercase text-[11px]">{lang}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isLangMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-36 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 text-xs animate-in fade-in duration-100">
              {[
                { code: 'en', label: 'English (IN)' },
                { code: 'te', label: 'తెలుగు (Telugu)' },
                { code: 'hi', label: 'हिंदी (Hindi)' }
              ].map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => {
                    changeLanguage(l.code);
                    setIsLangMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 font-medium flex items-center justify-between cursor-pointer ${
                    lang === l.code ? 'text-teal-700 font-bold bg-teal-50/50' : 'text-slate-700'
                  }`}
                >
                  <span>{l.label}</span>
                  {lang === l.code && <span className="text-teal-600">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User Account Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition cursor-pointer shadow-2xs"
          >
            <div className="w-6 h-6 rounded-lg bg-teal-800 text-white flex items-center justify-center font-black text-[11px]">
              {user?.full_name ? user.full_name.charAt(0) : 'U'}
            </div>
            <span className="hidden md:inline text-xs font-bold text-slate-800 max-w-[100px] truncate">
              {user?.full_name?.split(' ')[0] || 'User'}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-xs animate-in fade-in duration-100">
              <div className="px-3.5 py-2 border-b border-slate-100 mb-1">
                <p className="font-bold text-slate-900 truncate">{user?.full_name || 'Health Worker'}</p>
                <p className="text-[10px] text-slate-500 font-medium truncate capitalize">
                  {user?.role === 'admin' ? 'Administrative Officer' : 'Community Health Worker'}
                </p>
                {user?.area && (
                  <p className="text-[10px] text-teal-700 truncate mt-0.5">{user.area}</p>
                )}
              </div>

              <Link
                to="/profile"
                onClick={() => setIsUserMenuOpen(false)}
                className="flex items-center gap-2 px-3.5 py-1.5 text-slate-700 hover:bg-slate-50 font-medium"
              >
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>My Profile</span>
              </Link>

              <Link
                to="/settings"
                onClick={() => setIsUserMenuOpen(false)}
                className="flex items-center gap-2 px-3.5 py-1.5 text-slate-700 hover:bg-slate-50 font-medium"
              >
                <Settings className="w-3.5 h-3.5 text-slate-400" />
                <span>Settings</span>
              </Link>

              <Link
                to="/privacy"
                onClick={() => setIsUserMenuOpen(false)}
                className="flex items-center gap-2 px-3.5 py-1.5 text-slate-700 hover:bg-slate-50 font-medium"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>Privacy & Governance</span>
              </Link>

              <div className="border-t border-slate-100 my-1 pt-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3.5 py-1.5 text-rose-600 hover:bg-rose-50 font-bold cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
