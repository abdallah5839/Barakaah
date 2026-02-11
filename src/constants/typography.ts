/**
 * Constantes de typographie pour l'application Sakina
 */

export const Typography = {
  // Tailles de police
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },

  // Poids de police
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  // Hauteur de ligne
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  },
} as const;

// Styles de texte prédéfinis
export const TextStyles = {
  // Titres
  h1: {
    fontSize: Typography.sizes['3xl'],
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.sizes['3xl'] * Typography.lineHeights.tight,
  },
  h2: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.sizes['2xl'] * Typography.lineHeights.tight,
  },
  h3: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.semibold,
    lineHeight: Typography.sizes.xl * Typography.lineHeights.tight,
  },

  // Corps de texte
  body: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.regular,
    lineHeight: Typography.sizes.md * Typography.lineHeights.normal,
  },
  bodySmall: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
    lineHeight: Typography.sizes.sm * Typography.lineHeights.normal,
  },

  // Labels
  label: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    lineHeight: Typography.sizes.sm * Typography.lineHeights.normal,
  },

  // Texte arabe (taille plus grande pour lisibilité)
  arabic: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.regular,
    lineHeight: Typography.sizes['2xl'] * Typography.lineHeights.loose,
  },
  arabicLarge: {
    fontSize: Typography.sizes['3xl'],
    fontWeight: Typography.weights.regular,
    lineHeight: Typography.sizes['3xl'] * Typography.lineHeights.loose,
  },
} as const;
