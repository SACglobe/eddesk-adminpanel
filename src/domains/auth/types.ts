import { Database } from "@/lib/supabase/database.types";

export type AuthUser = {
    id: string;
    email: string;
} | null;

export type TableRow<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];

// ComponentRegistry defines what data table a component pulls from
export type ComponentRegistry = TableRow<'componentregistry'>;

export type ComponentPlacement = {
    key: string;
    schoolkey: string;
    templatecomponentkey: string;
    componentcode: string;
    contenttable: string;
    contentkey: string;
    displayorder: number;
    metadata: any;
    isactive: boolean;
};

// A single component assigned to a screen
export type TemplateComponent = TableRow<'templatecomponents'> & {
    componentcode?: string; // Often joined from registry
    componentregistry: ComponentRegistry | null;
    config: {
        group?: string;
        groupmode?: 'exclusive' | 'merged';
        variant?: string;
        itemcount?: string | number;
        datasource?: string;
        selectionmethod?: 'auto' | 'manual';
        [key: string]: unknown;
    } | null;
    parentscreenname?: string | null;
    contentplacements?: ComponentPlacement[];
};

// A screen (page) in the admin panel, with its nested components
export type TemplateScreen = TableRow<'templatescreens'> & {
    screenname?: string; // Often joined or aliased
    components: TemplateComponent[] | null;
};

// Full response from get_admin_initial_data RPC
export type AdminInitialData = {
    adminusers: TableRow<'adminusers'>;
    schools: TableRow<'schools'> & {
        componentvariants: Record<string, string>;
    };
    subscriptions: TableRow<'subscriptions'> | null;
    plans: TableRow<'plans'> | null;
    templates: TableRow<'templates'>;
    templatescreens: TemplateScreen[];
};
