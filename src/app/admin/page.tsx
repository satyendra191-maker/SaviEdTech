import {
    Users,
    GraduationCap,
    FileText,
    Trophy,
    TrendingUp,
    Clock,
    DollarSign,
    Activity,
} from 'lucide-react';

export default function AdminDashboardPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
                <p className="text-slate-500">Overview of platform performance and metrics</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <AdminStatCard
                    icon={Users}
                    label="Total Students"
                    value="12,456"
                    change="+234 this week"
                    trend="up"
                    color="blue"
                />
                <AdminStatCard
                    icon={GraduationCap}
                    label="Active Users"
                    value="8,932"
                    change="+5.2%"
                    trend="up"
                    color="green"
                />
                <AdminStatCard
                    label="Total Leads"
                    value="3,847"
                    change="+89 this month"
                    trend="up"
                    color="purple"
                    icon={FileText}
                />
                <AdminStatCard
                    label="Revenue"
                    value="₹12.4L"
                    change="+12.3%"
                    trend="up"
                    color="amber"
                    icon={DollarSign}
                />
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* System Health */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-slate-900">System Health</h2>
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                            All Systems Operational
                        </span>
                    </div>

                    <div className="space-y-4">
                        <HealthStatusItem
                            name="Database"
                            status="healthy"
                            latency="24ms"
                            uptime="99.9%"
                        />
                        <HealthStatusItem
                            name="API Server"
                            status="healthy"
                            latency="45ms"
                            uptime="99.8%"
                        />
                        <HealthStatusItem
                            name="Storage"
                            status="healthy"
                            latency="120ms"
                            uptime="99.9%"
                        />
                        <HealthStatusItem
                            name="Edge Functions"
                            status="healthy"
                            latency="180ms"
                            uptime="99.5%"
                        />
                    </div>
                </div>

                {/* Daily Stats */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">Today's Activity</h2>
                        <div className="space-y-4">
                            <ActivityItem
                                icon={Users}
                                label="New Registrations"
                                value="48"
                                color="blue"
                            />
                            <ActivityItem
                                icon={Trophy}
                                label="Challenge Participants"
                                value="1,234"
                                color="orange"
                            />
                            <ActivityItem
                                icon={FileText}
                                label="DPP Attempts"
                                value="892"
                                color="green"
                            />
                            <ActivityItem
                                icon={Clock}
                                label="Tests Completed"
                                value="156"
                                color="purple"
                            />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-6 text-white">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-5 h-5" />
                            <h2 className="text-lg font-semibold">Growth Rate</h2>
                        </div>
                        <p className="text-4xl font-bold mb-1">23.5%</p>
                        <p className="text-white/80">Month over month</p>
                    </div>
                </div>
            </div>

            {/* Recent Leads Table */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-slate-900">Recent Leads</h2>
                    <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                        View All
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Name</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Phone</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Exam Target</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Status</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            <LeadRow
                                name="Rahul Sharma"
                                phone="+91 98765 43210"
                                exam="JEE"
                                status="new"
                                date="2 hours ago"
                            />
                            <LeadRow
                                name="Priya Patel"
                                phone="+91 87654 32109"
                                exam="NEET"
                                status="contacted"
                                date="4 hours ago"
                            />
                            <LeadRow
                                name="Amit Kumar"
                                phone="+91 76543 21098"
                                exam="JEE"
                                status="converted"
                                date="1 day ago"
                            />
                            <LeadRow
                                name="Sneha Gupta"
                                phone="+91 65432 10987"
                                exam="Both"
                                status="new"
                                date="1 day ago"
                            />
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function AdminStatCard({
    icon: Icon,
    label,
    value,
    change,
    trend,
    color,
}: {
    icon: React.ElementType;
    label: string;
    value: string;
    change: string;
    trend: 'up' | 'down';
    color: 'blue' | 'green' | 'purple' | 'amber' | 'red';
}) {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        purple: 'bg-purple-50 text-purple-600',
        amber: 'bg-amber-50 text-amber-600',
        red: 'bg-red-50 text-red-600',
    };

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${colorClasses[color]}`}>
                <Icon className="w-5 h-5" />
            </div>
            <p className="text-sm text-slate-500 mb-1">{label}</p>
            <p className="text-2xl font-bold text-slate-900 mb-1">{value}</p>
            <p className={`text-xs font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {change}
            </p>
        </div>
    );
}

function HealthStatusItem({
    name,
    status,
    latency,
    uptime,
}: {
    name: string;
    status: 'healthy' | 'degraded' | 'critical';
    latency: string;
    uptime: string;
}) {
    const statusColors = {
        healthy: 'bg-green-500',
        degraded: 'bg-yellow-500',
        critical: 'bg-red-500',
    };

    return (
        <div className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
            <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${statusColors[status]}`} />
                <span className="font-medium text-slate-900">{name}</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-500">
                <span>Latency: {latency}</span>
                <span>Uptime: {uptime}</span>
            </div>
        </div>
    );
}

function ActivityItem({
    icon: Icon,
    label,
    value,
    color,
}: {
    icon: React.ElementType;
    label: string;
    value: string;
    color: 'blue' | 'green' | 'purple' | 'orange';
}) {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        purple: 'bg-purple-50 text-purple-600',
        orange: 'bg-orange-50 text-orange-600',
    };

    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
                    <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm text-slate-600">{label}</span>
            </div>
            <span className="font-semibold text-slate-900">{value}</span>
        </div>
    );
}

function LeadRow({
    name,
    phone,
    exam,
    status,
    date,
}: {
    name: string;
    phone: string;
    exam: string;
    status: 'new' | 'contacted' | 'converted' | 'disqualified';
    date: string;
}) {
    const statusColors = {
        new: 'bg-blue-100 text-blue-700',
        contacted: 'bg-yellow-100 text-yellow-700',
        converted: 'bg-green-100 text-green-700',
        disqualified: 'bg-red-100 text-red-700',
    };

    return (
        <tr className="border-b border-slate-50 last:border-0">
            <td className="py-3 px-4">
                <p className="font-medium text-slate-900">{name}</p>
            </td>
            <td className="py-3 px-4 text-slate-600">{phone}</td>
            <td className="py-3 px-4">
                <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-full">
                    {exam}
                </span>
            </td>
            <td className="py-3 px-4">
                <span className={`px-2 py-1 text-xs rounded-full ${statusColors[status]}`}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
            </td>
            <td className="py-3 px-4 text-sm text-slate-500">{date}</td>
        </tr>
    );
}
