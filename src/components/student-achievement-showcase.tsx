'use client';

import { Award, Star } from 'lucide-react';

export interface AchievementShowcaseItem {
    name: string;
    exam: string;
    title: string;
    year: string;
    image?: string;
}

interface StudentAchievementShowcaseProps {
    items: AchievementShowcaseItem[];
}

export function StudentAchievementShowcase({ items }: StudentAchievementShowcaseProps) {
    return (
        <div className="rounded-[1.8rem] border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">
                        Student Achievements
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-white">
                        Proof that disciplined preparation compounds
                    </h2>
                </div>
                <div className="hidden rounded-2xl border border-white/10 bg-white/10 p-3 text-amber-200 sm:block">
                    <Award className="h-6 w-6" />
                </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {items.slice(0, 5).map((item, index) => (
                    <article
                        key={`${item.name}-${item.title}-${index}`}
                        className="rounded-2xl border border-white/10 bg-slate-950/35 p-4"
                    >
                        <div className="flex items-start gap-3">
                            {item.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={item.image}
                                    alt={item.name}
                                    className="h-14 w-14 rounded-2xl object-cover"
                                />
                            ) : (
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-lg font-bold text-slate-950">
                                    {item.name.charAt(0)}
                                </div>
                            )}

                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="truncate text-sm font-bold text-white">{item.name}</h3>
                                    <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-200">
                                        {item.year}
                                    </span>
                                </div>
                                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                                    {item.exam}
                                </p>
                                <p className="mt-2 text-sm font-medium text-slate-200">{item.title}</p>
                                <div className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-amber-200">
                                    <Star className="h-3.5 w-3.5" />
                                    Student spotlight
                                </div>
                            </div>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
}
