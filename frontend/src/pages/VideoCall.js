import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  MessageSquare,
  Users,
  Settings,
  Maximize2,
  ArrowLeft
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function VideoCall() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    fetchAppointment();
  }, [id]);

  const fetchAppointment = async () => {
    try {
      const res = await axios.get(`${API}/appointments/${id}`, { withCredentials: true });
      setAppointment(res.data);
    } catch (error) {
      toast.error('Failed to load appointment');
      navigate('/appointments');
    } finally {
      setLoading(false);
    }
  };

  const handleEndCall = () => {
    toast.success('Call ended');
    navigate('/appointments');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col" data-testid="video-call-page">
      {/* Header */}
      <header className="bg-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            className="text-white hover:bg-slate-700"
            onClick={() => navigate('/appointments')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-white font-semibold">Video Consultation</h1>
            <p className="text-slate-400 text-sm">
              {user?.role === 'patient' ? appointment?.doctor_name : appointment?.patient_name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">
            <span className="w-2 h-2 bg-red-500 rounded-full inline-block mr-2 animate-pulse"></span>
            Live
          </div>
        </div>
      </header>

      {/* Main Video Area */}
      <main className="flex-1 p-6 flex gap-6">
        {/* Video Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Remote Video (Other participant) */}
          <div className="video-placeholder rounded-xl flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl text-white font-semibold">
                    {user?.role === 'patient' 
                      ? appointment?.doctor_name?.charAt(0) 
                      : appointment?.patient_name?.charAt(0)}
                  </span>
                </div>
                <p className="text-white font-medium">
                  {user?.role === 'patient' ? appointment?.doctor_name : appointment?.patient_name}
                </p>
                <p className="text-slate-400 text-sm mt-1">Waiting to join...</p>
              </div>
            </div>
            {/* Placeholder for actual video */}
            <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-lg text-white text-sm">
              {user?.role === 'patient' ? appointment?.doctor_name : appointment?.patient_name}
            </div>
          </div>

          {/* Local Video (Self) */}
          <div className="video-placeholder rounded-xl flex items-center justify-center relative overflow-hidden lg:h-auto h-48">
            <div className="absolute inset-0 flex items-center justify-center">
              {videoEnabled ? (
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-teal-700 flex items-center justify-center mx-auto mb-3">
                    <span className="text-3xl text-white font-semibold">
                      {user?.name?.charAt(0)}
                    </span>
                  </div>
                  <p className="text-white font-medium">{user?.name}</p>
                  <p className="text-slate-400 text-sm">You</p>
                </div>
              ) : (
                <div className="text-center">
                  <VideoOff className="h-12 w-12 text-slate-500 mx-auto mb-2" />
                  <p className="text-slate-400">Camera off</p>
                </div>
              )}
            </div>
            <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-lg text-white text-sm">
              You {!audioEnabled && '(Muted)'}
            </div>
          </div>
        </div>

        {/* Chat Panel */}
        {chatOpen && (
          <div className="w-80 bg-slate-800 rounded-xl flex flex-col">
            <div className="p-4 border-b border-slate-700">
              <h3 className="text-white font-medium">Chat</h3>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="text-center text-slate-500 text-sm">
                No messages yet
              </div>
            </div>
            <div className="p-4 border-t border-slate-700">
              <input
                type="text"
                placeholder="Type a message..."
                className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        )}
      </main>

      {/* Controls */}
      <footer className="bg-slate-800 px-6 py-4">
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="ghost"
            size="lg"
            className={`rounded-full w-14 h-14 ${audioEnabled ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-red-500 text-white hover:bg-red-600'}`}
            onClick={() => setAudioEnabled(!audioEnabled)}
            data-testid="toggle-audio-btn"
          >
            {audioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
          </Button>
          
          <Button
            variant="ghost"
            size="lg"
            className={`rounded-full w-14 h-14 ${videoEnabled ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-red-500 text-white hover:bg-red-600'}`}
            onClick={() => setVideoEnabled(!videoEnabled)}
            data-testid="toggle-video-btn"
          >
            {videoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
          </Button>
          
          <Button
            variant="destructive"
            size="lg"
            className="rounded-full w-14 h-14 bg-red-500 hover:bg-red-600"
            onClick={handleEndCall}
            data-testid="end-call-btn"
          >
            <Phone className="h-6 w-6 rotate-[135deg]" />
          </Button>
          
          <Button
            variant="ghost"
            size="lg"
            className={`rounded-full w-14 h-14 ${chatOpen ? 'bg-teal-700 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
            onClick={() => setChatOpen(!chatOpen)}
            data-testid="toggle-chat-btn"
          >
            <MessageSquare className="h-6 w-6" />
          </Button>
        </div>
        
        {/* Notice */}
        <p className="text-center text-slate-500 text-xs mt-4">
          This is a placeholder video call interface. Real video functionality would require WebRTC integration.
        </p>
      </footer>
    </div>
  );
}
