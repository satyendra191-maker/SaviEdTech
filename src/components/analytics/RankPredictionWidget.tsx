'use client';

import { useEffect, useState } from 'react';
import {
    TrendingUp,
    Target,
    RefreshCw,
    Loader2,
    AlertCircle,
    Award,
    Zap,
    Brain,
    BarChart3,
    Timer,
    BookOpen,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface RankPredictionData {
    predictedRank: number | null;
    percentile: number | null;
    examReadiness: string;
    readinessLevel: number;
    lastUpdated?: string | null;
    confidenceScore?: number | null;
    factors?: {
        accuracy: number;
        avgScore: number;
        testsTaken: number;
        questionsSolved: number;
        studyTime: number;
        topicMastery?: number;
        avgSolveTime?: number;
    } | null;
}

interface RankPredictionWidgetProps {
    compact?: boolean;
    showDetails?: boolean;
}

export function RankPredictionWidget({ compact = false, showDetails = false }: RankPredictionWidgetProps) {
    const { user, isLoading: authLoading } = useAuth();
    const [data, setData] = useState<RankPredictionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (authLoading) {
            return;
        }

        if (!user) {
            setLoading(false);
            setData(null);
            return;
        }

        void fetchRankPrediction();
    }, [user, authLoading]);

    const fetchRankPrediction = async () => {
        try {
            setError(null);
            const response = await fetch('/api/rank-prediction', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                cache: 'no-store',
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to load rank prediction');
            }

            setData({
                predictedRank: result.predictedRank ?? null,
                percentile: result.percentile ?? null,
                examReadiness: result.examReadiness ?? 'Early Stage',
                readinessLevel: result.readinessLevel ?? 1,
                lastUpdated: result.lastUpdated ?? null,
                confidenceScore: result.confidenceScore ?? null,
                factors: result.factors ?? null,
            });
        } catch (err) {
            console.error('Error fetching rank prediction:', err);
            setError(err instanceof Error ? err.message : 'Failed to load rank prediction');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        setError(null);

        try {
            const response = await fetch('/api/rank-prediction', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const result = await response.json().catch(() => ({}));

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to refresh rank prediction');
            }

            setData({
                predictedRank: result.predictedRank ?? null,
                percentile: result.percentile ?? null,
                examReadiness: result.examReadiness ?? 'Early Stage',
                readinessLevel: result.readinessLevel ?? 1,
                lastUpdated: result.lastUpdated ?? null,
                confidenceScore: result.confidenceScore ?? null,
                factors: result.factors ?? null,
            });
        } catch (err) {
            console.error('Error refreshing rank prediction:', err);
            setError(err instanceof Error ? err.message : 'Failed to refresh rank prediction');
        } finally {
            setRefreshing(false);
        }
    };

    if (loading || authLoading) {
        return (
            <div className={`bg-white rounded-2xl border border-slate-100 p-6 ${compact ? 'p-4' : ''}`}>
                <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
                    <span className="text-slate-500">Loading rank prediction...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`bg-red-50 rounded-2xl border border-red-100 p-6 ${compact ? 'p-4' : ''}`}>
                <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-600">{error}</span>
                </div>
            </div>
        );
    }

    const rankDisplay = data?.predictedRank ? `AIR ${data.predictedRank.toLocaleString()}` : 'N/A';
    const percentileDisplay = data?.percentile ? `${data.percentile}%` : 'N/A';

    const getReadinessColor = () => {
        switch (data?.examReadiness) {
            case 'Strong':
                return 'text-purple-700 bg-purple-50';
            case 'Advanced':
                return 'text-green-700 bg-green-50';
            case 'Building':
                return 'text-blue-700 bg-blue-50';
            case 'Foundation':
                return 'text-amber-700 bg-amber-50';
            default:
                return 'text-slate-700 bg-slate-50';
        }
    };

    const getReadinessIcon = () => {
        switch (data?.examReadiness) {
            case 'Strong':
                return <Award className="w-5 h-5" />;
            case 'Advanced':
                return <Zap className="w-5 h-5" />;
            case 'Building':
                return <TrendingUp className="w-5 h-5" />;
            case 'Foundation':
                return <BarChart3 className="w-5 h-5" />;
            default:
                return <Brain className="w-5 h-5" />;
        }
    };

    if (compact) {
        return (
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-4 text-white">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <div className="text-sm text-slate-400">Predicted Rank</div>
                        <div className="text-xl font-bold text-amber-400">{rankDisplay}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-slate-400">Percentile</div>
                        <div className="text-xl font-bold text-emerald-400">{percentileDisplay}</div>
                    </div>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="p-2 rounded-lg hover:bg-slate-700 disabled:opacity-50"
                    >
                        {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                    <h3 className="font-semibold text-slate-900">Rank Prediction</h3>
                    <p className="text-sm text-slate-500">AI-powered JEE / NEET readiness estimate</p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50"
                >
                    {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Refresh
                </button>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div className="text-center p-4 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl text-white">
                    <div className="text-3xl font-bold text-amber-400">{rankDisplay}</div>
                    <div className="text-sm text-slate-400 mt-1">Predicted Rank</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl text-white">
                    <div className="text-3xl font-bold">{percentileDisplay}</div>
                    <div className="text-sm text-emerald-100 mt-1">Estimated Percentile</div>
                </div>
                <div className={`text-center p-4 rounded-xl ${getReadinessColor()}`}>
                    <div className="flex justify-center mb-1">
                        {getReadinessIcon()}
                    </div>
                    <div className="text-3xl font-bold">{data?.examReadiness || 'N/A'}</div>
                    <div className="text-sm opacity-70 mt-1">Exam Readiness</div>
                </div>
            </div>

            {showDetails && data?.factors && (
                <div className="border-t border-slate-100 pt-6">
                    <div className="flex items-center justify-between gap-4 mb-4">
                        <h4 className="font-medium text-slate-900">Prediction Factors</h4>
                        {data.confidenceScore ? (
                            <span className="text-xs font-medium text-slate-500">
                                Confidence {data.confidenceScore}%
                            </span>
                        ) : null}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <FactorCard icon={Target} label="Accuracy" value={`${data.factors.accuracy}%`} />
                        <FactorCard icon={TrendingUp} label="Avg Score" value={`${data.factors.avgScore}%`} />
                        <FactorCard icon={BookOpen} label="Questions" value={data.factors.questionsSolved.toLocaleString()} />
                        <FactorCard icon={Zap} label="Topic Mastery" value={`${data.factors.topicMastery ?? 0}%`} />
                        <FactorCard icon={BarChart3} label="Tests Taken" value={data.factors.testsTaken.toString()} />
                        <FactorCard icon={Brain} label="Study Time" value={`${data.factors.studyTime}h`} />
                        <FactorCard icon={Timer} label="Solve Time" value={`${data.factors.avgSolveTime ?? 0}s`} />
                    </div>
                </div>
            )}

            {data?.lastUpdated && (
                <div className="mt-4 text-xs text-slate-400 text-right">
                    Last updated: {new Date(data.lastUpdated).toLocaleDateString('en-IN')}
                </div>
            )}
        </div>
    );
}

function FactorCard({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof Target;
    label: string;
    value: string;
}) {
    return (
        <div className="text-center p-3 bg-slate-50 rounded-xl">
            <div className="flex justify-center mb-1 text-slate-500">
                <Icon className="w-4 h-4" />
            </div>
            <div className="text-lg font-semibold text-slate-900">{value}</div>
            <div className="text-xs text-slate-500">{label}</div>
        </div>
    );
}

export default RankPredictionWidget;
