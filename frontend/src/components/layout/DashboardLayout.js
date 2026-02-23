import { Sidebar } from './Sidebar';
import { Toaster } from '../ui/sonner';

export const DashboardLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <main className="flex-1 md:ml-0 overflow-auto">
        {children}
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
};
