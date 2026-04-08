"use client";

import React from 'react';

// Base URL for Microsoft Fluent Emojis (3D versions)
const FLUENT_BASE_URL = "https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji/assets/";

// Curated mapping of common icons to their Fluent Emoji assets
// Using the "3D" style for the premium look requested by the user
export const FLUENT_ICONS: Record<string, string> = {
    // Education & Learning
    "abacus": "Abacus/3D/abacus_3d.png",
    "backpack": "Backpack/3D/backpack_3d.png",
    "books": "Books/3D/books_3d.png",
    "bookmark": "Bookmark/3D/bookmark_3d.png",
    "bookmark-tabs": "Bookmark%20tabs/3D/bookmark_tabs_3d.png",
    "compass": "Compass/3D/compass_3d.png",
    "computer": "Desktop%20computer/3D/desktop_computer_3d.png",
    "graduation": "Graduation%20cap/3D/graduation_cap_3d.png",
    "laptop": "Laptop/3D/laptop_3d.png",
    "memo": "Memo/3D/memo_3d.png",
    "notebook": "Notebook/3D/notebook_3d.png",
    "paperclip": "Paperclip/3D/paperclip_3d.png",
    "pen": "Pen/3D/pen_3d.png",
    "pencil": "Pencil/3D/pencil_3d.png",
    "ruler": "Straight%20ruler/3D/straight_ruler_3d.png",
    "school": "School/3D/school_3d.png",
    "spiral-notepad": "Spiral%20notepad/3D/spiral_notepad_3d.png",
    "student": "Man%20student/Default/3D/man_student_3d_default.png",
    "teacher": "Man%20teacher/Default/3D/man_teacher_3d_default.png",
    "graduation-cap": "Graduation%20cap/3D/graduation_cap_3d.png",
    "certificate": "Scroll/3D/scroll_3d.png",
    "briefcase": "Briefcase/3D/briefcase_3d.png",

    // Achievements & Awards
    "medal-1": "1st%20place%20medal/3D/1st_place_medal_3d.png",
    "medal-2": "2nd%20place%20medal/3D/2nd_place_medal_3d.png",
    "medal-3": "3rd%20place%20medal/3D/3rd_place_medal_3d.png",
    "trophy": "Trophy/3D/trophy_3d.png",
    "star": "Star/3D/star_3d.png",
    "medal": "1st%20place%20medal/3D/1st_place_medal_3d.png",
    "target": "Bullseye/3D/bullseye_3d.png",
    "sparkles": "Sparkles/3D/sparkles_3d.png",

    // Sports & Activities
    "basketball": "Basketball/3D/basketball_3d.png",
    "football": "American%20football/3D/american_football_3d.png",
    "soccer": "Soccer%20ball/3D/soccer_ball_3d.png",
    "tennis": "Tennis/3D/tennis_3d.png",
    "volleyball": "Volleyball/3D/volleyball_3d.png",
    "baseball": "Baseball/3D/baseball_3d.png",
    "ping-pong": "Ping%20pong/3D/ping_pong_3d.png",
    "bowling": "Bowling/3D/bowling_3d.png",
    "skate": "Ice%20skate/3D/ice_skate_3d.png",
    "bicycle": "Person%20biking/Default/3D/person_biking_3d_default.png",
    "running": "Man%20running/Default/3D/man_running_3d_default.png",
    "swimming": "Person%20swimming/Default/3D/person_swimming_3d_default.png",

    // Science & Tech
    "atom": "Atom%20symbol/3D/atom_symbol_3d.png",
    "dna": "DNA/3D/dna_3d.png",
    "microscope": "Microscope/3D/microscope_3d.png",
    "telescope": "Telescope/3D/telescope_3d.png",
    "test-tube": "Test%20tube/3D/test_tube_3d.png",
    "petri-dish": "Petri%20dish/3D/petri_dish_3d.png",
    "magnet": "Magnet/3D/magnet_3d.png",
    "brain": "Brain/3D/brain_3d.png",
    "rocket": "Rocket/3D/rocket_3d.png",
    "satellite": "Satellite/3D/satellite_3d.png",
    "bulb": "Light%20bulb/3D/light_bulb_3d.png",
    "microbe": "Microbe/3D/microbe_3d.png",

    // Arts & Music
    "palette": "Artist%20palette/3D/artist_palette_3d.png",
    "camera": "Camera/3D/camera_3d.png",
    "video": "Movie%20camera/3D/movie_camera_3d.png",
    "microphone": "Microphone/3D/microphone_3d.png",
    "studio-mic": "Studio%20microphone/3D/studio_microphone_3d.png",
    "guitar": "Guitar/3D/guitar_3d.png",
    "piano": "Musical%20keyboard/3D/musical_keyboard_3d.png",
    "violin": "Violin/3D/violin_3d.png",
    "trumpet": "Trumpet/3D/trumpet_3d.png",
    "drum": "Long%20drum/3D/long_drum_3d.png",
    "music": "Musical%20note/3D/musical_note_3d.png",
    "musical-notes": "Musical%20notes/3D/musical_notes_3d.png",
    "headphones": "Headphone/3D/headphone_3d.png",

    // Infrastructure & Campus
    "bus": "Bus/3D/bus_3d.png",
    "building": "Office%20building/3D/office_building_3d.png",
    "classical-building": "Classical%20building/3D/classical_building_3d.png",
    "stadium": "Stadium/3D/stadium_3d.png",
    "house": "House/3D/house_3d.png",
    "bell": "Bell/3D/bell_3d.png",
    "calendar": "Calendar/3D/calendar_3d.png",
    "clock": "Mantelpiece%20clock/3D/mantelpiece_clock_3d.png",
    "flag": "Triangular%20flag/3D/triangular_flag_3d.png",
    "globe": "Globe%20showing%20americas/3D/globe_showing_americas_3d.png",
    "world": "Globe%20with%20meridians/3D/globe_with_meridians_3d.png",
    "map": "World%20map/3D/world_map_3d.png",
    "compass-alt": "Compass/3D/compass_3d.png",

    // Common UI & Objects
    "heart": "Red%20heart/3D/red_heart_3d.png",
    "fire": "Fire/3D/fire_3d.png",
    "shield": "Shield/3D/shield_3d.png",
    "search": "Magnifying%20glass%20tilted%20left/3D/magnifying_glass_tilted_left_3d.png",
    "lock": "Locked/3D/locked_3d.png",
    "key": "Key/3D/key_3d.png",
    "gift": "Wrapped%20gift/3D/wrapped_gift_3d.png",
    "chart": "Chart%20increasing/3D/chart_increasing_3d.png",
    "money": "Money%20bag/3D/money_bag_3d.png",
    "link": "Link/3D/link_3d.png",
    "sun": "Sun/3D/sun_3d.png",
    "moon": "First%20quarter%20moon/3D/first_quarter_moon_3d.png",
    "cloud": "Cloud/3D/cloud_3d.png",
    "earth": "Globe%20showing%20americas/3D/globe_showing_americas_3d.png"
};

interface FluentIconProps {
    name: string; // "sparkles", "earth", etc.
    size?: number;
    className?: string;
    style?: React.CSSProperties;
}

const FluentIcon = ({ name, size = 24, className = "", style = {} }: FluentIconProps) => {
    // Remove the "fluent:" prefix if exists
    const iconKey = name.replace("fluent:", "");
    const assetPath = FLUENT_ICONS[iconKey];

    if (!assetPath) {
        // Fallback to a help/question icon if not found
        const fallbackUrl = `${FLUENT_BASE_URL}Question%20Mark/3D/question_mark_3d.png`;
        return (
            <img 
                src={fallbackUrl}
                alt={name}
                width={size}
                height={size}
                className={className}
                style={{ ...style, objectFit: 'contain' }}
            />
        );
    }

    const iconUrl = `${FLUENT_BASE_URL}${assetPath}`;

    return (
        <img 
            src={iconUrl}
            alt={name}
            width={size}
            height={size}
            className={className}
            style={{ ...style, objectFit: 'contain' }}
            onError={(e) => {
                // If the 3D version fails, fallback to something else or hide it
                (e.target as HTMLImageElement).src = `${FLUENT_BASE_URL}Warning/3D/warning_3d.png`;
            }}
        />
    );
};

export default FluentIcon;
