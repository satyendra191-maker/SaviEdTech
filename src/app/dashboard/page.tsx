import {
    Flame,
    Trophy,
    Target,
    Clock,
    TrendingUp,
    Calendar,
    BookOpen,
    ChevronRight,
    Play,
    Award
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
    return (
        <div className="space-y-6">
            {/* Welcome Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Welcome back, Student!</h1>
                    <p className="text-slate-500">Here's your learning progress today</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl">
                    <Flame className="w-5 h-5" />
                    <span className="font-semibold">12 Day Streak</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={Target}
                    label="Predicted Rank"
                    value="AIR 1,250"
                    trend="Top 0.1%"
                    color="blue"
                />
                <StatCard
                    icon={TrendingUp}
                    label="Accuracy"
                    value="78.5%"
                    trend="+2.3%"
                    color="green"
                />
                <StatCard
                    icon={Clock}
                    label="Study Time"
                    value="4h 32m"
                    trend="Today"
                    color="purple"
                />
                <StatCard
                    icon={Trophy}
                    label="Tests Taken"
                    value="24"
                    trend="This month"
                    color="amber"
                />
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Continue Learning */}
                <div className="lg:col-span-2 space-y-6">
                    <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-900">Continue Learning</h2>
                            <Link href="/dashboard/lectures" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                                View All <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>

                        <div className="space-y-4">
                            <ContinueLearningCard
                                title="Newton's Laws of Motion"
                                subject="Physics"
                                faculty="Dharmendra Sir"
                                progress={65}
                                thumbnail="/lectures/physics-1.jpg"
                                lastWatched="2 hours ago"
                            />
                            <ContinueLearningCard
                                title="Organic Chemistry Basics"
                                subject="Chemistry"
                                faculty="Harendra Sir"
                                progress={42}
                                thumbnail="/lectures/chemistry-1.jpg"
                                lastWatched="Yesterday"
                            />
                        </div>
                    </section>

                    {/* Today's DPP */}
                    <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-primary-600" />
                                <h2 className="text-lg font-semibold text-slate-900">Today's DPP</h2>
                            </div>
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                                Available Now
                            </span>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                            <div>
                                <h3 className="font-semibold text-slate-900">Physics - Mechanics</h3>
                                <p className="text-sm text-slate-500">15 Questions • 30 Minutes</p>
                            </div>
                            <Link
                                href="/dashboard/dpp"
                                className="px-6 py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors"
                            >
                                Start Now
                            </Link>
                        </div>
                    </section>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Daily Challenge */}
                    <section className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-6 text-white">
                        <div className="flex items-center gap-2 mb-4">
                            <Trophy className="w-5 h-5" />
                            <h2 className="text-lg font-semibold">Daily Challenge</h2>
                        </div>
                        <p className="text-white/90 mb-4">
                            Test your skills with today's question and compete with students nationwide!
                        </p>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm text-white/80">1,234 students attempted</span>
                        </div>
                        <Link
                            href="/dashboard/challenge"
                            className="block w-full py-3 bg-white text-orange-600 font-semibold rounded-xl text-center hover:bg-white/90 transition-colors"
                        >
                            Attempt Now
                        </Link>
                    </section>

                    {/* Upcoming Tests */}
                    <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 mb-4">
                            <BookOpen className="w-5 h-5 text-primary-600" />
                            <h2 className="text-lg font-semibold text-slate-900">Upcoming Tests</h2>
                        </div>

                        <div className="space-y-3">
                            <UpcomingTestCard
                                title="JEE Main Mock Test"
                                date="Tomorrow, 10:00 AM"
                                duration="3 Hours"
                                questions="90"
                            />
                            <UpcomingTestCard
                                title="Physics Chapter Test"
                                date="Dec 8, 2:00 PM"
                                duration="1 Hour"
                                questions="30"
                            />
                        </div>
                    </section>

                    {/* Achievements */}
                    <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 mb-4">
                            <Award className="w-5 h-5 text-primary-600" />
                            <h2 className="text-lg font-semibold text-slate-900">Recent Achievements</h2>
                        </div>

                        <div className="flex gap-3">
                            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                                <Flame className="w-6 h-6 text-amber-600" />
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                                <Trophy className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                                <Target className="w-6 h-6 text-green-600" />
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-purple-600" />
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

function StatCard({
    icon: Icon,
    label,
    value,
    trend,
    color
}: {
    icon: typeof Flame;
    label: string;
    value: string;
    trend: string;
    color: 'blue' | 'green' | 'purple' | 'amber';
}) {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        purple: 'bg-purple-50 text-purple-600',
        amber: 'bg-amber-50 text-amber-600',
    };

    return (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className={`w-10 h-10 rounded-xl ${colorClasses[color]} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{value}</div>
            <div className="text-sm text-slate-500">{label}</div>
            <div className="text-xs text-green-600 font-medium mt-1">{trend}</div>
        </div>
    );
}

function ContinueLearningCard({
    title,
    subject,
    faculty,
    progress,
    thumbnail,
    lastWatched,
}: {
    title: string;
    subject: string;
    faculty: string;
    progress: number;
    thumbnail: string;
    lastWatched: string;
}) {
    const subjectColors: Record<string, string> = {
        Physics: 'bg-blue-100 text-blue-700',
        Chemistry: 'bg-emerald-100 text-emerald-700',
        Mathematics: 'bg-amber-100 text-amber-700',
        Biology: 'bg-red-100 text-red-700',
    };

    return (
        <div className="flex gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer group">
            <div className="w-24 h-16 bg-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
                <Play className="w-8 h-8 text-slate-400 group-hover:text-primary-600 transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${subjectColors[subject] || 'bg-gray-100 text-gray-700'}`}>
                        {subject}
                    </span>
                    <span className="text-xs text-slate-500">{lastWatched}</span>
                </div>
                <h3 className="font-medium text-slate-900 truncate">{title}</h3>
                <p className="text-sm text-slate-500">{faculty}</p>
                <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary-600 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-xs text-slate-500">{progress}%</span>
                </div>
            </div>
        </div>
    );
}

function UpcomingTestCard({
    title,
    date,
    duration,
    questions,
}: {
    title: string;
    date: string;
    duration: string;
    questions: string;
}) {
    return (
        <div className="p-3 border border-slate-100 rounded-xl hover:border-primary-200 transition-colors">
            <h3 className="font-medium text-slate-900 text-sm">{title}</h3>
            <p className="text-xs text-slate-500 mt-1">{date}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                <span>{duration}</span>
                <span>•</span>
                <span>{questions} Questions</span>
            </div>
        </div>
    );
}