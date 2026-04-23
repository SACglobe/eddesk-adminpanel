import { createClient } from "./client";

export type StorageCategory = "events" | "achievements" | "students" | "banners" | "schoolachievements" | "leadership" | "schoolidentity" | "school-branding" | "gallery" | "principal" | "infrastructure" | "faculty" | "testimonials" | "activities" | "academics";

/**
 * Uploads a file to Supabase Storage with a structured path.
 * Path format: media/{schoolkey}/{category}/{filename}
 */
export async function uploadFile(
    file: File,
    schoolKey: string,
    category: StorageCategory
): Promise<string> {
    const supabase = createClient();

    // Create a unique filename to avoid collisions
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `${schoolKey}/${category}/${fileName}`;

    const { data, error } = await supabase.storage
        .from("media")
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        throw new Error(`Upload failed: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
        .from("media")
        .getPublicUrl(filePath);

    return publicUrl;
}
