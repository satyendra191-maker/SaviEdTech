'use client';

import { useState } from 'react';
import {
    Settings,
    Bell,
    Shield,
    CreditCard,
    Mail,
    Save,
} from 'lucide-react';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('general');

    const tabs = [
        { id: 'general', label: 'General', icon: Settings },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'payments', label: 'Payments', icon: CreditCard },
        { id: 'email', label: 'Email', icon: Mail },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
                <p className="text-slate-600 mt-1">Manage platform configuration</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                <div className="lg:w-64 space-y-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id
                                    ? 'bg-primary-50 text-primary-700'
                                    : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <tab.icon className="w-5 h-5" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold text-slate-900">General Settings</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Platform Name</label>
                                    <input type="text" defaultValue="SaviEduTech" className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Contact Email</label>
                                    <input type="email" defaultValue="support@saviedutech.com" className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold text-slate-900">Notification Settings</h2>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                                    <div>
                                        <p className="font-medium text-slate-900">Email Notifications</p>
                                        <p className="text-sm text-slate-500">Send email notifications for important events</p>
                                    </div>
                                    <input type="checkbox" defaultChecked className="w-5 h-5 text-primary-600" />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold text-slate-900">Security Settings</h2>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                                    <div>
                                        <p className="font-medium text-slate-900">Two-Factor Authentication</p>
                                        <p className="text-sm text-slate-500">Require 2FA for admin accounts</p>
                                    </div>
                                    <input type="checkbox" className="w-5 h-5 text-primary-600" />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'payments' && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold text-slate-900">Payment Settings</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                                    <select className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                                        <option value="INR">Indian Rupee</option>
                                        <option value="USD">US Dollar</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'email' && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold text-slate-900">Email Configuration</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Host</label>
                                    <input type="text" placeholder="smtp.example.com" className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-6 pt-6 border-t border-slate-200 flex justify-end">
                        <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                            <Save className="w-4 h-4" />
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
