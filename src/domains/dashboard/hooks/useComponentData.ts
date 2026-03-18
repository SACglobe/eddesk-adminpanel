"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { upsertComponentData, deleteComponentData, updateComponentOrder } from "@/domains/dashboard/actions";

interface UseComponentDataProps {
    tableName: string;
    schoolKey: string;
    initialRecords: any[];
    onSuccess?: () => void;
    orderBy?: string; // Optional: column to order by, defaults to displayorder
    filters?: Record<string, any>; // Optional: additional filters to apply
}

export function useComponentData({
    tableName,
    schoolKey,
    initialRecords,
    onSuccess,
    orderBy = "displayorder",
    filters
}: UseComponentDataProps) {
    const [records, setRecords] = useState<any[]>(initialRecords);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filtered records by schoolKey
    const filteredRecords = useMemo(() => {
        return records.filter(r => r.schoolkey === schoolKey);
    }, [records, schoolKey]);

    /**
     * Fetch records from the table
     */
    const fetchRecords = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        const supabase = createClient();

        try {
            let query = supabase
                .from(tableName as any)
                .select("*")
                .eq("schoolkey", schoolKey);

            // Apply additional filters
            if (filters) {
                let filteredQuery = query as any;
                Object.entries(filters).forEach(([key, value]) => {
                    if (value !== undefined && value !== null) {
                        filteredQuery = filteredQuery.eq(key, value);
                    }
                });
                query = filteredQuery;
            }

            if (orderBy) {
                query = query.order(orderBy as any, { ascending: true });
            }

            const { data, error: fetchError } = await query;

            if (fetchError) throw fetchError;
            setRecords(data || []);
        } catch (err: any) {
            console.error(`Error fetching from ${tableName}:`, err);
            setError(err.message || "Failed to load data");
        } finally {
            setIsLoading(false);
        }
    }, [tableName, schoolKey, orderBy, filters]);

    // Auto-fetch if initialRecords is empty or on mount
    useEffect(() => {
        if (initialRecords.length === 0) {
            fetchRecords();
        }
    }, [fetchRecords, initialRecords.length]);

    /**
     * Save/Update a record
     */
    const saveRecord = useCallback(async (data: any) => {
        setIsSaving(true);
        setError(null);

        try {
            const result = await upsertComponentData(tableName, data, schoolKey);

            if (result.success && result.data) {
                setRecords(prev => {
                    const index = prev.findIndex(r => r.key === (result.data as any).key);
                    if (index >= 0) {
                        const newRecords = [...prev];
                        newRecords[index] = result.data;
                        return newRecords;
                    }
                    return [...prev, result.data];
                });
                onSuccess?.();
            } else {
                setError(result.error ?? "Failed to save record");
            }
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred");
        } finally {
            setIsSaving(false);
        }
    }, [tableName, schoolKey, onSuccess]);

    /**
     * Delete a record
     */
    const removeRecord = useCallback(async (recordKey: string) => {
        setIsSaving(true);
        setError(null);
        try {
            const result = await deleteComponentData(tableName, recordKey, schoolKey);
            if (result.success) {
                setRecords(prev => prev.filter(r => r.key !== recordKey));
                onSuccess?.();
            } else {
                setError(result.error ?? "Failed to delete");
            }
        } catch (err: any) {
            setError(err.message || "Failed to delete");
        } finally {
            setIsSaving(false);
        }
    }, [tableName, schoolKey, onSuccess]);

    /**
     * Reorder records
     */
    const reorderRecords = useCallback(async (newOrder: any[]) => {
        if (orderBy !== "displayorder") {
            console.warn(`Reordering is only supported for tables using "displayorder". Current orderBy is "${orderBy}".`);
            return;
        }

        setIsSaving(true);
        setError(null);
        try {
            // Map items to include displayorder for the action
            const itemsWithOrder = newOrder.map((item, index) => ({
                key: item.key,
                displayorder: index + 1
            }));

            const result = await updateComponentOrder(tableName, itemsWithOrder, schoolKey);
            if (result.success) {
                setRecords(prev => {
                    const map = new Map(itemsWithOrder.map(item => [item.key, item.displayorder]));
                    return [...prev].map(r => ({
                        ...r,
                        displayorder: map.has(r.key) ? map.get(r.key) : r.displayorder
                    })).sort((a, b) => (a.displayorder || 0) - (b.displayorder || 0));
                });
            } else {
                setError(result.error ?? "Failed to reorder");
            }
        } catch (err: any) {
            setError(err.message || "Failed to reorder");
        } finally {
            setIsSaving(false);
        }
    }, [tableName, schoolKey, orderBy]);

    return {
        records: filteredRecords,
        isSaving,
        isLoading,
        error,
        saveRecord,
        removeRecord,
        reorderRecords,
        refresh: fetchRecords
    };
}

