import Link from 'next/link';

export default function AuthCodeErrorPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-rose-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
                <h1 className="text-2xl font-bold text-slate-900 mb-3">Google Sign-In Failed</h1>
                <p className="text-slate-600 mb-6">
                    We could not complete authentication. Please try again.
                </p>
                <p className="text-sm text-slate-500 mb-6">
                    If this keeps happening, verify Supabase redirect URLs include:
                    <br />
                    <span className="font-mono">/auth/callback</span> and <span className="font-mono">/api/auth/callback</span>
                </p>
                <div className="space-y-3">
                    <Link
                        href="/login"
                        className="block w-full py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors"
                    >
                        Back to Login
                    </Link>
                    <Link
                        href="/register"
                        className="block w-full py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
                    >
                        Go to Register
                    </Link>
                </div>
            </div>
        </div>
    );
}
