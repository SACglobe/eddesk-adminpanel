export type AuthUser = {
    id: string;
    email: string;
};

// ComponentRegistry defines what data table a component pulls from
export type ComponentRegistry = {
    key: string;
    componentcode: string;
    componentname: string;
    tablename: string;
    [key: string]: unknown;
};

// A single component assigned to a screen
export type TemplateComponent = {
    key: string;
    componentcode: string;
    displayorder?: number;
    componentregistry: ComponentRegistry | null;
    [key: string]: unknown;
};

// A screen (page) in the admin panel, with its nested components
export type TemplateScreen = {
    key: string;
    screenslug: string;
    screenname?: string;
    route?: string;
    displayorder?: number;
    components: TemplateComponent[] | null;
    [key: string]: unknown;
};

// Full response from get_admin_initial_data RPC
export type AdminInitialData = {
    adminusers: Record<string, unknown>;
    schools: Record<string, unknown>;
    subscriptions: Record<string, unknown> | null;
    plans: Record<string, unknown> | null;
    templates: Record<string, unknown>;
    templatescreens: TemplateScreen[];
};
