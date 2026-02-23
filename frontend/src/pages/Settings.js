import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Header } from '../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { User, Mail, Phone, MapPin, Shield, Loader2 } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    specialization: user?.specialization || '',
  });

  const handleSave = async () => {
    if (!profile.name) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: profile.name,
        phone: profile.phone || null,
        address: profile.address || null,
      };
      if (user?.role === 'doctor') {
        payload.specialization = profile.specialization || null;
      }
      await axios.put(`${API}/users/${user.user_id}`, payload, { withCredentials: true });
      toast.success('Profile updated successfully');
      if (refreshUser) refreshUser();
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <Header title="Settings" subtitle="Manage your account" showBack={true} backPath="/dashboard" />
      <div className="p-6 max-w-2xl" data-testid="settings-page">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                data-testid="settings-name"
              />
            </div>
            <div>
              <Label className="flex items-center gap-1">
                <Mail className="h-3 w-3" /> Email
              </Label>
              <Input value={user?.email || ''} disabled className="bg-slate-50" data-testid="settings-email" />
              <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
            </div>
            <div>
              <Label className="flex items-center gap-1">
                <Phone className="h-3 w-3" /> Phone
              </Label>
              <Input
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="+91 98765 43210"
                data-testid="settings-phone"
              />
            </div>
            <div>
              <Label className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Address
              </Label>
              <Input
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                placeholder="Enter your address"
                data-testid="settings-address"
              />
            </div>
            {user?.role === 'doctor' && (
              <div>
                <Label>Specialization</Label>
                <Input
                  value={profile.specialization}
                  onChange={(e) => setProfile({ ...profile, specialization: e.target.value })}
                  data-testid="settings-specialization"
                />
              </div>
            )}
            <div className="pt-2">
              <Button
                className="bg-teal-700 hover:bg-teal-800"
                onClick={handleSave}
                disabled={saving}
                data-testid="save-settings-btn"
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Account Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-slate-500">Role</span>
              <span className="text-sm font-medium capitalize">{user?.role}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-slate-500">Account Status</span>
              <span className="text-sm font-medium text-emerald-600">Active</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-slate-500">Member Since</span>
              <span className="text-sm font-medium">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', {
                  year: 'numeric', month: 'long', day: 'numeric'
                }) : 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
