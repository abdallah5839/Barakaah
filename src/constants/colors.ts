/**
 * Palette de couleurs pour l'application Barakaah
 * Mode Clair et Mode Sombre
 */

export const Colors = {
  light: {
    primary: '#059669',      // Vert émeraude
    secondary: '#D4AF37',    // Or
    background: '#FAFAFA',   // Fond principal
    surface: '#FFFFFF',      // Surface des cards
    text: '#1A1A1A',         // Texte principal
    textSecondary: '#6B7280', // Texte secondaire
    border: '#E5E7EB',       // Bordures
    accent: '#1E3A8A',       // Bleu nuit
    error: '#DC2626',        // Rouge erreur
    success: '#059669',      // Vert succès
  },
  dark: {
    primary: '#10B981',      // Vert émeraude (plus clair pour dark mode)
    secondary: '#FBBF24',    // Or (plus clair pour dark mode)
    background: '#0F172A',   // Fond principal sombre
    surface: '#1E293B',      // Surface des cards sombre
    text: '#F1F5F9',         // Texte principal clair
    textSecondary: '#94A3B8', // Texte secondaire
    border: '#334155',       // Bordures sombres
    accent: '#3B82F6',       // Bleu
    error: '#EF4444',        // Rouge erreur
    success: '#10B981',      // Vert succès
  },
} as const;

export type ThemeColors = typeof Colors.light;
export type ThemeMode = 'light' | 'dark';
