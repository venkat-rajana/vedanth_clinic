import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { FileQuestion, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="text-center">
        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
          <FileQuestion className="h-10 w-10 text-slate-400" />
        </div>
        <h1 className="text-6xl font-bold text-slate-900 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-slate-700 mb-4">Page Not Found</h2>
        <p className="text-slate-500 mb-8 max-w-md">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/">
          <Button className="bg-teal-700 hover:bg-teal-800">
            <Home className="h-4 w-4 mr-2" />
            Go Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
