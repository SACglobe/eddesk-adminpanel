"use client";

import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';

interface LoadingContextType {
    isLoading: boolean;
    startLoading: () => void;
    stopLoading: () => void;
    setLoading: (loading: boolean) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

const MIN_LOAD_TIME = 1000; // 1 second

export function LoadingProvider({ children }: { children: React.ReactNode }) {
    const [loadingCount, setLoadingCount] = useState(0);
    const [isActuallyLoading, setIsActuallyLoading] = useState(false);
    const startTimeRef = useRef<number | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const startLoading = useCallback(() => {
        setLoadingCount(prev => {
            if (prev === 0) {
                startTimeRef.current = Date.now();
                setIsActuallyLoading(true);
                // Clear any pending stop-loading timeout
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                    timeoutRef.current = null;
                }
            }
            return prev + 1;
        });
    }, []);

    const stopLoading = useCallback(() => {
        setLoadingCount(prev => {
            const nextCount = Math.max(0, prev - 1);
            
            if (nextCount === 0 && startTimeRef.current) {
                const elapsed = Date.now() - startTimeRef.current;
                const remaining = Math.max(0, MIN_LOAD_TIME - elapsed);

                if (remaining > 0) {
                    timeoutRef.current = setTimeout(() => {
                        setIsActuallyLoading(false);
                        startTimeRef.current = null;
                        timeoutRef.current = null;
                    }, remaining);
                } else {
                    setIsActuallyLoading(false);
                    startTimeRef.current = null;
                }
            }
            return nextCount;
        });
    }, []);

    const setLoading = useCallback((loading: boolean) => {
        if (loading) {
            startLoading();
        } else {
            stopLoading();
        }
    }, [startLoading, stopLoading]);

    const value = useMemo(() => ({
        isLoading: isActuallyLoading,
        startLoading,
        stopLoading,
        setLoading
    }), [isActuallyLoading, startLoading, stopLoading, setLoading]);

    // Cleanup time-outs on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    return (
        <LoadingContext.Provider value={value}>
            {children}
        </LoadingContext.Provider>
    );
}

export function useLoading() {
    const context = useContext(LoadingContext);
    if (context === undefined) {
        throw new Error('useLoading must be used within a LoadingProvider');
    }
    return context;
}
