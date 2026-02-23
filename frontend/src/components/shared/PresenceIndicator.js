import { useState } from 'react';
import axios from 'axios';
import { cn } from '../../lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const presenceConfig = {
  available: {
    label: 'Available',
    color: 'bg-emerald-500',
    textColor: 'text-emerald-700',
    bgLight: 'bg-emerald-50'
  },
  in_session: {
    label: 'In Session',
    color: 'bg-red-500',
    textColor: 'text-red-700',
    bgLight: 'bg-red-50'
  },
  on_leave: {
    label: 'On Leave',
    color: 'bg-amber-500',
    textColor: 'text-amber-700',
    bgLight: 'bg-amber-50'
  },
  offline: {
    label: 'Offline',
    color: 'bg-slate-400',
    textColor: 'text-slate-700',
    bgLight: 'bg-slate-100'
  }
};

export const PresenceIndicator = ({ presence = 'offline', userId, editable = false, size = 'md' }) => {
  const [currentPresence, setCurrentPresence] = useState(presence);
  const [loading, setLoading] = useState(false);

  const config = presenceConfig[currentPresence] || presenceConfig.offline;

  const handlePresenceChange = async (newPresence) => {
    if (!userId) return;
    
    setLoading(true);
    try {
      await axios.put(
        `${API}/doctors/${userId}/presence`,
        { presence: newPresence },
        { withCredentials: true }
      );
      setCurrentPresence(newPresence);
      toast.success(`Status updated to ${presenceConfig[newPresence].label}`);
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  if (!editable) {
    return (
      <div className="flex items-center gap-2">
        <span className={cn('rounded-full', sizeClasses[size], config.color)} />
        <span className={cn('text-xs font-medium', config.textColor)}>
          {config.label}
        </span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn('gap-2', config.bgLight, config.textColor)}
          disabled={loading}
          data-testid="presence-dropdown"
        >
          <span className={cn('rounded-full', sizeClasses[size], config.color)} />
          {config.label}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(presenceConfig).map(([key, value]) => (
          <DropdownMenuItem
            key={key}
            onClick={() => handlePresenceChange(key)}
            className="gap-2"
            data-testid={`presence-option-${key}`}
          >
            <span className={cn('w-3 h-3 rounded-full', value.color)} />
            {value.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
