import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ShieldX, Home } from 'lucide-react';

export default function Unauthorized() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="text-center">
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
          <ShieldX className="h-10 w-10 text-red-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Access Denied</h1>
        <p className="text-slate-500 mb-8 max-w-md">
          You don't have permission to access this page. Please contact your administrator if you believe this is an error.
        </p>
        <Link to="/dashboard">
          <Button className="bg-teal-700 hover:bg-teal-800">
            <Home className="h-4 w-4 mr-2" />
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
