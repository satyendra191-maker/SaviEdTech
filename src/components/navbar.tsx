'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, X, Heart, ChevronDown, LogOut, LayoutDashboard, Settings, GraduationCap, BookOpen, Users, Briefcase, Home, ClipboardList, Info, Phone, MonitorPlay } from 'lucide-react';
import { BrandLogo } from './brand-logo';
import { useAuth } from '@/hooks/useAuth';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [coursesOpen, setCoursesOpen] = useState(false);
  const [facultyOpen, setFacultyOpen] = useState(false);
  const [careerOpen, setCareerOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  let user: any = null;
  let role: any = null;
  let isAuthenticated = false;
  let signOut: any = () => { };

  try {
    const auth = useAuth();
    user = auth.user;
    role = auth.role;
    isAuthenticated = auth.isAuthenticated;
    signOut = auth.signOut;
  } catch (error) {
    // Auth not available, continue with null user
  }

  useEffect(() => {
    // Mounted state handled for SSR compatibility
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = isOpen ? 'hidden' : previousOverflow;

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const isDashboardRoute = pathname?.startsWith('/dashboard') ||
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/super-admin') ||
    pathname?.startsWith('/faculty-dashboard') ||
    pathname?.startsWith('/auth/callback');

  // Skip on dashboard routes but render on all other pages including home
  if (isDashboardRoute) return null;

  const courses = [
    { name: 'JEE Main', href: '/jee', description: 'Comprehensive prep for JEE Main' },
    { name: 'JEE Advanced', href: '/jee', description: 'Advanced strategies for IIT-JEE' },
    { name: 'NEET', href: '/neet', description: 'Excel in Medical entrance exams' },
    { name: 'Foundation', href: '/materials', description: 'Build strong basics (9th-10th)' },
    { name: 'CBSE Boards', href: '/materials', description: 'Score high in 12th Boards' },
    { name: 'Daily Challenge', href: '/challenge', description: 'Test your skills daily' },
  ];

  const careerOptions = [
    {
      name: 'Content Editor',
      href: '/careers',
      eligibility: 'Graduate in relevant field, 2+ years exp',
      icon: <BookOpen className="w-4 h-4" />
    },
    {
      name: 'Content Creator',
      href: '/careers',
      eligibility: 'Creative writer, video editing skills',
      icon: <BookOpen className="w-4 h-4" />
    },
    {
      name: 'Faculty - Physics',
      href: '/careers',
      eligibility: 'M.Sc Physics, 5+ years teaching exp',
      icon: <GraduationCap className="w-4 h-4" />
    },
    {
      name: 'Faculty - Chemistry',
      href: '/careers',
      eligibility: 'M.Sc Chemistry, 5+ years teaching exp',
      icon: <GraduationCap className="w-4 h-4" />
    },
    {
      name: 'Faculty - Mathematics',
      href: '/careers',
      eligibility: 'M.Sc Mathematics, 5+ years teaching exp',
      icon: <GraduationCap className="w-4 h-4" />
    },
    {
      name: 'Faculty - Biology',
      href: '/careers',
      eligibility: 'M.Sc Zoology/Botany, 5+ years teaching exp',
      icon: <GraduationCap className="w-4 h-4" />
    },
  ];

  const handleLogout = async () => {
    await signOut();
    router.push('/');
    setUserDropdownOpen(false);
  };

  const getDashboardLink = () => {
    switch (role) {
      case 'super_admin':
      case 'admin':
        return '/super-admin';
      case 'content_manager':
        return '/admin/courses';
      case 'finance_manager':
        return '/admin/finance';
      case 'parent':
        return '/dashboard/parent';
      default:
        return '/dashboard';
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-gradient-to-r from-rose-100 via-emerald-100 to-cyan-100 backdrop-blur-md border-b border-white/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <BrandLogo
              size="sm"
              showText={true}
              showTagline={true}
              taglineTone="dark"
              wordmarkTone="dark"
              iconClassName="scale-[1.12]"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden xl:flex items-center gap-1">
            {/* Home Button */}
            <Link
              href="/"
              className="flex items-center gap-1 px-4 py-2 text-sm font-semibold text-slate-700 hover:text-primary-600 rounded-lg hover:bg-white/50 transition-all"
            >
              Home
            </Link>

            {/* Practice Link */}
            <Link
              href="/dashboard/practice"
              className="flex items-center gap-1 px-4 py-2 text-sm font-semibold text-slate-700 hover:text-primary-600 rounded-lg hover:bg-white/50 transition-all"
            >
              Practice
            </Link>

            {/* Tests Link */}
            <Link
              href="/dashboard/tests"
              className="flex items-center gap-1 px-4 py-2 text-sm font-semibold text-slate-700 hover:text-primary-600 rounded-lg hover:bg-white/50 transition-all"
            >
              Tests
            </Link>

            <Link
              href="/online-exam"
              className="flex items-center gap-1 px-4 py-2 text-sm font-semibold text-slate-700 hover:text-primary-600 rounded-lg hover:bg-white/50 transition-all"
            >
              Online Exam
            </Link>

            {/* Faculty Dropdown */}
            <div
              className="relative group"
              onMouseEnter={() => setFacultyOpen(true)}
              onMouseLeave={() => setFacultyOpen(false)}
            >
              <button
                className="flex items-center gap-1 px-4 py-2 text-sm font-semibold text-slate-700 hover:text-primary-600 rounded-lg hover:bg-white/50 transition-all"
                aria-expanded={facultyOpen}
              >
                <span>Faculty</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${facultyOpen ? 'rotate-180' : ''}`} />
              </button>

              <div
                className={`absolute top-full -right-20 w-64 bg-white shadow-xl rounded-xl border border-slate-200 p-2 transition-all duration-150 z-50 ${facultyOpen ? 'opacity-100 visible translate-y-1' : 'opacity-0 invisible translate-y-2'}`}
              >
                <div className="grid gap-1">
                  {[
                    { name: 'Dharmendra Sir', credentials: 'Physics Expert, 15+ Yrs Exp', href: '/faculty/dharmendra-sir' },
                    { name: 'Harendra Sir', credentials: 'Chemistry Expert, 12+ Yrs Exp', href: '/faculty/harendra-sir' },
                    { name: 'Ravindra Sir', credentials: 'Mathematics Expert, 18+ Yrs Exp', href: '/faculty/ravindra-sir' },
                    { name: 'Arvind Sir', credentials: 'Biology Expert, 14+ Yrs Exp', href: '/faculty/arvind-sir' }
                  ].map((faculty) => (
                    <Link
                      key={faculty.name}
                      href={faculty.href}
                      className="group/item flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 transition-all"
                      onClick={() => setFacultyOpen(false)}
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center group-hover/item:bg-emerald-100 transition-colors">
                        <Users className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 line-clamp-1">{faculty.name}</div>
                        <div className="text-[10px] text-slate-500 line-clamp-1">{faculty.credentials}</div>
                      </div>
                    </Link>
                  ))}
                  <div className="h-px bg-slate-100 my-1" />
                  <Link
                    href="/faculty"
                    className="text-center text-xs font-bold text-primary-600 hover:text-primary-700 py-1.5"
                    onClick={() => setFacultyOpen(false)}
                  >
                    View All Faculty
                  </Link>
                </div>
              </div>
            </div>

            {/* Courses Dropdown */}
            <div
              className="relative group"
              onMouseEnter={() => setCoursesOpen(true)}
              onMouseLeave={() => setCoursesOpen(false)}
            >
              <button
                className="flex items-center gap-1 px-4 py-2 text-sm font-semibold text-slate-700 hover:text-primary-600 rounded-lg hover:bg-white/50 transition-all"
                aria-expanded={coursesOpen}
              >
                <span>Courses</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${coursesOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Courses Mega Menu */}
              <div
                className={`absolute top-full -left-20 w-64 bg-white shadow-xl rounded-xl border border-slate-200 p-2 transition-all duration-150 z-50 ${coursesOpen ? 'opacity-100 visible translate-y-1' : 'opacity-0 invisible translate-y-2'}`}
              >
                <div className="grid gap-1">
                  {courses.map((course) => (
                    <Link
                      key={course.name}
                      href={course.href}
                      className="group/item flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 transition-all"
                      onClick={() => setCoursesOpen(false)}
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center group-hover/item:bg-primary-100 transition-colors">
                        <GraduationCap className="w-4 h-4 text-primary-600" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{course.name}</div>
                        <div className="text-[10px] text-slate-500">{course.description}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Career Dropdown */}
            <div
              className="relative group"
              onMouseEnter={() => setCareerOpen(true)}
              onMouseLeave={() => setCareerOpen(false)}
            >
              <button
                className="flex items-center gap-1 px-4 py-2 text-sm font-semibold text-slate-700 hover:text-primary-600 rounded-lg hover:bg-white/50 transition-all"
                aria-expanded={careerOpen}
              >
                <span>Career</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${careerOpen ? 'rotate-180' : ''}`} />
              </button>

              <div
                className={`absolute top-full -right-20 w-64 bg-white shadow-xl rounded-xl border border-slate-200 p-2 transition-all duration-150 z-50 ${careerOpen ? 'opacity-100 visible translate-y-1' : 'opacity-0 invisible translate-y-2'}`}
              >
                <div className="grid gap-1">
                  {careerOptions.map((career) => (
                    <Link
                      key={career.name}
                      href={career.href}
                      className="group/item flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 transition-all"
                      onClick={() => setCareerOpen(false)}
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center group-hover/item:bg-amber-100 transition-colors">
                        {career.icon}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{career.name}</div>
                        <div className="text-[10px] text-slate-500">{career.eligibility}</div>
                      </div>
                    </Link>
                  ))}
                  <div className="h-px bg-slate-100 my-1" />
                  <Link
                    href="/careers"
                    className="text-center text-xs font-bold text-primary-600 hover:text-primary-700 py-1.5"
                    onClick={() => setCareerOpen(false)}
                  >
                    View All Openings
                  </Link>
                </div>
              </div>
            </div>

            <Link
              href="/contact"
              className="flex items-center gap-1 px-4 py-2 text-sm font-semibold text-slate-700 hover:text-primary-600 rounded-lg hover:bg-white/50 transition-all"
            >
              Contact
            </Link>

            <Link
              href="/about"
              className="flex items-center gap-1 px-4 py-2 text-sm font-semibold text-slate-700 hover:text-primary-600 rounded-lg hover:bg-white/50 transition-all"
            >
              About
            </Link>
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              href="/donate"
              className="flex items-center gap-1 px-4 py-2 text-sm font-semibold text-slate-700 hover:text-primary-600 rounded-lg hover:bg-white/50 transition-all"
            >
              <Heart className="w-3.5 h-3.5" />
              <span>Donate</span>
            </Link>

            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 pl-3 bg-slate-50 rounded-full border border-slate-200 hover:border-primary-300 transition-all"
                >
                  <div className="text-right hidden lg:block">
                    <p className="text-xs font-bold text-slate-900 leading-none">{user?.full_name}</p>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">{role}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-sm">
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                </button>

                {userDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-white shadow-2xl rounded-2xl border border-slate-100 p-2 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
                    <Link
                      href={getDashboardLink()}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-slate-700 font-semibold text-sm"
                      onClick={() => setUserDropdownOpen(false)}
                    >
                      <LayoutDashboard className="w-4 h-4 text-primary-600" />
                      Dashboard
                    </Link>
                    <Link
                      href="/dashboard/settings"
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-slate-700 font-semibold text-sm"
                      onClick={() => setUserDropdownOpen(false)}
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      Settings
                    </Link>
                    <div className="h-px bg-slate-100 my-1 mx-2" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-rose-50 transition-colors text-rose-600 font-semibold text-sm"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Link
                  href="/login"
                  className="flex items-center gap-1 px-4 py-2 text-sm font-semibold text-slate-700 hover:text-primary-600 rounded-lg hover:bg-white/50 transition-all"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="flex items-center gap-1 px-4 py-2 text-sm font-semibold text-slate-700 hover:text-primary-600 rounded-lg hover:bg-white/50 transition-all"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="xl:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors"
            aria-expanded={isOpen}
            aria-label={isOpen ? 'Close mobile menu' : 'Open mobile menu'}
          >
            {isOpen ? <X className="w-6 h-6 text-slate-900" /> : <Menu className="w-6 h-6 text-slate-900" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="xl:hidden max-h-[calc(100vh-5rem)] overflow-y-auto border-t border-slate-200 bg-white/95 py-6 backdrop-blur-md">
            <div className="flex flex-col gap-1">
              <Link href="/" className="px-4 py-4 rounded-xl text-slate-700 font-bold hover:bg-gradient-to-r hover:from-rose-100 hover:to-emerald-100 flex items-center gap-3 min-h-[52px]" onClick={() => setIsOpen(false)}>
                <Home className="h-5 w-5 text-slate-500" /> Home
              </Link>

              {/* Mobile Courses Section */}
              <div className="px-4 py-3 border-y border-slate-100 my-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Courses</p>
                <div className="grid grid-cols-2 gap-2">
                  {courses.map(course => (
                    <Link key={course.name} href={course.href} className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl text-xs font-bold text-slate-700 hover:from-blue-100 hover:to-indigo-100 min-h-[52px] flex items-center justify-center text-center" onClick={() => setIsOpen(false)}>
                      {course.name}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Mobile Nav Links */}
              {[
                { name: 'Practice', href: '/dashboard/practice', icon: BookOpen },
                { name: 'Tests', href: '/dashboard/tests', icon: ClipboardList },
                { name: 'Online Exam', href: '/online-exam', icon: MonitorPlay },
                { name: 'Faculty', href: '/faculty', icon: Users },
                { name: 'Career', href: '/careers', icon: Briefcase },
                { name: 'About', href: '/about', icon: Info },
                { name: 'Contact', href: '/contact', icon: Phone },
                { name: 'Donate', href: '/donate', icon: Heart },
              ].map((link) => (
                <Link key={link.name} href={link.href} className="px-4 py-4 rounded-xl text-slate-700 font-bold hover:bg-gradient-to-r hover:from-rose-100 hover:to-emerald-100 flex items-center gap-3 min-h-[52px]" onClick={() => setIsOpen(false)}>
                  <link.icon className="h-5 w-5 text-slate-500" /> {link.name}
                </Link>
              ))}

              <div className="h-px bg-slate-200 my-3" />

              {isAuthenticated ? (
                <div className="flex flex-col gap-2 p-2 bg-gradient-to-br from-rose-50 to-orange-50 rounded-2xl">
                  <Link href={getDashboardLink()} className="px-4 py-4 rounded-xl text-slate-700 font-bold hover:bg-white min-h-[52px] flex items-center gap-3" onClick={() => setIsOpen(false)}>
                    <LayoutDashboard className="h-5 w-5 text-primary-600" />
                    Go to Dashboard
                  </Link>
                  <button onClick={handleLogout} className="px-4 py-4 rounded-xl text-rose-600 font-bold hover:bg-rose-100 text-left min-h-[52px] flex items-center gap-3">
                    <LogOut className="h-5 w-5" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="grid gap-3 pt-2">
                  <Link href="/login" className="px-4 py-4 rounded-xl text-slate-700 font-bold text-center border-2 border-slate-200 hover:border-primary-400 min-h-[52px] flex items-center justify-center" onClick={() => setIsOpen(false)}>Login</Link>
                  <Link href="/register" className="px-4 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold text-center shadow-lg min-h-[52px] flex items-center justify-center" onClick={() => setIsOpen(false)}>Get Started</Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
