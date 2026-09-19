import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  HeartHandshake, 
  LayoutDashboard, 
  Home, 
  PlusCircle, 
  ClipboardList, 
  Clock, 
  Search, 
  MessageSquare, 
  User, 
  Settings, 
  ShieldCheck, 
  LogOut, 
  ChevronLeft, 
  ChevronRight, 
  Wifi, 
  WifiOff, 
  X,
  Building
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useOffline } from '../../context/OfflineContext';

export default function Sidebar({ 
  isCollapsed, 
  setIsCollapsed, 
  isMobileOpen, 
  setIsMobileOpen,
  notificationCount = 0 
}) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const { isOnline, offlineQueue } = useOffline();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = user?.role === 'admin';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const ashaNavItems = [
    { path: '/dashboard', label: t('navDashboard', 'Dashboard'), icon: LayoutDashboard },
    { path: '/households', label: t('navHouseholds', 'Households'), icon: Home },
    { path: '/encounters/new', label: t('navNewVisit', '+ New Visit'), icon: PlusCircle, isPrimary: true },
    { path: '/history', label: t('navHistory', 'Visits / History'), icon: ClipboardList },
    { 
      path: '/followups', 
      label: t('navFollowups', 'Follow-ups'), 
      icon: Clock, 
      badge: notificationCount > 0 ? notificationCount : null,
      badgeColor: 'bg-rose-500 text-white' 
    },
    { path: '/retrieval', label: 'Data Retrieval', icon: Search },
    { 
      path: '/retrieval?category=SMS', 
      label: 'SMS History', 
      icon: MessageSquare, 
      isActive: location.pathname === '/retrieval' && location.search.includes('category=SMS')
    },
    { 
      path: '/offline-sync', 
      label: 'Offline Sync', 
      icon: isOnline ? Wifi : WifiOff, 
      badge: offlineQueue.length > 0 ? offlineQueue.length : null,
      badgeColor: 'bg-amber-500 text-white'
    },
    { path: '/privacy', label: t('navPrivacy', 'Privacy & Safety'), icon: ShieldCheck },
    { path: '/settings', label: 'Settings', icon: Settings },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  const adminNavItems = [
    { path: '/admin/history', label: 'All Visit History', icon: ClipboardList },
    { path: '/retrieval', label: 'Data Retrieval', icon: Search },
    { path: '/admin/operations', label: 'Admin Operations', icon: Building },
    { path: '/admin/safety-governance', label: 'Safety & Governance', icon: ShieldCheck },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  const navItems = isAdmin ? adminNavItems : ashaNavItems;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200/90 select-none">
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-teal-700 flex items-center justify-center text-white shadow-xs shadow-teal-700/20 shrink-0">
            <HeartHandshake className="w-5 h-5" />
          </div>
          {(!isCollapsed || isMobileOpen) && (
            <div className="overflow-hidden">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm tracking-tight text-slate-900 truncate">
                  ASHA OneCapture
                </span>
                <span className="bg-teal-50 text-teal-800 text-[9px] font-bold px-1.5 py-0.2 rounded border border-teal-200 shrink-0">
                  {isAdmin ? 'ADMIN' : 'PS-H02'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 truncate font-medium">
                {isAdmin ? 'Healthcare Nodal Office' : 'Frontline Health Platform'}
              </p>
            </div>
          )}
        </div>

        {/* Mobile close button */}
        {isMobileOpen && (
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Desktop collapse toggle */}
        {!isMobileOpen && (
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded-lg transition cursor-pointer"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems.map((item, idx) => {
          const Icon = item.icon;
          const isCurrent = item.isActive !== undefined 
            ? item.isActive 
            : location.pathname === item.path && (!item.path.includes('?') || location.search === item.path.split('?')[1]);

          return (
            <NavLink
              key={idx}
              to={item.path}
              onClick={() => isMobileOpen && setIsMobileOpen(false)}
              className={({ isActive }) => {
                const active = item.isActive !== undefined ? item.isActive : isActive;
                return `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition group relative ${
                  item.isPrimary
                    ? 'bg-teal-700 hover:bg-teal-800 text-white shadow-xs my-2 font-bold'
                    : active
                    ? 'bg-teal-50 text-teal-800 border border-teal-200/70 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent'
                }`;
              }}
              title={isCollapsed && !isMobileOpen ? item.label : undefined}
            >
              <Icon className={`w-4.5 h-4.5 shrink-0 ${
                item.isPrimary
                  ? 'text-white'
                  : isCurrent
                  ? 'text-teal-700'
                  : 'text-slate-400 group-hover:text-slate-600'
              }`} />
              
              {(!isCollapsed || isMobileOpen) && (
                <span className="truncate flex-1">
                  {item.label}
                </span>
              )}

              {(!isCollapsed || isMobileOpen) && item.badge && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${item.badgeColor || 'bg-teal-700 text-white'}`}>
                  {item.badge}
                </span>
              )}

              {isCollapsed && !isMobileOpen && item.badge && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Profile Card at Bottom */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/60 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-teal-800 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
              {user?.full_name ? user.full_name.charAt(0) : 'U'}
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-800 truncate leading-tight">
                  {user?.full_name || 'Health Worker'}
                </p>
                <p className="text-[10px] font-medium text-slate-500 truncate capitalize">
                  {user?.role === 'admin' ? 'Admin / Nodal' : 'ASHA Worker'}
                </p>
              </div>
            )}
          </div>

          {(!isCollapsed || isMobileOpen) && (
            <button
              type="button"
              onClick={handleLogout}
              className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`hidden md:block transition-all duration-200 shrink-0 ${
        isCollapsed ? 'w-[72px]' : 'w-[260px]'
      }`}>
        <div className={`fixed top-0 bottom-0 left-0 z-30 transition-all duration-200 ${
          isCollapsed ? 'w-[72px]' : 'w-[260px]'
        }`}>
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Backdrop & Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-150">
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity" 
            onClick={() => setIsMobileOpen(false)} 
          />
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
