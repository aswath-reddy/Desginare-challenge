import React from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  Compass,
  Grid,
  CalendarCheck,
  MessageSquare,
  Bookmark,
  Bell,
  User,
  Plus,
  BarChart3,
  ShieldCheck,
} from 'lucide-react';
import { BrandLogo } from '@/src/components/BrandLogo';
import { UserAvatar } from '@/src/components/EditorialImage';
import { useAuth } from '@/src/context/AuthContext';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { publicProfile, isAdmin, unreadNotificationsCount } = useAuth();
  const location = useLocation();

  const desktopLinks = [
    { to: '/discover', label: 'Discover', icon: Compass },
    { to: '/explore', label: 'Explore', icon: Grid },
    { to: '/my-plans', label: 'My Plans', icon: CalendarCheck },
    { to: '/messages', label: 'Messages', icon: MessageSquare },
    { to: '/saved', label: 'Saved', icon: Bookmark },
    {
      to: '/notifications',
      label: 'Notifications',
      icon: Bell,
      badge: unreadNotificationsCount,
    },
    { to: '/profile', label: 'Profile', icon: User },
  ];

  const mobileTabs = [
    { to: '/discover', label: 'Discover', icon: Compass },
    { to: '/my-plans', label: 'My Plans', icon: CalendarCheck },
    { to: '/create', label: 'Create', icon: Plus },
    { to: '/messages', label: 'Messages', icon: MessageSquare },
    { to: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#F8F6F0] text-[#080808] flex flex-col lg:flex-row">
      {/* Desktop Editorial Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[260px] lg:fixed lg:inset-y-0 lg:left-0 bg-white border-r border-[#E5E3DD] px-5 py-7 justify-between z-30">
        <div className="space-y-8">
          <div className="px-2">
            <Link to="/discover" className="inline-block">
              <BrandLogo variant="dark" size="md" />
            </Link>
          </div>

          <Link
            to="/create"
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#080808] text-[#F8F6F0] px-5 py-3 text-sm font-medium hover:bg-[#1E1E1E] active:scale-[0.98] transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            Create a Plan
          </Link>

          <nav aria-label="Main navigation" className="space-y-1">
            {desktopLinks.map(({ to, label, icon: Icon, badge }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-[#080808] text-[#F8F6F0]'
                      : 'text-[#747474] hover:text-[#080808] hover:bg-[#F8F6F0]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="flex items-center gap-3">
                      <Icon className="w-4 h-4 shrink-0" strokeWidth={1.65} />
                      <span>{label}</span>
                    </span>
                    {typeof badge === 'number' && badge > 0 && (
                      <span
                        className={`text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-[#F8F6F0] text-[#080808]'
                            : 'bg-[#080808] text-[#F8F6F0]'
                        }`}
                      >
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}

            {isAdmin && (
              <div className="pt-3 mt-3 border-t border-[#E5E3DD]">
                <NavLink
                  to="/admin/impact"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-[#080808] text-[#F8F6F0]'
                        : 'text-[#747474] hover:text-[#080808] hover:bg-[#F8F6F0]'
                    }`
                  }
                >
                  <BarChart3 className="w-4 h-4 shrink-0" strokeWidth={1.65} />
                  <span>Impact &amp; Safety</span>
                </NavLink>
              </div>
            )}
          </nav>
        </div>

        <div className="space-y-3 pt-5 border-t border-[#E5E3DD]">
          <Link
            to="/safety"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[#747474] hover:text-[#080808] hover:bg-[#F8F6F0] transition-colors"
          >
            <ShieldCheck className="w-4 h-4" strokeWidth={1.65} />
            <span>Safety Center</span>
          </Link>

          {publicProfile && (
            <Link
              to="/profile"
              className="flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-[#F8F6F0] transition-colors"
            >
              <UserAvatar
                src={publicProfile.photoURL}
                name={publicProfile.displayName}
                size="sm"
              />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[#080808] truncate">
                  {publicProfile.displayName}
                </p>
                <p className="text-[11px] text-[#747474] truncate">{publicProfile.city}</p>
              </div>
            </Link>
          )}
        </div>
      </aside>

      {/* Mobile Compact Header */}
      <header className="lg:hidden sticky top-0 z-30 bg-[#F8F6F0]/90 backdrop-blur-md border-b border-[#E5E3DD] px-4 h-14 flex items-center justify-between">
        <Link to="/discover">
          <BrandLogo variant="dark" size="sm" />
        </Link>
        <div className="flex items-center gap-1">
          <Link
            to="/explore"
            aria-label="Explore categories"
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#080808] hover:bg-[#F0EEE8] transition-colors"
          >
            <Grid className="w-[18px] h-[18px]" strokeWidth={1.65} />
          </Link>
          <Link
            to="/saved"
            aria-label="Saved activities"
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#080808] hover:bg-[#F0EEE8] transition-colors"
          >
            <Bookmark className="w-[18px] h-[18px]" strokeWidth={1.65} />
          </Link>
          <Link
            to="/notifications"
            aria-label="Notifications"
            className="relative w-10 h-10 rounded-full flex items-center justify-center text-[#080808] hover:bg-[#F0EEE8] transition-colors"
          >
            <Bell className="w-[18px] h-[18px]" strokeWidth={1.65} />
            {unreadNotificationsCount > 0 && (
              <span
                aria-label={`${unreadNotificationsCount} unread notifications`}
                className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#080808]"
              />
            )}
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 lg:pl-[260px] pb-20 lg:pb-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 lg:px-12 py-7 sm:py-10">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile bottom navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#E5E3DD] h-16 px-2 flex items-center justify-around"
      >
        {mobileTabs.map(({ to, label, icon: Icon }) => {
          const active = location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-xl min-w-[56px] text-[11px] font-medium transition-colors ${
                active ? 'text-[#080808]' : 'text-[#747474]'
              }`}
            >
              <span
                className={`w-9 h-7 rounded-full flex items-center justify-center transition-transform active:scale-95 ${
                  to === '/create'
                    ? 'bg-[#080808] text-[#F8F6F0]'
                    : active
                      ? 'bg-[#F0EEE8] text-[#080808]'
                      : ''
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={active || to === '/create' ? 2 : 1.65} />
              </span>
              <span className="whitespace-nowrap">{label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
