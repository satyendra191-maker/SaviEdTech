'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Video, 
  Calendar, 
  Clock, 
  Users, 
  PlayCircle, 
  ChevronRight,
  Search,
  Filter,
  Bell,
  BellOff,
  GraduationCap
} from 'lucide-react';

interface LiveClass {
  id: string;
  title: string;
  description: string;
  instructor: {
    name: string;
    avatar: string;
  };
  subject: string;
  examTarget: string;
  startTime: string;
  duration: number;
  status: 'scheduled' | 'live' | 'ended';
  registered: boolean;
  attendees: number;
  maxAttendees: number;
  thumbnail?: string;
}

const mockLiveClasses: LiveClass[] = [
  {
    id: '1',
    title: 'Physics: Laws of Motion - Complete Mastery',
    description: 'Deep dive into Newton\'s laws with problem-solving techniques',
    instructor: { name: 'Ravindra Sir', avatar: '' },
    subject: 'Physics',
    examTarget: 'JEE/NEET',
    startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    duration: 90,
    status: 'scheduled',
    registered: true,
    attendees: 145,
    maxAttendees: 500
  },
  {
    id: '2',
    title: 'Chemistry: Organic Chemistry Fundamentals',
    description: 'Understanding carbon compounds and reactions',
    instructor: { name: 'Harendra Sir', avatar: '' },
    subject: 'Chemistry',
    examTarget: 'JEE/NEET',
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    duration: 120,
    status: 'scheduled',
    registered: false,
    attendees: 89,
    maxAttendees: 500
  },
  {
    id: '3',
    title: 'Mathematics: Calculus - Advanced Problems',
    description: 'Application of derivatives and integrals',
    instructor: { name: 'Dharmendra Sir', avatar: '' },
    subject: 'Mathematics',
    examTarget: 'JEE Advanced',
    startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    duration: 90,
    status: 'ended',
    registered: true,
    attendees: 312,
    maxAttendees: 500
  },
  {
    id: '4',
    title: 'Biology: Cell Structure and Functions',
    description: 'Complete coverage of cell biology for NEET',
    instructor: { name: 'Arvind Sir', avatar: '' },
    subject: 'Biology',
    examTarget: 'NEET',
    startTime: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
    duration: 60,
    status: 'live',
    registered: true,
    attendees: 456,
    maxAttendees: 500
  }
];

export default function LiveClassesPage() {
  const [classes, setClasses] = useState<LiveClass[]>(mockLiveClasses);
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'live' | 'ended'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [notifications, setNotifications] = useState(true);

  const filteredClasses = classes.filter(cls => {
    if (filter !== 'all' && cls.status !== filter) return false;
    if (searchTerm && !cls.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const upcomingClasses = classes.filter(c => c.status === 'scheduled' || c.status === 'live');
  const liveNow = classes.filter(c => c.status === 'live');

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getTimeUntil = (dateString: string) => {
    const diff = new Date(dateString).getTime() - Date.now();
    if (diff < 0) return 'Started';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `in ${days} day${days > 1 ? 's' : ''}`;
    }
    if (hours > 0) return `in ${hours}h ${minutes}m`;
    return `in ${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Live Classes</h1>
          <p className="text-blue-100">Join interactive sessions with expert instructors</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {liveNow.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <h2 className="text-lg font-semibold text-red-700">Live Now</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {liveNow.map(cls => (
                <Link 
                  key={cls.id}
                  href={`/dashboard/live-class/${cls.id}`}
                  className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center">
                    <PlayCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{cls.title}</h3>
                    <p className="text-sm text-gray-500">{cls.instructor.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500">{cls.attendees} watching</span>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                    Join Now
                  </button>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search classes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-lg w-64"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">All Classes</option>
              <option value="scheduled">Upcoming</option>
              <option value="live">Live Now</option>
              <option value="ended">Past Classes</option>
            </select>
          </div>
          <button
            onClick={() => setNotifications(!notifications)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${notifications ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
          >
            {notifications ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            {notifications ? 'Notifications On' : 'Notifications Off'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.map(cls => (
            <div 
              key={cls.id} 
              className={`bg-white rounded-xl shadow-sm border overflow-hidden ${
                cls.status === 'live' ? 'border-red-300' : 'border-gray-200'
              }`}
            >
              <div className="h-32 bg-gradient-to-br from-blue-500 to-purple-500 relative">
                {cls.thumbnail ? (
                  <img src={cls.thumbnail} alt={cls.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Video className="w-12 h-12 text-white/50" />
                  </div>
                )}
                {cls.status === 'live' && (
                  <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 bg-red-600 text-white text-xs rounded">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    LIVE
                  </div>
                )}
                {cls.status === 'scheduled' && (
                  <div className="absolute top-3 left-3 px-2 py-1 bg-black/50 text-white text-xs rounded">
                    {getTimeUntil(cls.startTime)}
                  </div>
                )}
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-black/50 text-white text-xs rounded">
                  <Clock className="w-3 h-3" />
                  {cls.duration} min
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded">
                    {cls.subject}
                  </span>
                  <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-600 rounded">
                    {cls.examTarget}
                  </span>
                </div>

                <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{cls.title}</h3>
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{cls.description}</p>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium">{cls.instructor.name[0]}</span>
                    </div>
                    <span className="text-sm text-gray-600">{cls.instructor.name}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Users className="w-4 h-4" />
                    {cls.attendees}/{cls.maxAttendees}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    {formatTime(cls.startTime)}
                  </div>
                  {cls.status === 'ended' ? (
                    <Link 
                      href={`/dashboard/live-class/${cls.id}/recording`}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <PlayCircle className="w-4 h-4" />
                      Watch Recording
                    </Link>
                  ) : cls.registered ? (
                    <span className="text-sm text-green-600 font-medium">Registered</span>
                  ) : (
                    <button className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
                      Register
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredClasses.length === 0 && (
          <div className="text-center py-12">
            <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No classes found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Want to host a live class?</h3>
              <p className="text-gray-500 text-sm mb-3">
                Instructors can schedule and host interactive live sessions with students
              </p>
              <Link 
                href="/admin/live-classes/schedule"
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                Schedule a class →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
