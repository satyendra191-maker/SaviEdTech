'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, Flame, Target, Clock, FileCheck, ChevronDown, ChevronUp, Medal, Crown } from 'lucide-react';
import { getLeaderboard, getLeaderboardMetadata, getPeriodDisplayName, type LeaderboardType, type LeaderboardPeriod, type LeaderboardEntry } from '@/lib/gamification/leaderboards';
import { cn } from '@/lib/utils';

interface LeaderboardProps {
    userId?: string;
    defaultType?: LeaderboardType;
    defaultPeriod?: LeaderboardPeriod;
    className?: string;
    showFilters?: boolean;
    limit?: number;
}

const typeIcons: Record<LeaderboardType, React.ElementType> = {
    points: Trophy,
    streaks: Flame,
    accuracy: Target,
    study_time: Clock,
    tests_completed: FileCheck,
};

const periods: LeaderboardPeriod[] = ['daily', 'weekly', 'monthly', 'all_time'];

export function Leaderboard({
    userId,
    defaultType = 'points',
    defaultPeriod = 'weekly',
    className,
    showFilters = true,
    limit = 10,
}: LeaderboardProps) {
    const [selectedType, setSelectedType] = useState<LeaderboardType>(defaultType);
    const [selectedPeriod, setSelectedPeriod] = useState<LeaderboardPeriod>(defaultPeriod);
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [userRank, setUserRank] = useState<LeaderboardEntry | undefined>();
    const [totalParticipants, setTotalParticipants] = useState(0);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        loadLeaderboard();
    }, [selectedType, selectedPeriod, userId]);

    const loadLeaderboard = async () => {
        try {
            setLoading(true);
            const result = await getLeaderboard(
                { type: selectedType, period: selectedPeriod, limit },
                userId
            );
            setEntries(result.entries);
            setUserRank(result.userRank);
            setTotalParticipants(result.totalParticipants);
        } catch (error) {
            console.error('Error loading leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const metadata = getLeaderboardMetadata(selectedType);
    const displayLimit = expanded ? limit : Math.min(5, entries.length);

    if (loading) {
        return (
            <div className={cn('animate-pulse', className)}>
                <div className="h-96 bg-muted rounded-lg" />
            </div>
        );
    }

    return (
        <div className={cn('bg-card border rounded-xl overflow-hidden', className)}>
            {/* Header */}
            <div className="p-4 border-b bg-gradient-to-r from-background to-muted/30">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                            <Trophy className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">{metadata.title}</h3>
                            <p className="text-sm text-muted-foreground">
                                {metadata.description}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-bold">{totalParticipants.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">participants</p>
                    </div>
                </div>

                {/* Filters */}
                {showFilters && (
                    <div className="flex flex-wrap gap-2">
                        {/* Type selector */}
                        <div className="flex gap-1 p-1 bg-muted rounded-lg">
                            {(Object.keys(typeIcons) as LeaderboardType[]).map((type) => {
                                const Icon = typeIcons[type];
                                return (
                                    <button
                                        key={type}
                                        onClick={() => setSelectedType(type)}
                                        className={cn(
                                            'p-2 rounded-md transition-all duration-200',
                                            selectedType === type
                                                ? 'bg-white shadow-sm text-primary'
                                                : 'text-muted-foreground hover:text-foreground'
                                        )}
                                        title={getLeaderboardMetadata(type).title}
                                    >
                                        <Icon className="h-4 w-4" />
                                    </button>
                                );
                            })}
                        </div>

                        {/* Period selector */}
                        <div className="flex gap-1 p-1 bg-muted rounded-lg">
                            {periods.map((period) => (
                                <button
                                    key={period}
                                    onClick={() => setSelectedPeriod(period)}
                                    className={cn(
                                        'px-3 py-1.5 text-sm rounded-md transition-all duration-200',
                                        selectedPeriod === period
                                            ? 'bg-white shadow-sm text-primary font-medium'
                                            : 'text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    {getPeriodDisplayName(period)}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Leaderboard List */}
            <div className="divide-y">
                {/* Top 3 Special Display */}
                {entries.slice(0, 3).length > 0 && (
                    <div className="p-4 bg-gradient-to-b from-yellow-50/50 to-transparent">
                        <div className="flex justify-center gap-4">
                            {entries.slice(0, 3).map((entry, index) => (
                                <div
                                    key={entry.userId}
                                    className={cn(
                                        'flex flex-col items-center p-4 rounded-xl transition-all duration-300',
                                        entry.isCurrentUser && 'bg-white shadow-lg',
                                        index === 0 && 'order-2 scale-110 z-10',
                                        index === 1 && 'order-1 opacity-90',
                                        index === 2 && 'order-3 opacity-80'
                                    )}
                                >
                                    <div className="relative mb-2">
                                        {entry.avatarUrl ? (
                                            <img
                                                src={entry.avatarUrl}
                                                alt={entry.fullName}
                                                className="w-12 h-12 rounded-full object-cover border-2"
                                                style={{
                                                    borderColor:
                                                        index === 0
                                                            ? '#FFD700'
                                                            : index === 1
                                                                ? '#C0C0C0'
                                                                : '#CD7F32',
                                                }}
                                            />
                                        ) : (
                                            <div
                                                className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border-2"
                                                style={{
                                                    borderColor:
                                                        index === 0
                                                            ? '#FFD700'
                                                            : index === 1
                                                                ? '#C0C0C0'
                                                                : '#CD7F32',
                                                }}
                                            >
                                                <span className="text-lg font-bold text-muted-foreground">
                                                    {entry.fullName.charAt(0)}
                                                </span>
                                            </div>
                                        )}
                                        <div
                                            className={cn(
                                                'absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                                                index === 0 && 'bg-yellow-400 text-yellow-900',
                                                index === 1 && 'bg-gray-300 text-gray-700',
                                                index === 2 && 'bg-amber-600 text-amber-100'
                                            )}
                                        >
                                            {index === 0 ? <Crown className="h-3 w-3" /> : index + 1}
                                        </div>
                                    </div>
                                    <p className="font-semibold text-sm text-center max-w-[80px] truncate">
                                        {entry.fullName}
                                    </p>
                                    <p className="text-lg font-bold text-primary">
                                        {entry.score.toLocaleString()}
                                        <span className="text-xs font-normal text-muted-foreground ml-1">
                                            {metadata.unit}
                                        </span>
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Rest of the list */}
                {entries.slice(3, displayLimit).map((entry) => (
                    <div
                        key={entry.userId}
                        className={cn(
                            'flex items-center gap-4 p-4 transition-colors hover:bg-muted/50',
                            entry.isCurrentUser && 'bg-primary/5'
                        )}
                    >
                        <div className="w-8 text-center font-semibold text-muted-foreground">
                            {entry.rank}
                        </div>
                        <div className="relative">
                            {entry.avatarUrl ? (
                                <img
                                    src={entry.avatarUrl}
                                    alt={entry.fullName}
                                    className="w-10 h-10 rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                    <span className="font-medium text-muted-foreground">
                                        {entry.fullName.charAt(0)}
                                    </span>
                                </div>
                            )}
                            {entry.isCurrentUser && (
                                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-white" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={cn('font-medium truncate', entry.isCurrentUser && 'text-primary')}>
                                {entry.fullName}
                                {entry.isCurrentUser && (
                                    <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                        You
                                    </span>
                                )}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="font-semibold">
                                {entry.score.toLocaleString()}
                                <span className="text-xs text-muted-foreground ml-1">
                                    {metadata.unit}
                                </span>
                            </p>
                        </div>
                    </div>
                ))}

                {/* Current User Rank (if not in top list) */}
                {userRank && !entries.find((e) => e.userId === userId) && (
                    <div className="border-t-2 border-primary/20">
                        <div className="flex items-center gap-4 p-4 bg-primary/5">
                            <div className="w-8 text-center font-semibold text-primary">
                                {userRank.rank}
                            </div>
                            <div className="relative">
                                {userRank.avatarUrl ? (
                                    <img
                                        src={userRank.avatarUrl}
                                        alt={userRank.fullName}
                                        className="w-10 h-10 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <span className="font-medium text-primary">
                                            {userRank.fullName.charAt(0)}
                                        </span>
                                    </div>
                                )}
                                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-primary truncate">
                                    {userRank.fullName}
                                    <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                        You
                                    </span>
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold text-primary">
                                    {userRank.score.toLocaleString()}
                                    <span className="text-xs text-muted-foreground ml-1">
                                        {metadata.unit}
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Expand/Collapse */}
            {entries.length > 5 && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="w-full p-3 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                    {expanded ? (
                        <>
                            <ChevronUp className="h-4 w-4" />
                            Show less
                        </>
                    ) : (
                        <>
                            <ChevronDown className="h-4 w-4" />
                            Show more
                        </>
                    )}
                </button>
            )}

            {/* Empty State */}
            {entries.length === 0 && (
                <div className="p-8 text-center">
                    <Medal className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No data available for this period</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        Start learning to appear on the leaderboard!
                    </p>
                </div>
            )}
        </div>
    );
}

// Compact leaderboard for dashboard
export function CompactLeaderboard({
    userId,
    type = 'points',
    limit = 5,
}: {
    userId: string;
    type?: LeaderboardType;
    limit?: number;
}) {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [userRank, setUserRank] = useState<LeaderboardEntry | undefined>();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLeaderboard();
    }, [type, userId]);

    const loadLeaderboard = async () => {
        try {
            setLoading(true);
            const result = await getLeaderboard(
                { type, period: 'weekly', limit },
                userId
            );
            setEntries(result.entries);
            setUserRank(result.userRank);
        } catch (error) {
            console.error('Error loading leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const metadata = getLeaderboardMetadata(type);
    const Icon = typeIcons[type];

    if (loading) {
        return (
            <div className="animate-pulse">
                <div className="h-48 bg-muted rounded-lg" />
            </div>
        );
    }

    return (
        <div className="bg-card border rounded-xl overflow-hidden">
            <div className="p-3 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{metadata.title}</span>
                    </div>
                    {userRank && (
                        <span className="text-sm text-muted-foreground">
                            Your rank: <span className="font-semibold text-primary">#{userRank.rank}</span>
                        </span>
                    )}
                </div>
            </div>

            <div className="divide-y">
                {entries.map((entry, index) => (
                    <div
                        key={entry.userId}
                        className={cn(
                            'flex items-center gap-3 p-3',
                            entry.isCurrentUser && 'bg-primary/5',
                            index < 3 && 'font-medium'
                        )}
                    >
                        <div
                            className={cn(
                                'w-6 text-center text-sm',
                                index === 0 && 'text-yellow-600',
                                index === 1 && 'text-gray-500',
                                index === 2 && 'text-amber-700'
                            )}
                        >
                            {index < 3 ? <Medal className="h-4 w-4 mx-auto" /> : entry.rank}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">
                                {entry.fullName}
                                {entry.isCurrentUser && (
                                    <span className="ml-1 text-xs text-primary">(You)</span>
                                )}
                            </p>
                        </div>
                        <p className="text-sm font-medium">
                            {entry.score.toLocaleString()} {metadata.unit}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// User rank card
export function UserRankCard({
    userId,
    type = 'points',
}: {
    userId: string;
    type?: LeaderboardType;
}) {
    const [userRank, setUserRank] = useState<LeaderboardEntry | undefined>();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRank();
    }, [type, userId]);

    const loadRank = async () => {
        try {
            setLoading(true);
            const result = await getLeaderboard(
                { type, period: 'weekly' },
                userId
            );
            setUserRank(result.userRank);
        } catch (error) {
            console.error('Error loading rank:', error);
        } finally {
            setLoading(false);
        }
    };

    const metadata = getLeaderboardMetadata(type);
    const Icon = typeIcons[type];

    if (loading) {
        return (
            <div className="animate-pulse">
                <div className="h-20 bg-muted rounded-lg" />
            </div>
        );
    }

    if (!userRank) {
        return (
            <div className="p-4 bg-card border rounded-xl text-center">
                <Icon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Start learning to rank!</p>
            </div>
        );
    }

    return (
        <div className="p-4 bg-card border rounded-xl">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                    <Trophy className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Your {metadata.title} Rank</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold">#{userRank.rank}</span>
                        <span className="text-sm text-muted-foreground">
                            of {userRank.rank + 50}+ students
                        </span>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold">{userRank.score.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{metadata.unit}</p>
                </div>
            </div>
        </div>
    );
}
