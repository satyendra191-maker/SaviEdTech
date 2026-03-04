import { User, Bell, Shield, HelpCircle, ChevronRight, LogOut } from 'lucide-react';

const menuItems = [
  { icon: User, label: 'Edit Profile', description: 'Update your personal information', href: '#' },
  { icon: Bell, label: 'Notifications', description: 'Manage notification preferences', href: '#' },
  { icon: Shield, label: 'Privacy & Security', description: 'Password and security settings', href: '#' },
  { icon: HelpCircle, label: 'Help & Support', description: 'FAQs and contact support', href: '#' },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500">Manage your account and preferences</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-2xl font-bold">
            S
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Student Name</h2>
            <p className="text-slate-500">student@example.com</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                JEE Aspirant
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                Class 12
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {menuItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <button
              key={i}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-slate-900">{item.label}</h3>
                  <p className="text-sm text-slate-500">{item.description}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          );
        })}
      </div>

      {/* App Info */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">About</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Version</span>
            <span className="text-slate-900">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Build</span>
            <span className="text-slate-900">2026.03.04</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Terms of Service</span>
            <a href="#" className="text-primary-600 hover:underline">View</a>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Privacy Policy</span>
            <a href="#" className="text-primary-600 hover:underline">View</a>
          </div>
        </div>
      </div>

      {/* Logout */}
      <button className="w-full flex items-center justify-center gap-2 p-4 bg-red-50 text-red-600 rounded-2xl font-medium hover:bg-red-100 transition-colors">
        <LogOut className="w-5 h-5" />
        Sign Out
      </button>
    </div>
  );
}