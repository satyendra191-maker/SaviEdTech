import { PlayCircle, BookOpen, Clock, Filter } from 'lucide-react';

const subjects = ['All', 'Physics', 'Chemistry', 'Mathematics', 'Biology'];

const lectures = [
    {
        id: 1,
        title: "Newton's Laws of Motion",
        subject: "Physics",
        faculty: "Dharmendra Sir",
        duration: "45 min",
        thumbnail: "bg-blue-100",
        progress: 65,
    },
    {
        id: 2,
        title: "Organic Chemistry Basics",
        subject: "Chemistry",
        faculty: "Harendra Sir",
        duration: "38 min",
        thumbnail: "bg-emerald-100",
        progress: 42,
    },
    {
        id: 3,
        title: "Integration Techniques",
        subject: "Mathematics",
        faculty: "Ravindra Sir",
        duration: "52 min",
        thumbnail: "bg-amber-100",
        progress: 0,
    },
    {
        id: 4,
        title: "Cell Biology Fundamentals",
        subject: "Biology",
        faculty: "Arvind Sir",
        duration: "41 min",
        thumbnail: "bg-red-100",
        progress: 0,
    },
];

export default function LecturesPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Video Lectures</h1>
                    <p className="text-slate-500">Learn from India's best faculty</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50">
                    <Filter className="w-4 h-4" />
                    Filter
                </button>
            </div>

            {/* Subject Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {subjects.map((subject) => (
                    <button
                        key={subject}
                        className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${subject === 'All'
                                ? 'bg-primary-600 text-white'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                    >
                        {subject}
                    </button>
                ))}
            </div>

            {/* Lectures Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {lectures.map((lecture) => (
                    <div
                        key={lecture.id}
                        className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-lg transition-all cursor-pointer group"
                    >
                        {/* Thumbnail */}
                        <div className={`h-40 ${lecture.thumbnail} flex items-center justify-center relative`}>
                            <PlayCircle className="w-16 h-16 text-slate-400 group-hover:text-primary-600 transition-colors" />
                            {lecture.progress > 0 && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-200">
                                    <div
                                        className="h-full bg-primary-600"
                                        style={{ width: `${lecture.progress}%` }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="p-4">
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${lecture.subject === 'Physics' ? 'bg-blue-100 text-blue-700' :
                                    lecture.subject === 'Chemistry' ? 'bg-emerald-100 text-emerald-700' :
                                        lecture.subject === 'Mathematics' ? 'bg-amber-100 text-amber-700' :
                                            'bg-red-100 text-red-700'
                                }`}>
                                {lecture.subject}
                            </span>
                            <h3 className="font-semibold text-slate-900 mt-2 line-clamp-2">{lecture.title}</h3>
                            <div className="flex items-center justify-between mt-3 text-sm text-slate-500">
                                <span>{lecture.faculty}</span>
                                <span className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {lecture.duration}
                                </span>
                            </div>
                            {lecture.progress > 0 && (
                                <p className="text-xs text-primary-600 mt-2">{lecture.progress}% completed</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}