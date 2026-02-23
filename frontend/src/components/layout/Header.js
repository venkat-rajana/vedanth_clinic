import { useAuth } from '../../contexts/AuthContext';
import { PresenceIndicator } from '../shared/PresenceIndicator';
import { Bell, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';

export const Header = ({ title, subtitle, showBack = false, backPath }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleBack = () => {
    if (backPath) {
      navigate(backPath);
    } else {
      navigate(-1);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showBack && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleBack}
              className="hover:bg-slate-100"
              data-testid="back-btn"
            >
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Doctor presence control */}
          {user?.role === 'doctor' && (
            <PresenceIndicator
              presence={user.presence}
              userId={user.user_id}
              editable
            />
          )}

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative" data-testid="notifications-btn">
            <Bell className="h-5 w-5 text-slate-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </Button>

          {/* User avatar */}
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
            {user?.picture ? (
              <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-slate-600 font-medium">
                {user?.name?.charAt(0)?.toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
