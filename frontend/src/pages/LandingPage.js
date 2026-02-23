import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Stethoscope, Calendar, Shield, Clock, Video, FileText, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const { login, isAuthenticated } = useAuth();

  const features = [
    {
      icon: Calendar,
      title: 'Easy Scheduling',
      description: 'Book appointments with your preferred doctor in just a few clicks.'
    },
    {
      icon: Video,
      title: 'Video Consultations',
      description: 'Connect with doctors remotely through secure video calls.'
    },
    {
      icon: FileText,
      title: 'Digital Records',
      description: 'Access your complete medical history anytime, anywhere.'
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your health data is protected with enterprise-grade security.'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-700 flex items-center justify-center">
              <Stethoscope className="h-6 w-6 text-white" />
            </div>
            <span className="font-bold text-xl text-slate-900">Vedanth Clinic</span>
          </div>
          <Button 
            onClick={login} 
            className="bg-teal-700 hover:bg-teal-800"
            data-testid="login-btn"
          >
            Sign In with Google
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-sm font-medium mb-6">
              <Clock className="h-4 w-4" />
              Now accepting new patients
            </span>
            <h1 className="text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-tight mb-6">
              Your Health,
              <br />
              <span className="text-teal-700">Our Priority</span>
            </h1>
            <p className="text-lg text-slate-600 mb-8 max-w-lg">
              Experience world-class healthcare at Vedanth Clinic. Book appointments, 
              consult with specialists, and manage your health records all in one place.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button 
                size="lg" 
                onClick={login}
                className="bg-teal-700 hover:bg-teal-800 gap-2"
                data-testid="get-started-btn"
              >
                Get Started
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="border-slate-300"
              >
                Learn More
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="https://images.pexels.com/photos/7108324/pexels-photo-7108324.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                alt="Modern clinic interior"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Floating stats card */}
            <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-lg p-6 border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center">
                  <Stethoscope className="h-6 w-6 text-teal-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 tabular-nums">10,000+</p>
                  <p className="text-sm text-slate-500">Happy Patients</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Everything You Need
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Modern healthcare management tools designed for patients and providers alike.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 rounded-lg bg-teal-50 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-teal-700" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Ready to Take Control of Your Health?
          </h2>
          <p className="text-slate-600 mb-8">
            Join thousands of patients who trust Vedanth Clinic for their healthcare needs.
          </p>
          <Button 
            size="lg" 
            onClick={login}
            className="bg-teal-700 hover:bg-teal-800"
            data-testid="cta-signup-btn"
          >
            Sign Up Now - It's Free
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-teal-700" />
            <span className="font-semibold text-slate-900">Vedanth Clinic</span>
          </div>
          <p className="text-sm text-slate-500">
            © 2024 Vedanth Clinic. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
