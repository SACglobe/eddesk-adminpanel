"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { upsertComponentData, deleteComponentData, updateComponentOrder } from "@/domains/dashboard/actions";

export interface FilterCondition {
    field: string;
    operator: 'equals' | 'notequals' | 'contains' | 'startswith' | 'endswith' | 'in';
    value: any;
}

export interface FilterConfig {
    logic: 'AND' | 'OR';
    conditions: FilterCondition[];
}

/**
 * Utility to extract initial values for a new record from a filter configuration.
 * Only 'equals' operators are used to populate initial values.
 */
export function getInitialValuesFromFilters(filters: any): Record<string, any> {
    const initialValues: Record<string, any> = {};
    if (filters && typeof filters === 'object' && 'logic' in filters && 'conditions' in filters) {
        (filters as FilterConfig).conditions.forEach(c => {
            if (c.operator === 'equals') {
                initialValues[c.field] = c.value;
            }
        });
    } else if (filters && !('logic' in filters)) {
        Object.assign(initialValues, filters);
    }
    return initialValues;
}

interface UseComponentDataProps {
    tableName: string;
    schoolKey: string;
    initialRecords: any[];
    onSuccess?: () => void;
    orderBy?: string; // Optional: column to order by, defaults to displayorder
    filters?: Record<string, any> | FilterConfig; // Optional: additional filters to apply
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

    // Client-side filtering logic to maintain consistency after upserts
    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            if (r.schoolkey !== schoolKey) return false;
            
            if (!filters) return true;

            // Handle new complex filter structure
            if (typeof filters === 'object' && 'logic' in filters && 'conditions' in filters) {
                const results = (filters as FilterConfig).conditions.map(c => {
                    const rowVal = r[c.field];
                    const filterVal = c.value;

                    switch (c.operator) {
                        case 'equals': return rowVal === filterVal;
                        case 'notequals': return rowVal !== filterVal;
                        case 'contains': return String(rowVal).toLowerCase().includes(String(filterVal).toLowerCase());
                        case 'startswith': return String(rowVal).toLowerCase().startsWith(String(filterVal).toLowerCase());
                        case 'endswith': return String(rowVal).toLowerCase().endsWith(String(filterVal).toLowerCase());
                        case 'in': return Array.isArray(filterVal) ? filterVal.includes(rowVal) : false;
                        default: return true;
                    }
                });

                return (filters as FilterConfig).logic === 'OR' 
                    ? results.some(res => res) 
                    : results.every(res => res);
            }

            // Handle legacy flat-object filters (Implicit AND Equality)
            for (const [key, value] of Object.entries(filters)) {
                if (value !== undefined && value !== null && r[key] !== value) return false;
            }
            
            return true;
        });
    }, [records, schoolKey, filters]);

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
                if (typeof filters === 'object' && 'logic' in filters && 'conditions' in filters) {
                    const { logic, conditions } = filters as FilterConfig;
                    
                    if (logic === 'AND') {
                        let filteredQuery = query;
                        conditions.forEach(c => {
                            switch (c.operator) {
                                case 'equals': filteredQuery = filteredQuery.eq(c.field, c.value); break;
                                case 'notequals': filteredQuery = filteredQuery.neq(c.field, c.value); break;
                                case 'contains': filteredQuery = filteredQuery.ilike(c.field, `%${c.value}%`); break;
                                case 'startswith': filteredQuery = filteredQuery.ilike(c.field, `${c.value}%`); break;
                                case 'endswith': filteredQuery = filteredQuery.ilike(c.field, `%${c.value}`); break;
                                case 'in': filteredQuery = filteredQuery.in(c.field, c.value); break;
                            }
                        });
                        query = filteredQuery;
                    } else {
                        // Logic for OR
                        const orStrings = conditions.map(c => {
                            switch (c.operator) {
                                case 'equals': return `${c.field}.eq.${c.value}`;
                                case 'notequals': return `${c.field}.neq.${c.value}`;
                                case 'contains': return `${c.field}.ilike.%${c.value}%`;
                                case 'startswith': return `${c.field}.ilike.${c.value}%`;
                                case 'endswith': return `${c.field}.ilike.%${c.value}`;
                                case 'in': return `${c.field}.in.(${Array.isArray(c.value) ? c.value.join(',') : c.value})`;
                                default: return '';
                            }
                        }).filter(Boolean);
                        
                        if (orStrings.length > 0) {
                            query = query.or(orStrings.join(','));
                        }
                    }
                } else {
                    // Legacy Flat Filters
                    let filteredQuery = query as any;
                    Object.entries(filters).forEach(([key, value]) => {
                        if (value !== undefined && value !== null) {
                            filteredQuery = filteredQuery.eq(key, value);
                        }
                    });
                    query = filteredQuery;
                }
            }

            if (orderBy) {
                query = query.order(orderBy as any, { ascending: true });
            }

            const { data, error: fetchError } = await query;
            if (fetchError) throw fetchError;
            
            console.log(`[useComponentData] Fetching from ${tableName}. Filters:`, filters, "Result count:", data?.length || 0);
            setRecords(data || []);
        } catch (err: any) {
            console.error(`Error fetching from ${tableName}:`, err);
            setError(err.message || "Failed to load data");
        } finally {
            setIsLoading(false);
        }
    }, [tableName, schoolKey, orderBy, filters]);

    // Auto-fetch if filters are provided or initialRecords is empty
    useEffect(() => {
        // We always fetch on mount if filters are provided to ensure correct data
        // Or if initialRecords is empty
        if (filters || initialRecords.length === 0) {
            fetchRecords();
        }
    }, [fetchRecords]); // fetchRecords already depends on filters, initialRecords length not needed here

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

