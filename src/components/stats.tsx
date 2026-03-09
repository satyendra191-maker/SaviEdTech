'use client';

import { useEffect, useState, useRef } from 'react';
import { Award, BookOpen, PlayCircle, Users } from 'lucide-react';

const stats = [
    { icon: Users, label: 'Active Students', target: 1000000000, suffix: '+', display: '1 Billion+' },
    { icon: BookOpen, label: 'Practice Questions Solved', target: 50000, suffix: '+', display: '50,000+' },
    { icon: PlayCircle, label: 'Video Lectures Available', target: 5000, suffix: '+', display: '5,000+' },
    { icon: Award, label: 'Student Satisfaction Rate', target: 95, suffix: '%+', display: '95%+' },
] as const;

const START_VALUE = 10;

function formatValue(value: number, suffix: string) {
    return `${Intl.NumberFormat('en-IN').format(value)}${suffix}`;
}

export function Stats() {
    const [values, setValues] = useState(stats.map(() => START_VALUE));

    useEffect(() => {
        const duration = 20000;
        let frameId = 0;
        let startedAt = performance.now();

        const tick = (timestamp: number) => {
            const elapsed = timestamp - startedAt;
            const progress = (elapsed % duration) / duration;
            const eased = 1 - Math.pow(1 - progress, 4);

            setValues(
                stats.map((stat) => {
                    const value = START_VALUE + (stat.target - START_VALUE) * eased;
                    return Math.round(value);
                })
            );

            frameId = window.requestAnimationFrame(tick);
        };

        frameId = window.requestAnimationFrame(tick);
        return () => window.cancelAnimationFrame(frameId);
    }, []);

    return (
        <section className="border-b border-slate-100 bg-white py-12">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                    {stats.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <div key={stat.label} className="rounded-3xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-6 shadow-sm">
                                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-cyan-50 text-sky-700">
                                    <Icon className="h-6 w-6" />
                                </div>
                                <div className="mt-4 text-3xl font-black text-slate-950">
                                    {formatValue(values[index], stat.suffix)}
                                </div>
                                <div className="mt-2 text-sm font-semibold text-slate-800">{stat.label}</div>
                                <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                                    Target: {stat.display}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
