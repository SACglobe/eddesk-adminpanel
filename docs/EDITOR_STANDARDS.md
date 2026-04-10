# EdDesk Editor Standards & Guidelines

This document defines the mandatory UI/UX standards for all component editors within the EdDesk Admin Panel. **Antigravity** must follow these rules strictly when creating or refactoring any editor.

## 1. Modal Architecture

### The Premium Split-View (Flagship)
For high-impact components (Hero, Academics, Faculty, Vision), always use the **Split-View Modal**.
- **Width**: `max-w-[1000px]`
- **Rounding**: `rounded-[48px]`
- **Structure**:
    - **Left Panel**: Live-preview card or visualization (`w-[380px]`, `bg-gray-50/50`).
    - **Right Panel**: Scrollable form fields (`flex-1`, `p-12`).
- **Header**: Large title (`text-[20px] font-black`), uppercase tracking-widest subtitle (`text-[12px] font-bold text-gray-400`).

## 2. Card Design Standards

### Profile & Listing Cards (Faculty, Board, Academics)
- **Geometry**: `rounded-[32px]`, `bg-white`, `border-gray-100`, `shadow-sm`, `hover:shadow-xl`.
- **Dimensions**:
    - **Academics**: `min-h-[300px]`.
    - **Profiles (Faculty/Board)**: `min-h-[280px]`, `p-6 pb-8`.
- **Hierarchy**: **Name First** (`text-[16px] font-black`), then **Designation** (`text-[10px] uppercase text-[#F54927]`).
- **Icons**:
    - Circular avatars for profiles (`w-24 h-24`, `border-4 border-gray-50`).
    - Square/rounded-rect icons for services.
- **Interactions & Effects**:
    - **Floating Pen Icon (MANDATORY)**: All card-based editors **must** use a floating pen icon overlay for edit actions. Text buttons (e.g., "Edit Details") on cards are strictly prohibited.
        - **Style**: `p-3 bg-white rounded-2xl shadow-2xl border border-gray-100` (Elegant Square).
        - **Icon**: `lucide-react` or SVG (Width: 2.5) Pen icon, `w-5 h-5`.
        - **Behavior**: `absolute top-6 right-6` (or `top-4 right-4` for smaller cards), `opacity-0 group-hover:opacity-100 transition-all duration-300`, `active:scale-90`.
    - **Shadow System**: Base `shadow-sm`, upgrade to `hover:shadow-2xl` on interaction. Use tinted shadows (e.g., `hover:shadow-red-500/10`) to match brand or category colors.
    - **Transitions**: Mandatory `transition-all duration-300` for all hover states.

## 3. Input & Form Controls

### Standard Input Tokens
- **Background**: `bg-neutral-50/80`.
- **Rounding**: `rounded-[24px]` for text inputs, `rounded-[32px]` for textareas.
- **Typography**: `text-[15px] font-bold`.
- **Focus State**: `border-2 border-[#F54927]` (Brand Orange).
- **Labels**: `text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1 mb-2`.

### Action Buttons
- **Primary (Save/Update)**: `bg-neutral-950 text-white rounded-[20px]`, `hover:bg-black`, `font-black`, `h-[60px]`.
- **Secondary (Cancel/Delete)**: Neutral/Ghost styles, avoid heavy gradients.
- **Icon Buttons**: Use `lucide-react` with `active:scale-95` transitions.

## 4. Component Gallery Patterns

### Bulletin Types
- **Bulletin Text with Image**: Cinematic split layout with high-quality media upload.
- **Bulletin Text with Icon**: Service-style cards with standardized icon containers.

### Media Handling
- **Image**: Use circular headshots for profiles, `aspect-ratio: square` for grid content.
- **Video**: Implement autoplay, muted, inline previews for video-capable slots.

## 5. Standard Icon Component Schema (Benchmarked to Why Choose Us)

For components featuring a list of features, services, or highlights with icons (e.g., Why Choose Us, Highlighted Infrastructure), follow these rules:

### Card Design
- **Icon Container**: Center the icon in a `w-16 h-16` rounded-2xl box.
- **Background**: Use a tinted version of the icon's color (15% opacity). Example: `style={{ backgroundColor: color + '15' }}`.
- **Hover**: Scale the icon (`group-hover:scale-110`) and upgrade the shadow to `hover:shadow-red-500/10`.

### Editor Dialog (Compact Architecture)
- **Width**: `max-w-lg` (Single column vertical stack).
- **Layout**: No split-view. Top-to-bottom flow of fields: Title, Description, Icon Picker, Color Picker.
- **Footer**:
    - **Delete**: Left-aligned, red text ghost button.
    - **Cancel/Save**: Right-aligned. Save button: `px-10 py-3.5 bg-neutral-950`.

## 6. Global Rationale
- **Consistency is Premium**: If a user learns how to use the Hero editor, they should immediately understand the Faculty editor.
- **No Placeholders**: Always use real sample data and premium icons.
- **Whitespace**: Use generous padding (`p-10/p-12`) in modals to create a "breathable" high-end feel.

## 7. Data & Configuration Handling

### Configuration Initialization
- **Safe Parsing**: Always use the `getEnrichedConfig(component.config)` utility. This ensures stringified JSON from the database is properly parsed before use.
- **Filter Enforcement**: Strictly adhere to `config.filters`. If a component is configured for a specific `contenttype` (e.g., "bulletintextwithimage"), ensure all queries and new records strictly follow this constraint.
- **Display Order Matters**: All component data **must be sorted** by `displayorder` (ASC) before rendering. Ensure new records are assigned the next correct `displayorder` to maintain the user's intended sequence.

### Intelligent UI Refinement
- **Conditional Visibility**: If `config.itemcount === 1`, automatically **hide** the "Display Order" input field in modals. Position selection is redundant for single-item components.
- **Fixed Slot Management**: Prefer mapping records to a fixed number of slots based on `itemcount` (using `displayorder` as the mapping key) rather than providing an "Add" button, unless the component explicitly supports dynamic growth.


