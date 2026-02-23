import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Header } from '../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { Separator } from '../components/ui/separator';
import { toast } from 'sonner';
import { 
  Search, 
  FileText, 
  Calendar, 
  Stethoscope, 
  Pill,
  FlaskConical,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';
import { formatDate } from '../lib/utils';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function MedicalRecords() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRecord, setExpandedRecord] = useState(null);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const res = await axios.get(`${API}/medical-records`, { withCredentials: true });
      setRecords(res.data);
    } catch (error) {
      toast.error('Failed to load medical records');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter(record => 
    record.diagnosis?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.prescription?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <Header 
        title="Medical Records" 
        subtitle={user?.role === 'patient' ? 'View your medical history' : 'Patient medical records'}
        showBack={true}
        backPath="/dashboard"
      />
      <div className="p-6" data-testid="medical-records-page">
        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="search-records"
              />
            </div>
          </CardContent>
        </Card>

        {/* Records List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        ) : filteredRecords.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No medical records found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRecords.map((record) => (
              <Card 
                key={record.record_id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setExpandedRecord(
                  expandedRecord === record.record_id ? null : record.record_id
                )}
                data-testid={`record-card-${record.record_id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-teal-50 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-teal-700" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {record.diagnosis?.slice(0, 50)}
                          {record.diagnosis?.length > 50 ? '...' : ''}
                        </p>
                        <p className="text-sm text-slate-500">
                          {formatDate(record.created_at)}
                        </p>
                      </div>
                    </div>
                    <ChevronRight 
                      className={`h-5 w-5 text-slate-400 transition-transform ${
                        expandedRecord === record.record_id ? 'rotate-90' : ''
                      }`} 
                    />
                  </div>
                  
                  {/* Expanded Details */}
                  {expandedRecord === record.record_id && (
                    <div className="mt-6 pt-6 border-t border-slate-200 space-y-4">
                      {/* Diagnosis */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Stethoscope className="h-4 w-4 text-teal-700" />
                          <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                            Diagnosis
                          </span>
                        </div>
                        <p className="text-slate-700 bg-slate-50 p-4 rounded-lg">
                          {record.diagnosis}
                        </p>
                      </div>
                      
                      {/* Prescription */}
                      {record.prescription && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Pill className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                              Prescription
                            </span>
                          </div>
                          <p className="text-slate-700 bg-blue-50 p-4 rounded-lg">
                            {record.prescription}
                          </p>
                        </div>
                      )}
                      
                      {/* Lab Results */}
                      {record.lab_results && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <FlaskConical className="h-4 w-4 text-purple-600" />
                            <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                              Lab Results
                            </span>
                          </div>
                          <p className="text-slate-700 bg-purple-50 p-4 rounded-lg">
                            {record.lab_results}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
