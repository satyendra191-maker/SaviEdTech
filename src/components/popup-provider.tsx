'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { X } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase';

interface PopupContextType {
    showPopup: boolean;
    closePopup: () => void;
}

const PopupContext = createContext<PopupContextType | undefined>(undefined);

export function usePopup() {
    const context = useContext(PopupContext);
    if (!context) {
        throw new Error('usePopup must be used within PopupProvider');
    }
    return context;
}

interface PopupAd {
    id: string;
    title: string;
    content: string | null;
    image_url: string | null;
    button_text: string | null;
    button_url: string | null;
    display_duration_seconds: number;
}

interface PopupProviderProps {
    children: ReactNode;
}

export function PopupProvider({ children }: PopupProviderProps) {
    const [showPopup, setShowPopup] = useState(false);
    const [countdown, setCountdown] = useState(10);
    const [canClose, setCanClose] = useState(false);
    const [ad, setAd] = useState<PopupAd | null>(null);

    useEffect(() => {
        const fetchActiveAd = async () => {
            const supabase = getSupabaseBrowserClient();
            const now = new Date().toISOString();
            
            const { data: ads } = await supabase
                .from('popup_ads')
                .select('*')
                .eq('is_active', true)
                .lte('start_date', now)
                .gte('end_date', now)
                .order('priority', { ascending: false })
                .limit(1);

            if (ads && ads.length > 0) {
                const adData = ads[0] as any;
                setAd(adData as PopupAd);
                setCountdown(adData.display_duration_seconds || 10);
            }
        };

        fetchActiveAd();
    }, []);

    useEffect(() => {
        const popupShown = sessionStorage.getItem('popup_shown');
        if (popupShown) return;

        const timer = setTimeout(() => {
            if (ad) {
                setShowPopup(true);
            }
        }, 2000);

        return () => clearTimeout(timer);
    }, [ad]);

    useEffect(() => {
        if (showPopup && countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown((prev) => prev - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (countdown === 0) {
            setCanClose(true);
        }
    }, [showPopup, countdown]);

    const closePopup = () => {
        if (canClose) {
            setShowPopup(false);
            sessionStorage.setItem('popup_shown', 'true');
        }
    };

    return (
        <PopupContext.Provider value={{ showPopup, closePopup }}>
            {children}
            {showPopup && ad && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 relative animate-fade-in">
                        <button
                            onClick={closePopup}
                            disabled={!canClose}
                            className={`absolute top-4 right-4 p-2 rounded-lg transition-colors ${canClose
                                    ? 'hover:bg-slate-100 text-slate-500'
                                    : 'text-slate-300 cursor-not-allowed'
                                }`}
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center">
                            {ad.image_url && (
                                <div className="w-full h-48 bg-slate-100 rounded-xl mb-4 overflow-hidden">
                                    <img 
                                        src={ad.image_url} 
                                        alt={ad.title}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                            
                            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl font-bold text-white">
                                    {!canClose ? countdown : '✓'}
                                </span>
                            </div>

                            <h3 className="text-xl font-bold text-slate-900 mb-2">
                                {ad.title}
                            </h3>
                            {ad.content && (
                                <p className="text-slate-600 mb-6">
                                    {ad.content}
                                </p>
                            )}

                            {ad.button_text && ad.button_url && canClose && (
                                <a
                                    href={ad.button_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-full py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold rounded-xl 
                               hover:from-primary-700 hover:to-primary-600 transition-all text-center"
                                >
                                    {ad.button_text}
                                </a>
                            )}
                            
                            {!canClose && (
                                <button
                                    disabled={!canClose}
                                    className="w-full py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold rounded-xl 
                               hover:from-primary-700 hover:to-primary-600 transition-all disabled:opacity-50"
                                >
                                    Wait {countdown}s...
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </PopupContext.Provider>
    );
}
