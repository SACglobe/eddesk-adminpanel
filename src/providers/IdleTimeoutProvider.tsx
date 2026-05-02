"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { signOut } from "@/domains/auth/queries";

const IDLE_TIMEOUT_MS = 10 * 60 * 1000;       // 10 minutes (change to 60 * 60 * 1000 for production)
const WARNING_BEFORE_MS = 2 * 60 * 1000;       // Show warning 2 min before logout
const WARNING_AT_MS = IDLE_TIMEOUT_MS - WARNING_BEFORE_MS; // 55 minutes

const ACTIVITY_EVENTS = [
    "mousemove",
    "mousedown",
    "keydown",
    "touchstart",
    "scroll",
    "wheel",
    "click",
    "focus",
];

interface IdleTimeoutProviderProps {
    children: React.ReactNode;
    onLogout?: () => void;
}

export default function IdleTimeoutProvider({ children, onLogout }: IdleTimeoutProviderProps) {
    const [showWarning, setShowWarning] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(WARNING_BEFORE_MS / 1000); // 300

    const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastActivityRef = useRef<number>(Date.now());

    const clearAllTimers = () => {
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
        if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
    };

    const handleLogout = useCallback(async () => {
        clearAllTimers();
        setShowWarning(false);
        await signOut();
        if (onLogout) {
            onLogout();
        } else {
            window.location.href = "/login";
        }
    }, [onLogout]);

    const startTimers = useCallback(() => {
        clearAllTimers();
        setShowWarning(false);
        setSecondsLeft(WARNING_BEFORE_MS / 1000);

        // Show warning at 55 min
        warningTimerRef.current = setTimeout(() => {
            setShowWarning(true);
            setSecondsLeft(WARNING_BEFORE_MS / 1000);

            // Start countdown
            countdownRef.current = setInterval(() => {
                setSecondsLeft(prev => {
                    if (prev <= 1) {
                        if (countdownRef.current) clearInterval(countdownRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }, WARNING_AT_MS);

        // Auto-logout at 60 min
        logoutTimerRef.current = setTimeout(() => {
            handleLogout();
        }, IDLE_TIMEOUT_MS);
    }, [handleLogout]);

    const resetIdleTimer = useCallback(() => {
        const now = Date.now();
        // Throttle: only reset if enough time has passed to avoid rapid re-scheduling
        if (now - lastActivityRef.current < 5000 && !showWarning) return;
        lastActivityRef.current = now;
        startTimers();
    }, [startTimers, showWarning]);

    const handleStayLoggedIn = () => {
        startTimers();
    };

    // Register activity listeners
    useEffect(() => {
        startTimers(); // Start on mount

        const handleActivity = () => resetIdleTimer();

        ACTIVITY_EVENTS.forEach(event =>
            window.addEventListener(event, handleActivity, { passive: true })
        );

        return () => {
            clearAllTimers();
            ACTIVITY_EVENTS.forEach(event =>
                window.removeEventListener(event, handleActivity)
            );
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only on mount — resetIdleTimer is stable via useCallback

    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    const formattedTime = `${minutes}:${String(seconds).padStart(2, "0")}`;
    const progressPct = (secondsLeft / (WARNING_BEFORE_MS / 1000)) * 100;

    return (
        <>
            {children}

            {/* Idle Warning Modal */}
            {showWarning && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-300" />

                    {/* Dialog */}
                    <div
                        className="relative z-10 bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.18)] border border-gray-100 w-full max-w-sm mx-4 p-8 animate-in zoom-in-95 fade-in duration-300"
                    >
                        {/* Icon */}
                        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 mx-auto mb-5">
                            <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>

                        {/* Title */}
                        <h2 className="text-[18px] font-black text-gray-900 tracking-tight text-center mb-1">
                            Still there?
                        </h2>
                        <p className="text-[13px] text-gray-500 text-center leading-relaxed mb-6">
                            You've been inactive for a while. For security, you'll be automatically signed out in:
                        </p>

                        {/* Countdown */}
                        <div className="flex flex-col items-center mb-6">
                            <span className="text-[42px] font-black text-gray-900 tracking-tighter tabular-nums leading-none">
                                {formattedTime}
                            </span>
                            {/* Progress bar */}
                            <div className="mt-3 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-1000 ease-linear"
                                    style={{
                                        width: `${progressPct}%`,
                                        background: progressPct > 50
                                            ? 'linear-gradient(90deg, #F54927, #ff6b52)'
                                            : progressPct > 20
                                                ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                                                : 'linear-gradient(90deg, #ef4444, #f87171)',
                                    }}
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleLogout}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-[13px] font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"
                            >
                                Sign out now
                            </button>
                            <button
                                onClick={handleStayLoggedIn}
                                className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all"
                                style={{ background: 'linear-gradient(135deg, #F54927 0%, #ff6b52 100%)', boxShadow: '0 2px 12px rgba(245,73,39,0.3)' }}
                            >
                                Stay signed in
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
