import { TemplateComponent } from "@/domains/auth/types";

export function getEnrichedConfig(comp: TemplateComponent) {
    // Handle potential stringified config (defensive)
    const config = typeof comp.config === 'string' 
        ? JSON.parse(comp.config) 
        : (comp.config || {});
    
    // We prioritize what's explicitly in the DB config. 
    // We only provide a "group" and "groupmode" if they are already present in the config,
    // OR if the component is a 'hero' (our core grouping rule).
    
    let group = config.group || null;
    let groupmode = config.groupmode || null;
    
    const code = comp.componentcode?.toLowerCase() ?? '';
    const isHeroCode = code === 'hero' || code.startsWith('hero') || code === 'videohero' || code === 'herobanner' || code === 'heroslider' || code === 'herosection' || code === 'heroslide';
    if (!group && isHeroCode) {
        group = 'hero';
        groupmode = 'exclusive';
    }

    return {
        ...config,
        group,
        groupmode,
        variant: config.variant || null
    };
}
