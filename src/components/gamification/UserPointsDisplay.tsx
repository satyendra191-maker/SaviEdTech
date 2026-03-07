'use client';

import React, { useEffect, useState } from 'react';

export function UserPointsDisplay({ userId }: { userId: string }) {
    const [points, setPoints] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchPoints() {
            try {
                const response = await fetch('/api/gamification/user-stats', {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data) {
                        setPoints(data.data.totalPoints || 0);
                    } else {
                         // Fallback structure in case it's tracked differently
                        setPoints(data.totalPoints || 0);
                    }
                }
            } catch (error) {
                console.error('Error fetching points:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchPoints();
    }, [userId]);

    if (loading) {
        return <div className="h-6 bg-slate-200 rounded animate-pulse w-16" />;
    }

    return (
        <div className="text-2xl font-bold text-slate-900">
            {points?.toLocaleString() || '0'}
        </div>
    );
}
