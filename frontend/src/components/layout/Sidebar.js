import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserCog,
  FileText,
  Receipt,
  Settings,
  LogOut,
  Stethoscope,
  ClipboardList,
  Video,
  Menu,
  X
} from 'lucide-react';
import { Button } from '../ui/button';
import { useState } from 'react';
import { cn } from '../../lib/utils';

const navItems = {
  admin: [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/schedule', icon: Calendar, label: 'Schedule' },
    { path: '/users', icon: Users, label: 'User Management' },
    { path: '/appointments', icon: ClipboardList, label: 'All Appointments' },
    { path: '/invoices', icon: Receipt, label: 'Invoices' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ],
  doctor: [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/schedule', icon: Calendar, label: 'Schedule' },
    { path: '/appointments', icon: ClipboardList, label: 'My Appointments' },
    { path: '/patients', icon: Users, label: 'My Patients' },
    { path: '/medical-records', icon: FileText, label: 'Medical Records' },
  ],
  staff: [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/schedule', icon: Calendar, label: 'Schedule' },
    { path: '/book-appointment', icon: ClipboardList, label: 'Book Appointment' },
    { path: '/appointments', icon: ClipboardList, label: 'Today\'s Schedule' },
    { path: '/invoices', icon: Receipt, label: 'Billing' },
    { path: '/patients', icon: Users, label: 'Patients' },
  ],
  patient: [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/book-appointment', icon: Calendar, label: 'Book Appointment' },
    { path: '/appointments', icon: ClipboardList, label: 'My Appointments' },
    { path: '/medical-records', icon: FileText, label: 'Medical History' },
    { path: '/invoices', icon: Receipt, label: 'My Invoices' },
  ],
};

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  const items = navItems[user.role] || navItems.patient;

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-700 flex items-center justify-center">
            <Stethoscope className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-lg">Vedanth Clinic</h1>
            <p className="text-xs text-slate-500 capitalize">{user.role} Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
            {user.picture ? (
              <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-slate-600 font-medium">
                {user.name?.charAt(0)?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-slate-600 hover:text-red-600 hover:bg-red-50"
          onClick={logout}
          data-testid="logout-btn"
        >
          <LogOut className="h-5 w-5 mr-3" />
          Sign Out
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
        data-testid="mobile-menu-btn"
      >
        {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed md:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <NavContent />
      </aside>
    </>
  );
};
