"use client";

import { useState, useMemo, useEffect } from "react";
import { AdminInitialData, TemplateScreen, TemplateComponent } from "@/domains/auth/types";
import { getEnrichedConfig } from "../utils/componentUtils";
import { createClient } from "@/lib/supabase/client";

interface TemplateScannerProps {
    adminData: AdminInitialData;
}

interface ComponentBlueprint {
    type: string;
    functionalPurpose: string;
    tableName: string;
    variantName: string | null;
    groupMetadata: { name: string; mode: string } | null;
    schemaVariables: string[];
    inventory: {
        allowed: number;
        created: number;
        status: 'under' | 'at-capacity' | 'over';
    };
    integrity: {
        total: number;
        valid: number;
        mismatched: number;
        orphaned: number;
        status: 'pristine' | 'compromised' | 'broken';
        issues: { key: string; reason: string }[];
    };
    limits: { label: string; value: string; hint?: string }[];
    features: { label: string; status: 'enabled' | 'disabled' }[];
    architecture: string[];
    governance: {
        sourceAuthority: {
            editable: boolean;
            label: string;
            details: string;
        };
        distribution: {
            method: 'auto' | 'manual';
            label: string;
            details: string;
        };
        ownership: {
            isShared: boolean;
            sharedWith: string[];
        };
    };
    docs: {
        configLogic: string;
        filterProtocols: string;
        allowedVariables: string[];
    };
    currentSelection?: string;
}

interface ScanResult {
    screenName: string;
    screenKey: string;
    componentName: string;
    code: string;
    status: 'ok' | 'missing' | 'config-error';
    details: string;
    blueprint: ComponentBlueprint;
}

export default function TemplateScanner({ adminData }: TemplateScannerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedScreenFilter, setSelectedScreenFilter] = useState<string>("all");
    const [selectedBlueprint, setSelectedBlueprint] = useState<ScanResult | null>(null);

    const screens = useMemo(() => {
        return adminData.templatescreens.sort((a, b) => (a.displayorder ?? 0) - (b.displayorder ?? 0));
    }, [adminData]);

    // Live Inventory Discovery State
    const [discoveryData, setDiscoveryData] = useState<Record<string, number>>({});
    const [isDiscovering, setIsDiscovering] = useState(false);

    // Context-Aware Filter Expansion (Implicit Filter Mapping)
    const expandImplicitFilters = (code: string, screenSlug: string, explicitFilters: any = {}) => {
        const c = code.toLowerCase();
        let expanded = { ...(explicitFilters || {}) };

        // 1. Unified Screenslug Injection (Shared Contextual Components)
        const screenScopedComponents = [
            'hero', 'videohero', 'herobanner', 'heroslider', 'herosection', 'heroslide',
            'broadcast', 'schoolstats', 'stats', 'infrastructure', 'campusfeatures',
            'infrastructurelist', 'events', 'monthwiseevents', 'monthwise_events'
        ];
        if (screenScopedComponents.some(key => c === key || c.startsWith(key) || c.endsWith(key))) {
            expanded.screenslug = screenSlug;
        }

        // 2. High-Authority Singleton Designation Injection
        if (c === 'principalmessage') {
            expanded.designation = "Principal";
        }
        if (c === 'boardmembers' || c === 'boardmember') {
            expanded.designation = "Board Member";
        }

        // 3. Content Type Preservation (Specialized Variants)
        // If the editor logic requires a specific content type (e.g. Hero Video vs Image), 
        // it should be in expanded filters if not already present in explicit config.

        return expanded;
    };

    useEffect(() => {
        const discoverInventory = async () => {
            if (!adminData.schools?.key) return;
            setIsDiscovering(true);
            const supabase = createClient();
            const schoolKey = adminData.schools.key;

            // 1. Identify all unique discovery context (Table + Expanded Filters)
            const tasks = new Map<string, { table: string, filters: any }>();
            adminData.templatescreens.forEach(screen => {
                screen.components?.forEach(comp => {
                    const tableName = (comp.componentregistry as any)?.tablename;
                    const config = getEnrichedConfig(comp);
                    const code = comp.componentcode || "";
                    
                    // Inject Implicit Filters to mirror Editor logic
                    const filters = expandImplicitFilters(code, screen.screenslug || "home", config.filters);
                    
                    if (tableName) {
                        const key = `${tableName}::${JSON.stringify(filters || {})}`;
                        if (!tasks.has(key)) {
                            tasks.set(key, { table: tableName, filters });
                        }
                    }
                });
            });

            // 2. Fetch counts for each unique context
            const counts: Record<string, number> = {};
            try {
                await Promise.all(Array.from(tasks.entries()).map(async ([key, task]) => {
                    let query = supabase
                        .from(task.table)
                        .select("*", { count: 'exact', head: true })
                        .eq("schoolkey", schoolKey);
                    
                    // Apply Filters (Decision Matrix: Filter Scoping)
                    if (task.filters) {
                        if (typeof task.filters === 'object' && 'logic' in task.filters && 'conditions' in task.filters) {
                            // Support structured FilterConfig (Mapping standard)
                            task.filters.conditions.forEach((c: any) => {
                                if (c.operator === 'equals') query = query.eq(c.field, c.value);
                            });
                        } else {
                            // Support flat-object filters (Legacy standard)
                            Object.entries(task.filters).forEach(([fKey, fVal]) => {
                                if (fVal !== null && fVal !== undefined) {
                                    query = query.eq(fKey, fVal);
                                }
                            });
                        }
                    }

                    const { count, error } = await query;
                    if (!error && count !== null) {
                        counts[key] = count;
                    }
                }));
                setDiscoveryData(counts);
            } catch (err) {
                console.error("Discovery Scan Failed:", err);
            } finally {
                setIsDiscovering(false);
            }
        };

        if (isOpen) {
            discoverInventory();
        }
    }, [adminData.schools?.key, isOpen]);

    const getComponentBlueprint = (code: string, config: any, screenSlug: string, component: TemplateComponent): ComponentBlueprint => {
        const c = code.toLowerCase();
        const allowedCount = parseInt(String(config?.itemcount)) || (config?.selectionmethod === 'manual' ? (component.contentplacements?.length || 3) : 3) || 1;
        const method = config?.selectionmethod || 'auto';
        
        // Inject Implicit Filters
        const filters = expandImplicitFilters(code, screenSlug, config?.filters);
        
        // Referential Integrity Audit (Filter-Aware)
        const contentRows = (component as any).content || [];
        const placements = component.contentplacements || [];
        const issues: { key: string; reason: string }[] = [];

        // Determine mode based on Decision Matrix
        const isSingleton = (component.componentregistry as any)?.datatype === 'single' || 
                           c === "hero" || c.startsWith("hero") || c.endsWith("hero") || 
                           ["videohero", "herobanner", "heroslider", "herosection", "heroslide"].includes(c) ||
                           ["principalmessage", "boardmembersmessage", "board_message", "boardmessage", "broadcast", "schoolidentity", "visionmission", "contactdetails"].includes(c);
        
        const isAuto = method === 'auto';
        const isManual = method === 'manual';

        // 1. Inventory Calculation (Decision Matrix Aligned)
        const tableName = (component.componentregistry as any)?.tablename;
        const discoveryKey = tableName ? `${tableName}::${JSON.stringify(filters || {})}` : null;
        const discoveredCount = discoveryKey ? (discoveryData[discoveryKey] ?? 0) : 0;
        
        // Final Create Count: For Singletons and Auto, the authoritative count is the database discovery count
        const createdCount = (isSingleton || isAuto) ? discoveredCount : 0;
        
        let validCount = (isSingleton || isAuto) ? createdCount : 0;
        let mismatchedCount = 0;
        let orphanedCount = 0;
        
        placements.forEach(p => {
            const record = contentRows.find((r: any) => r.key === p.contentkey);
            if (!record) {
                issues.push({ key: p.contentkey, reason: "Reference Record Missing (Broken Link)" });
                orphanedCount++;
            } else {
                let isMismatched = false;
                if (record.screenslug && record.screenslug !== screenSlug) {
                    issues.push({ key: p.contentkey, reason: `Context Mismatch: Belongs to '${record.screenslug}', placed on '${screenSlug}'` });
                    isMismatched = true;
                }
                if (c.includes("hero") && config?.filters?.contenttype && record.contenttype && record.contenttype !== config.filters.contenttype) {
                    issues.push({ key: p.contentkey, reason: `Type Mismatch: Found '${record.contenttype}', Config requires '${config.filters.contenttype}'` });
                    isMismatched = true;
                }

                if (isMismatched) {
                    mismatchedCount++;
                } else if (isManual) {
                    // Only count valid placements for manual mode
                    validCount++;
                }
            }
        });

        const inventory: ComponentBlueprint['inventory'] = {
            allowed: allowedCount,
            created: validCount,
            status: validCount > allowedCount ? 'over' : validCount === allowedCount ? 'at-capacity' : 'under'
        };

        const integrity: ComponentBlueprint['integrity'] = {
            total: placements.length,
            valid: isManual ? validCount : (contentRows.length > 0 ? contentRows.length : 0),
            mismatched: mismatchedCount,
            orphaned: orphanedCount,
            status: placements.length === 0 ? 'pristine' : (orphanedCount > 0 ? 'broken' : mismatchedCount > 0 ? 'compromised' : 'pristine'),
            issues
        };

        // Grouping Metadata
        const groupMetadata = config?.group ? {
            name: config.group as string,
            mode: (config.groupmode as string) || 'merged'
        } : null;

        // Base Governance Logic
        const getGovernance = (type: 'crud' | 'select' | 'singleton', screenName: string | null = null): ComponentBlueprint['governance'] => {
            const isEditable = (component as any).iseditable !== false;
            
            // 1. Source Authority Logic (Standardized Matrix)
            const sourceAuthority = {
                editable: isEditable,
                label: isSingleton ? 'Direct Edit' : (isAuto ? 'Dynamic List' : 'Pinned Items'),
                details: isSingleton 
                    ? 'Singleton Architecture: Directly manages the single authoritative record in the content table.' 
                    : (isAuto 
                        ? 'Auto-Selection Logic: Records are automatically streamed based on school/screen filters.' 
                        : 'Manual Selection Logic: Records are hand-picked from the global pool by the administrator.')
            };

            // 2. Distribution Logic
            const distribution: ComponentBlueprint['governance']['distribution'] = {
                method: method as 'auto' | 'manual',
                label: isSingleton ? 'Singleton Unit' : (isAuto ? 'Auto Stream' : 'Manual Pointers'),
                details: isSingleton 
                    ? 'This unit ignores selection methods as it is a unique institutional parameter.' 
                    : (isAuto 
                        ? 'Fluid distribution based on database queries.' 
                        : 'Point-to-point mapping via the placement registry.')
            };

            // Special Labeling for "Read-Only Standards"
            if (!isEditable && isAuto) {
                sourceAuthority.label = 'Read-Only Standards';
            }

            // 3. Ownership Logic (Shared vs Dedicated)
            // Determine sharing based on table name or code
            const sharedTables = ['profiles', 'gallery', 'events', 'achievements', 'academics', 'activities', 'schoolstats', 'infrastructure'];
            const targetTable = (component.componentregistry as any)?.tablename || '';
            const isShared = sharedTables.includes(targetTable);
            
            return {
                sourceAuthority,
                distribution,
                ownership: {
                    isShared,
                    sharedWith: isShared ? ['Global Registry', 'Other Contextual Screens'] : []
                }
            };
        };

        // 1. HERO BLUEPRINT
        if (c === "hero" || c.startsWith("hero") || c.endsWith("hero") || ["videohero", "herobanner", "heroslider", "herosection", "heroslide"].includes(c)) {
            const allowedType = config?.variant || adminData.schools.componentvariants?.[screenSlug]?.hero || "both";
            return {
                type: "Hero Display System",
                functionalPurpose: "Manages the primary visual gateway of the screen, handling high-impact media slides and directional Call-to-Action (CTA) buttons.",
                tableName: "herocontent",
                variantName: allowedType.toUpperCase(),
                groupMetadata,
                schemaVariables: ["headline", "subheadline", "mediaurl", "contenttype", "primarybuttontext", "primarybuttonurl", "secondarybuttontext", "secondarybuttonurl"],
                inventory,
                integrity,
                limits: [
                    { label: "Imagery Capacity", value: `Up to ${inventory.allowed}`, hint: "Carousel enabled" },
                    { label: "Cinematic Video", value: "1 Active", hint: "Autoplay/Muted" }
                ],
                features: [
                    { label: "Interactive CTA Sync", status: "enabled" },
                    { label: "Multi-Staged Media Upload", status: "enabled" },
                    { label: "Dynamic Overlay Controls", status: "enabled" }
                ],
                architecture: ["Media Layer", "Glass UI Cards", "Overlay Controls"],
                governance: getGovernance('crud'),
                docs: {
                    configLogic: "Determines whether the hero displays images, video, or both. Logic handles aspect ratio normalization and button placement based on subheadline presence.",
                    filterProtocols: "Fetches active school-specific banners scoped to the current screen via 'screenslug'. Orders by 'displayorder'. Supports temporal 'isactive' scheduling.",
                    allowedVariables: ["headline", "subheadline", "primarybuttontext", "primarybuttonurl", "mediaurl"]
                }
            };
        }

        // 2. STATS BLUEPRINT
        if (c === "schoolstats" || c === "stats") {
            return {
                type: "Metric Diagnostic Hub",
                functionalPurpose: "Quantifies institutional success by mapping numerical achievements (Students, Faculty, Rank) to animated visual counters.",
                tableName: "schoolstats",
                variantName: "Standard Grid",
                groupMetadata,
                schemaVariables: ["label", "value", "icon", "displayorder"],
                inventory,
                integrity,
                limits: [
                    { label: "Metric Slots", value: `${inventory.allowed}`, hint: "Grid alignment: Auto" }
                ],
                features: [
                    { label: "Lucide Icon Mapping", status: "enabled" },
                    { label: "Animated State Transition", status: "enabled" },
                    { label: "Custom Title & Labeling", status: "enabled" }
                ],
                architecture: ["Graphic Icon", "Numerical Value", "Sub-label"],
                governance: getGovernance('crud'),
                docs: {
                    configLogic: "Maps raw numerical values to progress-bar or counter animations. Icon selection is validated against the Lucide library.",
                    filterProtocols: "Returns records where schoolkey and screenslug match. Sorted by displayorder.",
                    allowedVariables: ["label", "value", "icon"]
                }
            };
        }

        // 3. INFRASTRUCTURE & CAMPUS SHOWCASE
        if (c === "infrastructure" || c === "campusfeatures" || c === "infrastructurelist" || c === "highlightedinfrastructure") {
            const variant = config?.variant?.toLowerCase() || 'image';
            return {
                type: "Facility Architecture Module",
                functionalPurpose: "Showcases school physical assets and specialized rooms, supporting either high-fidelity imagery or iconic feature lists.",
                tableName: variant.includes('icon') ? "infrastructure" : "infrastructure",
                variantName: variant.toUpperCase(),
                groupMetadata,
                schemaVariables: ["title", "description", "imageurl", "icon", "isactive", "displayorder"],
                inventory,
                integrity,
                limits: [
                    { label: "Feature Slots", value: `${inventory.allowed}` },
                    { label: "Detail Capacity", value: variant.includes('bulletin') ? "Uncapped" : "N/A" }
                ],
                features: [
                    { label: "Iconographic Mapping", status: variant.includes('icon') ? "enabled" : "disabled" },
                    { label: "High-Res Image Sync", status: variant.includes('icon') ? "disabled" : "enabled" },
                    { label: "Bulletin List Logic", status: variant.includes('bulletin') ? "enabled" : "disabled" }
                ],
                architecture: ["Primary Photo", "Feature Title", "Bullet Point List"],
                governance: getGovernance(c.includes('highlighted') ? 'select' : 'crud', 'Campus Infrastructure Screen'),
                docs: {
                    configLogic: "Controls display mode (Card vs List). Logic triggers icon color synchronization in the Iconic variant.",
                    filterProtocols: "Filtered by isactive, schoolkey, and screenslug. Categorized by infrastructure_type if group logic is active.",
                    allowedVariables: ["title", "description", "imageurl", "icon"]
                }
            };
        }

        // 4. GALLERY BLUEPRINT
        if (c === "gallery") {
            return {
                type: "Global Media Repository",
                functionalPurpose: "Aggregates institutional media into a responsive grid, supporting filtering by category and deep-preview modes.",
                tableName: "gallery",
                variantName: "Grid Layout",
                groupMetadata,
                schemaVariables: ["url", "caption", "category", "contenttype", "isfeatured", "schoolkey"],
                inventory,
                integrity,
                limits: [
                    { label: "Manual Slots", value: method === 'manual' ? `${inventory.allowed}` : 'Dynamic' },
                    { label: "Format Support", value: "MP4 & JPEG/PNG" }
                ],
                features: [
                    { label: "Aspect-Ratio Management", status: "enabled" },
                    { label: "Featured Media Tagging", status: "enabled" },
                    { label: "Staged Asset Archiving", status: "enabled" }
                ],
                architecture: ["Media Source", "Thumbnail Generator"],
                governance: getGovernance('select', 'Gallery Screen'),
                docs: {
                    configLogic: "Supports manual selection of specific media or auto-generated streams by category. Logic enforces Square/Portrait aspect ratios.",
                    filterProtocols: "Queries 'gallery' table. Filtered by schoolkey and contenttype. Manual selection uses UUID mapping.",
                    allowedVariables: ["caption", "category", "isfeatured"]
                }
            };
        }

        // 5. TESTIMONIAL BLUEPRINT
        if (c === "testimonial") {
            return {
                type: "Social Proof Engine",
                functionalPurpose: "Captures and displays verified community feedback, mapping student or parent praise to high-fidelity rating cards.",
                tableName: "testimonials",
                variantName: "Quote Carousel",
                groupMetadata,
                schemaVariables: ["author", "role", "content", "rating", "imageurl", "isactive"],
                inventory,
                integrity,
                limits: [
                    { label: "Max Records", value: `${inventory.allowed}` },
                    { label: "Rating Scale", value: "Verified 5-Star" }
                ],
                features: [
                    { label: "Reviewer Image Sync", status: "enabled" },
                    { label: "Star-State Management", status: "enabled" },
                    { label: "Quote Sanitization", status: "enabled" }
                ],
                architecture: ["User Feedback", "Quality Rating", "Profile Card"],
                governance: getGovernance('select', 'Testimonials Screen'),
                docs: {
                    configLogic: "Cycles through active testimonials. The 'itemcount' property limits the carousel depth for performance.",
                    filterProtocols: "Returns records where 'isactive' is true. Manual mode uses 'contentplacements' join.",
                    allowedVariables: ["author", "role", "content", "rating"]
                }
            };
        }

        // 6. PERSONNEL & LEADERSHIP
        if (c === "faculty" || c === "boardmembers" || c === "leadership" || c === "principalmessage" || c === "boardmembersmessage" || c === "board_message" || c === "boardmessage") {
            const isIndividual = ["principalmessage", "boardmembersmessage", "board_message", "boardmessage"].includes(c);
            return {
                type: isIndividual ? "Authority Narrative" : "Professional Directory",
                functionalPurpose: isIndividual 
                    ? "Highlights a key executive message with official portraiture and digital signature capabilities."
                    : "Manages the faculty and staff roster, detailing academic qualifications and professional experience.",
                tableName: "profiles",
                variantName: isIndividual ? "Single Profile" : "Staff Grid",
                groupMetadata,
                schemaVariables: ["name", "designation", "qualification", "experience_years", "email", "description", "imageurl", "quotes"],
                inventory,
                integrity,
                limits: [
                    { label: "Member Slots", value: isIndividual ? "1 Primary" : `${inventory.allowed}` }
                ],
                features: [
                    { label: "Qualification Audit", status: "enabled" },
                    { label: "Portrait Masking", status: "enabled" },
                    { label: "Staged Experience Counter", status: !isIndividual ? "enabled" : "disabled" }
                ],
                architecture: ["Bio", "Portrait", "Designation Tag"],
                governance: getGovernance(isIndividual ? 'singleton' : 'select', 'Staff / Leadership Screen'),
                docs: {
                    configLogic: "Differentiates between group lists and individual personal statements. Principal's variant handles digital signatures.",
                    filterProtocols: "Queries 'profiles' table. Categorized by profile_type (Faculty/Board).",
                    allowedVariables: ["name", "designation", "qualification", "description", "quotes"]
                }
            };
        }

        // 7. EVENTS & ANNOUNCEMENTS
        if (c === "events" || c === "monthwiseevents" || c === "monthwise_events" || c === "broadcast") {
            const isMonthwise = c.includes('monthwise');
            return {
                type: "News & Intel Hub",
                functionalPurpose: "Centralizes institutional communications, ranging from real-time 'Broadcast' alerts to long-form academic calendars.",
                tableName: "events",
                variantName: isMonthwise ? "Monthwise Calendar" : "Linear Feed",
                groupMetadata,
                schemaVariables: ["headline", "subheadline", "eventdate", "actionlink", "category", "isactive"],
                inventory,
                integrity,
                limits: [
                    { label: "Display Capacity", value: c === 'broadcast' ? "1 Alert" : `${inventory.allowed}` }
                ],
                features: [
                    { label: "Temporal Date Logic", status: "enabled" },
                    { label: "Dynamic Action Linking", status: "enabled" },
                    { label: "Event Categorization", status: "enabled" }
                ],
                architecture: ["Heading", "Release Date", "Action Link"],
                governance: getGovernance('select', 'Announcements Screen'),
                docs: {
                    configLogic: "Supports linear chronological feeds or month-wise calendar objects. The 'broadcast' subtype ignores itemcount to show one global alert.",
                    filterProtocols: "Queries 'events' or 'broadcastcontent' table. Filters by 'screenslug', 'eventdate' > current_timestamp and 'isactive' = true.",
                    allowedVariables: ["headline", "subheadline", "eventdate", "actionlink"]
                }
            };
        }

        // 8. ACADEMICS & CURRICULUM
        if (c === "academicslist" || c === "highlightedacademics" || c === "activitieslist" || c === "highlightedactivites") {
            const isHighlighted = c.includes('highlighted');
            return {
                type: "Educational Blueprint",
                functionalPurpose: "Catalogs the school's educational offerings and extracurricular activities, providing a structural overview of the curriculum.",
                tableName: c.includes('academics') ? "academics" : "activities",
                variantName: "Iconic Grid",
                groupMetadata,
                schemaVariables: ["title", "description", "imageurl", "icon", "isfeatured", "slug"],
                inventory,
                integrity,
                limits: [
                    { label: "Index Slots", value: `${inventory.allowed}` }
                ],
                features: [
                    { label: "Artwork Sync", status: "enabled" },
                    { label: "Syllabus Snippet Support", status: "enabled" },
                    { label: "Category Tagging", status: "enabled" }
                ],
                architecture: ["Cover Art", "Academic Title", "Syllabus Snippet"],
                governance: getGovernance(isHighlighted ? 'select' : 'singleton', 'Academics / Activities Screen'),
                docs: {
                    configLogic: "Maps academic subjects or school activities to stylized list items. Featured mode highlights top records based on 'isfeatured' flag.",
                    filterProtocols: "Filters by active records for the 'academics' or 'activities' table based on component code.",
                    allowedVariables: ["title", "description", "imageurl", "icon"]
                }
            };
        }

        // 9. VISION & IDENTITY
        if (c === "visionmission" || c === "schoolidentity") {
            return {
                type: "Institutional Identity",
                functionalPurpose: "Manages core philosophical statements including the Mission, Vision, and Motto that define the school's heritage.",
                tableName: (component.componentregistry as any)?.tablename || "schoolidentity",
                variantName: "Merged Static",
                groupMetadata,
                schemaVariables: ["motto", "vision", "mission", "philosophy", "history"],
                inventory,
                integrity,
                limits: [
                    { label: "Global Scope", value: "Singleton Record" }
                ],
                features: [
                    { label: "Deep Narrative Editing", status: "enabled" },
                    { label: "Heritage Sync", status: "enabled" },
                    { label: "Core Values Mapping", status: "enabled" }
                ],
                architecture: ["Statement Title", "Statement Body"],
                governance: getGovernance('crud'),
                docs: {
                    configLogic: "Merged static record that updates the global school identity parameters. Single-row database target.",
                    filterProtocols: "Retrieves the single active row from 'schoolidentity' where schoolkey matches.",
                    allowedVariables: ["motto", "vision", "mission", "philosophy"]
                }
            };
        }

        // 10. ACHIEVEMENTS & RESULTS
        if (c === "schoolachievements" || c === "achievements" || c === "academicresults") {
            return {
                type: "Excellence Tracker",
                functionalPurpose: "Showcases student board results and award victories, mapping individual performance to public praise records.",
                tableName: "achievements",
                variantName: "Achievement Cards",
                groupMetadata,
                schemaVariables: ["title", "description", "imageurl", "type", "score_value", "award_category"],
                inventory,
                integrity,
                limits: [
                    { label: "Achievement Slots", value: `${inventory.allowed}` }
                ],
                features: [
                    { label: "Score/Rank Validation", status: "enabled" },
                    { label: "Assign Achievement Icons", status: "enabled" },
                    { label: "Topper Portrait Sync", status: "enabled" }
                ],
                architecture: ["Topper Portrait", "Merit Tag", "Percentage/Rank"],
                governance: getGovernance('select', 'Achievements Screen'),
                docs: {
                    configLogic: "Maps complex academic achievement data (Board results, Topper lists) to visual cards. Supports score-based sorting.",
                    filterProtocols: "Queries 'achievements' table. Groups by result_year if configured.",
                    allowedVariables: ["title", "description", "score_value", "award_category"]
                }
            };
        }

        // 11. WHY CHOOSE US
        if (c === "whychooseus") {
            return {
                type: "Market Differentiation",
                functionalPurpose: "Highlights unique selling points of the school, utilizing an iconic feature set to distinguish the institution.",
                tableName: "whychooseus",
                variantName: "Iconic List",
                groupMetadata,
                schemaVariables: ["title", "description", "icon", "displayorder"],
                inventory,
                integrity,
                limits: [
                    { label: "Feature Slots", value: `${inventory.allowed}` }
                ],
                features: [
                    { label: "Lucide Icon Picker", status: "enabled" },
                    { label: "Feature Headline Edit", status: "enabled" },
                    { label: "Description Sanitization", status: "enabled" }
                ],
                architecture: ["Title", "Detailed Description", "Action Icon"],
                governance: getGovernance('crud'),
                docs: {
                    configLogic: "Displays unique school benefits using icons. Logic enforces short, punchy headlines for grid consistency.",
                    filterProtocols: "Fetches all active records where schoolkey matches. Sequential sorting enabled.",
                    allowedVariables: ["title", "description", "icon"]
                }
            };
        }

        // 12. ADMISSIONS & INSTRUCTIONS
        if (c === "admissioninstructions") {
            return {
                type: "Operational Pipeline",
                functionalPurpose: "Guides prospective parents through the enrollment process with sequential instructions and requirement checklists.",
                tableName: "admissioninstructions",
                variantName: "Workflow Steps",
                groupMetadata,
                schemaVariables: ["title", "description", "step_number", "isactive"],
                inventory,
                integrity,
                limits: [
                    { label: "Procedure Steps", value: `${inventory.allowed}` }
                ],
                features: [
                    { label: "Auto-Increment Logic", status: "enabled" },
                    { label: "Checklist Management", status: "enabled" },
                    { label: "Process Flow Edit", status: "enabled" }
                ],
                architecture: ["Instruction Title", "Checklist Point"],
                governance: getGovernance('select', 'Admissions Screen'),
                docs: {
                    configLogic: "Sequential documentation of the admission pipeline. Logic generates numeric badges based on 'step_number'.",
                    filterProtocols: "Queries 'admissioninstructions'. Ordered by step_number ascending.",
                    allowedVariables: ["title", "description", "step_number"]
                }
            };
        }

        // Default
        const registryTable = (component.componentregistry as any)?.tablename;
        return {
            type: "Universal Architecture Module",
            functionalPurpose: "A standard content container used for varied informational needs across the template screens.",
            tableName: registryTable || (config as any)?.tablename || "[UNDEFINED_TABLE]",
            variantName: (config as any)?.variant || "Default",
            groupMetadata,
            schemaVariables: ["key", "schoolkey", "content", "isactive"],
            inventory,
            integrity,
            limits: [
                { label: "Operational Slots", value: inventory.allowed > 0 ? `${inventory.allowed}` : 'Dynamic' }
            ],
            features: [
                { label: "Base Schema Editing", status: "enabled" },
                { label: "Content Logic Sync", status: "enabled" }
            ],
            architecture: ["Content Block", "Admin Controls"],
            governance: getGovernance('singleton'),
            docs: {
                configLogic: "General purpose JSON configuration logic used for fallback component rendering.",
                filterProtocols: "Standard schoolkey and screenslug scoping applied.",
                allowedVariables: ["content", "isactive"]
            }
        };
    };

    const scanResults = useMemo(() => {
        const results: ScanResult[] = [];

        adminData.templatescreens.forEach(screen => {
            screen.components?.forEach(comp => {
                const code = comp.componentcode?.toLowerCase() ?? "";
                const config = getEnrichedConfig(comp);
                const componentName = comp.componentregistry?.componentname ?? comp.componentcode ?? "Unknown";
                
                // Definition Check via Host logic
                const isHeroCode = code === "hero" || code.startsWith("hero") || code.endsWith("hero") || ["videohero", "herobanner", "heroslider", "herosection", "heroslide"].includes(code);
                
                const hasEditor = isHeroCode || [
                    "schoolstats", "broadcast", "academicresults", "schoolachievements", "achievements",
                    "gallery", "contactdetails", "events", "monthwiseevents", "monthwise_events",
                    "faculty", "testimonial", "leadership", "principalmessage", "infrastructure",
                    "campusfeatures", "infrastructurelist", "visionmission", "schoolidentity",
                    "boardmembers", "boardmembersmessage", "board_message", "boardmessage",
                    "whychooseus", "admissioninstructions", "academicslist", "highlightedacademics",
                    "activitieslist", "highlightedactivites", "highlightedinfrastructure"
                ].includes(code);

                const isSingleton = ['contactdetails'].includes(code) || isHeroCode || ["principalmessage", "boardmembersmessage", "board_message", "boardmessage", "broadcast", "schoolidentity", "visionmission"].includes(code);
                const isConfigMissing = !isSingleton && (!config || Object.keys(config).length === 0 || (
                    config.variant === null && 
                    config.itemcount === null && 
                    config.selectionmethod === null
                ));

                const blueprint = getComponentBlueprint(code, config, screen.screenslug ?? "N/A", comp);

                let status: ScanResult['status'] = 'ok';
                let details = "Blueprint Verified";

                if (!hasEditor) {
                    status = 'missing';
                    details = "Host Mapping (MISSING_EDITOR)";
                } else if (isConfigMissing) {
                    status = 'config-error';
                    details = "Template Config (MISSING_ENUMS)";
                } else if (blueprint.tableName === "[UNDEFINED_TABLE]" || blueprint.tableName === "templatecontent") {
                    status = 'config-error';
                    details = "ABNORMAL_SOURCE_MAPPING";
                }

                results.push({
                    screenName: screen.screenname ?? screen.screenslug ?? "N/A",
                    screenKey: screen.key,
                    componentName,
                    code: comp.componentcode ?? "N/A",
                    status,
                    details,
                    blueprint
                });
            });
        });

        return results;
    }, [adminData, discoveryData]);

    const filteredResults = scanResults.filter(r => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = r.screenName.toLowerCase().includes(query) ||
                             r.componentName.toLowerCase().includes(query) ||
                             r.code.toLowerCase().includes(query) ||
                             r.blueprint.type.toLowerCase().includes(query);
        const matchesScreen = selectedScreenFilter === "all" || r.screenKey === selectedScreenFilter;
        return matchesSearch && matchesScreen;
    });

    const stats = {
        total: scanResults.length,
        operational: scanResults.filter(r => r.status === 'ok').length,
        missing: scanResults.filter(r => r.status === 'missing').length,
        error: scanResults.filter(r => r.status === 'config-error').length,
        health: Math.round((scanResults.filter(r => r.status === 'ok').length / scanResults.length) * 100)
    };

    if (!isOpen) return (
        <button 
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-[100] bg-gray-900 hover:bg-black text-white px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm transition-all active:scale-95 border border-white/10 backdrop-blur-md group"
        >
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse border-2 border-emerald-500/30" />
            <span className="tracking-tight uppercase text-[11px] font-black">Architecture Scan</span>
        </button>
    );

    return (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col animate-in slide-in-from-bottom duration-500">
            {/* Streamlined Header */}
            <div className="bg-[#0f172a] text-white px-10 py-5 flex items-center justify-between gap-10 shrink-0 relative overflow-hidden border-b border-white/5">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-red-500/5 rounded-full blur-[100px] -mr-32 -mt-32" />
                
                <div className="relative z-10 flex items-center gap-6">
                    {/* Navigation Row */}
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="w-12 h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center transition-all active:scale-90 group"
                    >
                        <svg className="w-6 h-6 text-white/40 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>

                    <div className="w-14 h-14 rounded-2xl bg-white shadow-xl flex items-center justify-center text-gray-900 border-2 border-white/10 shrink-0">
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    </div>

                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="px-1.5 py-0.5 bg-[#F54927] text-white text-[10px] font-black rounded uppercase tracking-widest leading-none">Diagnostic Mode</span>
                            <span className="text-white/30 text-[12px] font-bold tracking-tight uppercase">Project: {adminData.schools.name}</span>
                        </div>
                        <h2 className="text-3xl font-black tracking-tighter leading-tight uppercase">Architecture Audit</h2>
                    </div>
                </div>

                {/* Relocated Search & Filter Unit */}
                <div className="relative z-10 flex items-center gap-4 flex-1 max-w-2xl">
                    <div className="relative flex-1 group">
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input 
                            type="text" 
                            placeholder="Locate blueprints..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-6 py-3 bg-white/5 border border-white/10 focus:border-red-500/50 focus:bg-white/10 rounded-xl text-[14px] font-bold text-white outline-none transition-all placeholder:text-white/20 shadow-inner"
                        />
                    </div>
                    
                    <div className="w-64 relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none group-focus-within:text-red-500 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                        </div>
                        <select 
                            value={selectedScreenFilter}
                            onChange={(e) => setSelectedScreenFilter(e.target.value)}
                            className="w-full appearance-none pl-11 pr-10 py-3 bg-white/5 border border-white/10 hover:border-white/20 rounded-xl text-[13px] font-black text-white/70 uppercase tracking-widest outline-none cursor-pointer"
                        >
                            <option value="all" className="bg-[#0f172a]">Global Workspace</option>
                            {screens.map(s => <option key={s.key} value={s.key} className="bg-[#0f172a]">{s.screenname ?? s.screenslug}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Compact System Info Bar */}
            <div className="px-10 py-3 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between shadow-sm relative z-50">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                        <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Active Scan Verified</span>
                    </div>
                    <div className="h-4 w-px bg-gray-200" />
                    <div className="flex items-center gap-6">
                        <StatCircle label="Global Health" value={`${stats.health}%`} color="text-emerald-600" />
                        <StatCircle label="Operational Units" value={stats.operational} color="text-gray-900" />
                        <StatCircle label="Structure Issues" value={stats.missing + stats.error} color={stats.missing + stats.error > 0 ? "text-red-500" : "text-gray-300"} />
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <span className="text-[12px] font-bold text-gray-300 uppercase tracking-tight">Scope Identified:</span>
                    <span className="text-[13px] font-black text-gray-600 px-3 py-1 bg-white border border-gray-100 rounded-lg shadow-sm">{filteredResults.length} / {stats.total} Components</span>
                </div>
            </div>

            {/* Compact Content Scroller */}
            <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50 no-scrollbar">
                <div className="max-w-[1900px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
                    {filteredResults.map((res, idx) => (
                        <DeepCard 
                            key={idx} 
                            result={res} 
                            onSelect={() => setSelectedBlueprint(res)}
                        />
                    ))}
                </div>
            </div>

            {/* Deep-Dive Documentation Dialog */}
            {selectedBlueprint && (
                <BlueprintDialog 
                    result={selectedBlueprint} 
                    onClose={() => setSelectedBlueprint(null)} 
                />
            )}
        </div>
    );
}

function BlueprintDialog({ result, onClose }: { result: ScanResult, onClose: () => void }) {
    const b = result.blueprint;
    const inv = b.inventory;
    const progress = Math.min((inv.created / inv.allowed) * 100, 100);

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 md:p-12 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-xl" onClick={onClose} />
            
            <div className="relative w-full max-w-5xl bg-white rounded-[48px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
                {/* Modal Header */}
                <div className="bg-[#0f172a] p-10 flex items-start justify-between relative overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-red-500/10 rounded-full blur-[80px] -mr-20 -mt-20" />
                    
                    <div className="relative z-10 flex items-center gap-8">
                        <div className="w-20 h-20 rounded-[28px] bg-white flex items-center justify-center text-gray-900 shadow-2xl border-4 border-white/10 shrink-0">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-3 py-1 bg-[#F54927] text-white text-[11px] font-black rounded-lg uppercase tracking-widest leading-none">Complete Blueprint</span>
                                <span className="text-white/40 text-[13px] font-bold tracking-tight uppercase tracking-widest">{result.code}</span>
                            </div>
                            <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-none mb-1">{result.componentName}</h2>
                            <p className="text-white/50 text-[15px] font-bold tracking-tight uppercase tracking-widest">Architecture Diagnostic: {b.type}</p>
                        </div>
                    </div>

                    <button 
                        onClick={onClose}
                        className="relative z-10 w-12 h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center transition-all active:scale-90 group"
                    >
                        <svg className="w-6 h-6 text-white/40 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto no-scrollbar bg-gray-50/50 p-10">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                        {/* Left Column: Context & Governance */}
                        <div className="lg:col-span-7 space-y-10">
                            {/* Summary */}
                            <section>
                                <h4 className="text-[12px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                                    <span className="w-8 h-px bg-gray-200" /> Functional Purpose
                                </h4>
                                <p className="text-[18px] text-gray-700 font-bold leading-relaxed bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm italic">
                                    "{b.functionalPurpose}"
                                </p>
                            </section>

                            {/* Software Implementation */}
                            <section className="space-y-6">
                                <h4 className="text-[12px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                                    <span className="w-8 h-px bg-gray-200" /> Implementation Protocols
                                </h4>
                                
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm group">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500 font-black">{}<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg></div>
                                            <span className="text-[13px] font-black text-gray-900 uppercase tracking-widest">Config Logic</span>
                                        </div>
                                        <p className="text-[14px] font-bold text-gray-500 leading-relaxed">{b.docs.configLogic}</p>
                                    </div>

                                    <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm group">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 font-black">{}<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg></div>
                                            <span className="text-[13px] font-black text-gray-900 uppercase tracking-widest">Filter Protocols</span>
                                        </div>
                                        <p className="text-[14px] font-bold text-gray-500 leading-relaxed">{b.docs.filterProtocols}</p>
                                    </div>

                                    <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm group">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500 font-black">{}<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></div>
                                            <span className="text-[13px] font-black text-gray-900 uppercase tracking-widest">Authorized Variables</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {b.docs.allowedVariables.map((v, i) => (
                                                <span key={i} className="px-3 py-1 bg-gray-50 text-gray-600 text-[12px] font-bold rounded-lg border border-gray-100">
                                                    {v}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Governance & Logic Authority */}
                            <section className="space-y-6 pt-6">
                                <h4 className="text-[12px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                                    <span className="w-8 h-px bg-gray-200" /> Administrative Governance
                                </h4>
                                <div className="bg-gray-50 rounded-[32px] p-8 space-y-8 border border-gray-100">
                                    <div className="flex gap-6">
                                        <div className="flex-1 space-y-2">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Source Authority</span>
                                            <div className="flex items-center gap-3">
                                                <div className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase ${b.governance.sourceAuthority.editable ? 'bg-emerald-500 text-white' : 'bg-neutral-900 text-white'}`}>
                                                    {b.governance.sourceAuthority.label}
                                                </div>
                                            </div>
                                            <p className="text-[14px] font-bold text-gray-500 leading-tight">{b.governance.sourceAuthority.details}</p>
                                        </div>
                                        <div className="flex-1 space-y-2 text-right">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Distribution Logic</span>
                                            <div className="flex items-center justify-end gap-3">
                                                <div className="px-3 py-1 rounded-lg text-[11px] font-black uppercase bg-white border border-gray-200 text-gray-900">
                                                    {b.governance.distribution.label}
                                                </div>
                                            </div>
                                            <p className="text-[14px] font-bold text-gray-500 leading-tight">{b.governance.distribution.details}</p>
                                        </div>
                                    </div>

                                    {/* Ownership Logic */}
                                    <div className="pt-6 border-t border-gray-200/50">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Variable Ownership</span>
                                            <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${b.governance.ownership.isShared ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                                {b.governance.ownership.isShared ? 'Shared Variable' : 'Dedicated Context'}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {b.governance.ownership.isShared ? (
                                                b.governance.ownership.sharedWith.map((s, i) => (
                                                    <span key={i} className="px-3 py-1.5 bg-white text-gray-600 text-[12px] font-bold rounded-xl border border-gray-100 italic">
                                                        "{s}"
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-[13px] font-bold text-gray-400">This component's data is unique to this specific screen instance.</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Right Column: Inventory & Stats */}
                        <div className="lg:col-span-5 space-y-10">
                            {/* Inventory Pulse */}
                            <section className="bg-neutral-900 rounded-[40px] p-10 shadow-2xl overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-10 opacity-10 animate-pulse">
                                    <svg className="w-32 h-32 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.82v-1.91c-1.64-.35-3.15-1.28-4.22-2.52l1.52-1.42c.81.93 1.95 1.63 3.23 1.95V13.5c-1.89-.5-4.57-1.23-4.57-4.14 0-2.3 1.74-3.8 4.07-4.23V3h2.82v2.1c1.47.36 2.76 1.13 3.63 2.15l-1.52 1.42c-.62-.71-1.46-1.26-2.42-1.54v2.54c1.89.5 4.54 1.25 4.54 4.14 0 2.22-1.67 3.73-3.9 4.14z"/></svg>
                                </div>

                                <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-6">Inventory Architecture</h4>
                                
                                <div className="space-y-8 relative z-10">
                                    <div className="flex items-end justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-black text-white/40 uppercase mb-2">Operational Units</span>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-6xl font-black text-white leading-none tracking-tighter">{inv.created}</span>
                                                <span className="text-xl font-bold text-white/20">/ {inv.allowed}</span>
                                            </div>
                                        </div>
                                        <div className={`px-4 py-2 rounded-2xl text-[12px] font-black uppercase tracking-widest shadow-xl h-fit ${inv.status === 'under' ? 'bg-emerald-500 text-white' : 'bg-[#F54927] text-white'}`}>
                                            {inv.status === 'at-capacity' ? 'Optimized' : inv.status === 'over' ? 'Overflow' : 'Healthy'}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-[11px] font-black text-white/50 uppercase tracking-widest">
                                            <span>Resource Allocation</span>
                                            <span>{Math.round(progress)}% utilized</span>
                                        </div>
                                        <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full transition-all duration-1000 ease-out rounded-full ${inv.status === 'over' ? 'bg-red-500' : inv.status === 'at-capacity' ? 'bg-orange-500' : 'bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.5)]'}`}
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Detailed Registry Diagnostic */}
                            <section className={`rounded-[40px] p-8 border-2 transition-all overflow-hidden relative ${b.integrity.status === 'pristine' ? 'bg-white border-gray-100' : b.integrity.status === 'broken' ? 'bg-red-50/50 border-red-100' : 'bg-orange-50/50 border-orange-100'}`}>
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                                    <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                                </div>

                                <div className="flex items-center justify-between mb-8 relative z-10">
                                    <h4 className={`text-[11px] font-black uppercase tracking-[0.2em] ${b.integrity.status === 'pristine' ? 'text-gray-400' : b.integrity.status === 'broken' ? 'text-red-500' : 'text-orange-500'}`}>Referential Registry Scan</h4>
                                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${b.integrity.status === 'pristine' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : b.integrity.status === 'broken' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'}`}>
                                        {b.integrity.status === 'pristine' ? 'Registry Synchronized' : b.integrity.status === 'broken' ? 'Registry Corrupted' : 'Registry Mismatch'}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between py-2 border-b border-gray-200/50">
                                            <span className="text-[13px] font-bold text-gray-500">Inventory match (Table)</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[20px] font-black text-gray-900">{b.integrity.valid}</span>
                                                <span className="text-[12px] font-bold text-gray-400 uppercase">Records</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between py-2 border-b border-gray-200/50">
                                            <span className="text-[13px] font-bold text-gray-500">Active Pointers (Registry)</span>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[20px] font-black ${b.integrity.total !== b.integrity.valid ? 'text-orange-600' : 'text-gray-900'}`}>{b.integrity.total}</span>
                                                <span className="text-[12px] font-bold text-gray-400 uppercase">Entries</span>
                                            </div>
                                        </div>
                                        
                                        {b.integrity.status === 'pristine' ? (
                                            <div className="flex items-center gap-3 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                </div>
                                                <p className="text-[12px] font-bold text-emerald-700">Database registry perfectly synchronized with content filters.</p>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3 p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
                                                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                </div>
                                                <p className="text-[12px] font-bold text-orange-700">Found {b.integrity.total - b.integrity.valid} mismatched entries in `componentplacement` registry.</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Diagnostic Delta</p>
                                        <div className="space-y-2 max-h-[180px] overflow-y-auto no-scrollbar">
                                            {b.integrity.issues.map((issue, i) => (
                                                <div key={i} className="flex items-start gap-3 p-4 bg-white/60 border border-gray-100 rounded-2xl shadow-sm">
                                                    <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${issue.reason.includes('Missing') ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]'}`} />
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[11px] font-black text-gray-900 font-mono">{issue.key}</span>
                                                        <span className="text-[12px] font-bold text-gray-500 leading-tight">{issue.reason}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Operational Capabilities (Moved from Card) */}
                            <section>
                                <h4 className="text-[12px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                                    <span className="w-8 h-px bg-gray-200" /> Operational Features
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {b.features.map((f, i) => (
                                        <div key={i} className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-[22px] shadow-sm">
                                            <div className={`w-2 h-2 rounded-full ${f.status === 'enabled' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-gray-200'}`} />
                                            <span className={`text-[14px] font-bold ${f.status === 'enabled' ? 'text-gray-700' : 'text-gray-300'}`}>{f.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="bg-white px-10 py-8 border-t border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-10">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Target Table</span>
                            <span className="text-[15px] font-black text-gray-900 font-mono tracking-tight">{b.tableName}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">UI Variant</span>
                            <span className="text-[15px] font-black text-purple-600 tracking-tight">{b.variantName || 'Standard'}</span>
                        </div>
                    </div>
                    
                    <button 
                        onClick={onClose}
                        className="px-10 py-4 bg-gray-900 hover:bg-black text-white text-[13px] font-black uppercase tracking-widest rounded-3xl transition-all shadow-xl shadow-black/10 active:scale-95"
                    >
                        Acknowledge Architecture
                    </button>
                </div>
            </div>
        </div>
    );
}

function DeepCard({ result, onSelect }: { result: ScanResult, onSelect: () => void }) {
    const isError = result.status !== 'ok';
    const inv = result.blueprint.inventory;
    const progress = Math.min((inv.created / inv.allowed) * 100, 100);
    
    return (
        <div 
            onClick={onSelect}
            className={`group relative bg-white rounded-[40px] border-2 transition-all duration-500 p-7 flex flex-col cursor-pointer ${isError ? 'border-red-100/50 bg-red-50/20 shadow-lg shadow-red-500/5' : 'border-gray-100 shadow-[0_15px_50px_rgba(0,0,0,0.03)] hover:border-[#F54927]/30 hover:shadow-[0_40px_80px_rgba(245,73,39,0.12)] hover:-translate-y-1'}`}
        >
            
            {/* Header: Functional Identity */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex flex-col flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-2.5 py-1 bg-neutral-900 text-white text-[10px] font-black rounded-lg uppercase tracking-wider">{result.blueprint.type}</span>
                        <span className="px-2 py-1 bg-[#F54927]/10 text-[#F54927] text-[10px] font-black rounded-lg uppercase tracking-wider border border-[#F54927]/20">{result.screenName}</span>
                        <div className={`w-1.5 h-1.5 rounded-full ${isError || result.blueprint.integrity.status !== 'pristine' ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                        {result.blueprint.integrity.status !== 'pristine' && (
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${result.blueprint.integrity.status === 'broken' ? 'bg-red-500 text-white shadow-[0_2px_8px_rgba(239,68,68,0.3)]' : 'bg-orange-500 text-white shadow-[0_2px_8px_rgba(249,115,22,0.3)]'}`}>
                                {result.blueprint.integrity.status === 'broken' ? 'Registry Broken' : 'Registry Mismatch'}
                            </span>
                        )}
                    </div>
                    <h3 className="text-[22px] font-black text-gray-900 tracking-tighter group-hover:text-[#F54927] transition-colors leading-tight uppercase truncate">{result.componentName}</h3>
                </div>
                
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border-2 transition-all duration-500 ${isError ? 'bg-red-500 text-white border-red-400 rotate-12 scale-110' : 'bg-neutral-50 text-gray-400 border-gray-50 group-hover:bg-[#F54927] group-hover:text-white group-hover:border-[#F54927] group-hover:rotate-6 shadow-sm'}`}>
                    {isError ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
                </div>
            </div>

            {/* Functional Context Removed from Card - Now in Dialog */}

            {/* Inventory & Capacity Metric */}
            <div className={`border rounded-[32px] p-5 mb-4 relative overflow-hidden transition-all duration-300 ${result.blueprint.integrity.status === 'pristine' ? 'bg-white border-gray-100' : result.blueprint.integrity.status === 'broken' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
                <div className="flex items-center justify-between mb-3 relative z-10">
                    <div className="flex flex-col">
                        <span className={`text-[9px] font-black uppercase tracking-[0.15em] mb-1.5 ${result.blueprint.integrity.status === 'pristine' ? 'text-gray-400' : result.blueprint.integrity.status === 'broken' ? 'text-red-500' : 'text-orange-600'}`}>Valid Inventory</span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-black text-gray-900 leading-none tabular-nums">{inv.created}</span>
                            <span className="text-[12px] font-bold text-neutral-400">/ {inv.allowed} {inv.allowed === 1 ? 'Record' : 'Entries'}</span>
                        </div>
                    </div>
                    <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter shadow-sm border ${inv.status === 'at-capacity' ? 'bg-orange-50 text-orange-600 border-orange-100' : inv.status === 'over' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                        {inv.status === 'at-capacity' ? 'At Capacity' : inv.status === 'over' ? 'Limit Exceeded' : 'Healthy'}
                    </div>
                </div>
                
                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden relative z-10">
                    <div 
                        className={`h-full transition-all duration-1000 ease-out rounded-full ${inv.status === 'over' ? 'bg-red-500' : inv.status === 'at-capacity' ? 'bg-orange-500' : 'bg-emerald-500'}`}
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Registry Mismatch Warning Indicator */}
                {result.blueprint.integrity.total > result.blueprint.integrity.valid && (
                    <div className="mt-4 pt-4 border-t border-dashed border-gray-200 flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                            <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest">Ghost Placements Detected</span>
                        </div>
                        <span className="text-[10px] font-black text-gray-600 font-mono tracking-tighter">
                            {result.blueprint.integrity.total} Pointers in DB
                        </span>
                    </div>
                )}
            </div>

            {/* Technical Architecture Hub */}
            <div className="bg-neutral-50 rounded-[28px] p-4 mb-4 border border-gray-100 flex flex-col gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-[0.03] scale-125 rotate-12 text-gray-900 pointer-events-none">
                    <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                </div>

                {/* Governance Cluster: AUTHORITY & DISTRIBUTION */}
                <div className="relative z-10 flex flex-col gap-3 border-b border-gray-200 pb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Source Authority</span>
                            <div className="flex items-center gap-2">
                                <div className={`px-2 py-0.5 rounded-[4px] text-[9px] font-black uppercase ${result.blueprint.governance.sourceAuthority.editable ? 'bg-emerald-500 text-white shadow-[0_4px_10px_rgba(16,185,129,0.2)]' : 'bg-neutral-900 text-white'}`}>
                                    {result.blueprint.governance.sourceAuthority.label}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end text-right">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Distribution</span>
                            <div className={`px-2 py-0.5 rounded-[4px] text-[9px] font-black uppercase text-gray-900 border border-gray-200 bg-white`}>
                                {result.blueprint.governance.distribution.label}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Badges Row */}
                <div className="flex flex-wrap gap-1.5 relative z-10">
                    <ArchitectBadge label="Table" value={result.blueprint.tableName} color="bg-blue-50 text-blue-600 border-blue-100" />
                    {result.blueprint.variantName && <ArchitectBadge label="Variant" value={result.blueprint.variantName} color="bg-purple-50 text-purple-600 border-purple-100" />}
                </div>

                {/* Ownership Architecture */}
                {result.blueprint.governance.ownership.isShared && (
                    <div className="relative z-10 bg-[#F54927]/5 border border-[#F54927]/10 rounded-xl p-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#F54927] animate-pulse" />
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Shared Global Variable</span>
                        </div>
                        <span className="text-[10px] font-black text-[#F54927] uppercase tracking-tighter">Registry Sync</span>
                    </div>
                )}
            </div>

            {/* Footer Summary */}
            <div className="mt-auto pt-5 border-t border-gray-100 flex items-center justify-between group-hover:border-[#F54927]/20 transition-colors">
                <div className="flex flex-col min-w-0">
                    <span className="text-[11px] text-gray-300 font-black uppercase tracking-widest mb-1.5">Diagnostic Report</span>
                    <span className={`text-[13px] font-black tracking-tight truncate px-3 py-1.5 rounded-lg ${isError ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-emerald-50 text-emerald-600'}`}>
                        {result.details}
                    </span>
                </div>
                <div className="text-right shrink-0 ml-4">
                    <span className="text-[11px] text-gray-300 font-black uppercase tracking-widest mb-1.5 block">Admin Code</span>
                    <span className="text-[13px] font-mono font-black text-neutral-900 bg-neutral-100 px-3 py-1.5 rounded-lg border border-neutral-200">
                        {result.code}
                    </span>
                </div>
            </div>
        </div>
    );
}

function ArchitectBadge({ label, value, color }: { label: string, value: string, color: string }) {
    return (
        <div className={`flex items-center border rounded-lg overflow-hidden h-[26px] ${color}`}>
            <span className="px-2.5 text-[10px] font-black uppercase border-r opacity-60 border-current bg-white/30 h-full flex items-center">{label}</span>
            <span className="px-2.5 text-[11px] font-black tracking-tight h-full flex items-center">{value}</span>
        </div>
    );
}

function StatCircle({ label, value, color }: { label: string, value: string | number, color: string }) {
    return (
        <div className="flex flex-col">
            <span className="text-[10px] text-gray-300 font-bold uppercase tracking-[0.2em] mb-0.5">{label}</span>
            <span className={`text-[18px] font-black leading-none ${color}`}>{value}</span>
        </div>
    );
}
