/**
 * Palette de couleurs pour l'application Barakaah
 * Direction artistique : moderne luxueux avec touches islamiques subtiles
 * Mode Clair et Mode Sombre
 */

export const Colors = {
  light: {
    // Verts principaux
    primary: '#16a34a',        // Vert principal — boutons, accents, éléments actifs
    primaryDark: '#166534',    // Vert foncé — textes importants, headers
    primaryLight: '#dcfce7',   // Vert très clair — fonds subtils
    primarySoft: '#bbf7d0',    // Vert doux

    // Dorés — touches luxueuses
    secondary: '#D4AF37',      // Doré principal — ornements, icônes spéciales
    secondaryLight: '#F4E4BA', // Doré clair — fonds subtils, highlights
    secondaryDark: '#B8960C',  // Doré foncé

    // Surfaces
    background: '#FFFFFF',     // Fond principal blanc
    backgroundSoft: '#F9FAFB', // Fond blanc cassé
    surface: '#F9FAFB',        // Fond des cartes
    surfaceElevated: '#FFFFFF',// Cartes élevées

    // Textes
    text: '#1F2937',           // Texte principal (noir doux)
    textSecondary: '#6B7280',  // Texte secondaire
    textMuted: '#9CA3AF',      // Texte très discret

    // Bordures et séparateurs
    border: '#E5E7EB',         // Bordures standard
    borderLight: '#F3F4F6',    // Séparateurs très légers
    separator: '#F3F4F6',      // Séparateurs de fond

    // Accents
    accent: '#1E3A8A',         // Bleu nuit
    error: '#DC2626',          // Rouge erreur
    success: '#16a34a',        // Vert succès

    // Prochaine prière
    prayerGradientStart: '#16a34a',
    prayerGradientEnd: '#166534',
    prayerUrgentStart: '#EA580C',
    prayerUrgentEnd: '#C2410C',

    // Ramadan
    ramadanGradientStart: '#7C3AED',
    ramadanGradientEnd: '#5B21B6',

    // Qibla
    qiblaGradientStart: '#0891B2',
    qiblaGradientEnd: '#0E7490',
  },
  dark: {
    // Verts principaux
    primary: '#22c55e',
    primaryDark: '#16a34a',
    primaryLight: '#052e16',
    primarySoft: '#14532d',

    // Dorés
    secondary: '#FBBF24',
    secondaryLight: '#78350F',
    secondaryDark: '#F59E0B',

    // Surfaces
    background: '#0F172A',
    backgroundSoft: '#1E293B',
    surface: '#1E293B',
    surfaceElevated: '#334155',

    // Textes
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',

    // Bordures
    border: '#334155',
    borderLight: '#1E293B',
    separator: '#1E293B',

    // Accents
    accent: '#3B82F6',
    error: '#EF4444',
    success: '#22c55e',

    // Prière
    prayerGradientStart: '#22c55e',
    prayerGradientEnd: '#16a34a',
    prayerUrgentStart: '#F97316',
    prayerUrgentEnd: '#EA580C',

    // Ramadan
    ramadanGradientStart: '#8B5CF6',
    ramadanGradientEnd: '#6D28D9',

    // Qibla
    qiblaGradientStart: '#06B6D4',
    qiblaGradientEnd: '#0891B2',
  },
} as const;

export type ThemeColors = typeof Colors.light;
export type ThemeMode = 'light' | 'dark';
