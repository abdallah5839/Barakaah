/**
 * AboutScreen - Page À propos de l'application
 * Informations, crédits et liens
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  Linking,
  Share,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography, Shadows } from '../constants';

// Couleurs
const Colors = {
  light: {
    primary: '#059669',
    secondary: '#D4AF37',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    text: '#1A1A1A',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
  },
  dark: {
    primary: '#10B981',
    secondary: '#FBBF24',
    background: '#0F172A',
    surface: '#1E293B',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    border: '#334155',
  },
};

const APP_VERSION = '1.0.0';

interface AboutScreenProps {
  navigation?: any;
  isDark?: boolean;
}

export const AboutScreen: React.FC<AboutScreenProps> = ({ navigation, isDark = false }) => {
  const colors = isDark ? Colors.dark : Colors.light;

  // Retour
  const goBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  // Partager l'app
  const handleShare = async () => {
    try {
      await Share.share({
        title: 'Sakina - Application Islamique',
        message:
          'Découvrez Sakina, une application islamique complète. Coran, Duas, horaires de prière et plus encore !\n\nTéléchargez-la maintenant !',
      });
    } catch (error) {
      console.error('Erreur partage:', error);
    }
  };

  // Ouvrir lien
  const openLink = (url: string) => {
    Linking.openURL(url).catch((err) => console.error('Erreur ouverture lien:', err));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={goBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>À propos</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Logo et Nom */}
        <View style={styles.logoSection}>
          <Image source={require('../../assets/logo.png')} style={styles.logoImage} />
          <Text style={[styles.appName, { color: colors.text }]}>Sakina</Text>
          <Text style={[styles.appTagline, { color: colors.textSecondary }]}>
            سكينة - Quiétude
          </Text>
          <View style={[styles.versionBadge, { backgroundColor: colors.surface }]}>
            <Text style={[styles.versionText, { color: colors.textSecondary }]}>
              Version {APP_VERSION}
            </Text>
          </View>
        </View>

        {/* Description */}
        <View style={[styles.descriptionCard, { backgroundColor: colors.surface }, Shadows.small]}>
          <Text style={[styles.descriptionText, { color: colors.text }]}>
            Sakina est une application islamique complète.
            Elle offre un accès au Saint Coran avec traduction, une collection de Duas
            authentiques, les horaires de prière précis, et de nombreuses autres fonctionnalités
            pour accompagner votre pratique spirituelle quotidienne.
          </Text>
        </View>

        {/* Fonctionnalités */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Fonctionnalités</Text>
          <View style={[styles.featuresCard, { backgroundColor: colors.surface }, Shadows.small]}>
            <FeatureItem
              icon="book"
              title="Saint Coran"
              description="114 sourates avec traduction française et phonétique"
              color={colors.primary}
              textColor={colors.text}
              textSecondaryColor={colors.textSecondary}
            />
            <FeatureItem
              icon="hand-left"
              title="Duas & Invocations"
              description="Collection de prières authentiques"
              color={colors.secondary}
              textColor={colors.text}
              textSecondaryColor={colors.textSecondary}
            />
            <FeatureItem
              icon="time"
              title="Horaires de Prière"
              description="Calcul précis selon la méthode Jafari"
              color="#3B82F6"
              textColor={colors.text}
              textSecondaryColor={colors.textSecondary}
            />
            <FeatureItem
              icon="compass"
              title="Direction Qibla"
              description="Boussole interactive vers la Mecque"
              color="#8B5CF6"
              textColor={colors.text}
              textSecondaryColor={colors.textSecondary}
            />
            <FeatureItem
              icon="calendar"
              title="Calendrier Hijri"
              description="Dates importantes et événements islamiques"
              color="#EC4899"
              textColor={colors.text}
              textSecondaryColor={colors.textSecondary}
            />
            <FeatureItem
              icon="moon"
              title="Mode Ramadan"
              description="Suivi du jeûne et compteur spécial"
              color="#F59E0B"
              textColor={colors.text}
              textSecondaryColor={colors.textSecondary}
              isLast
            />
          </View>
        </View>

        {/* Crédits */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Crédits</Text>
          <View style={[styles.creditsCard, { backgroundColor: colors.surface }, Shadows.small]}>
            <CreditItem
              title="Récitation du Coran"
              value="Mishary Rashid Al-Afasy"
              color={colors.text}
              secondaryColor={colors.textSecondary}
            />
            <CreditItem
              title="Traduction française"
              value="Diverses sources authentiques"
              color={colors.text}
              secondaryColor={colors.textSecondary}
            />
            <CreditItem
              title="Audio des Duas"
              value="Haj Hassan Ismaïl"
              color={colors.text}
              secondaryColor={colors.textSecondary}
            />
            <CreditItem
              title="Calcul des prières"
              value="Bibliothèque Adhan"
              color={colors.text}
              secondaryColor={colors.textSecondary}
              isLast
            />
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Pressable
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={handleShare}
          >
            <Ionicons name="share-social" size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Partager l'application</Text>
          </Pressable>

          <Pressable
            style={[styles.actionButtonOutline, { borderColor: colors.border }]}
            onPress={() => openLink('mailto:abdallahsabbah21@gmail.com')}
          >
            <Ionicons name="mail" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonOutlineText, { color: colors.text }]}>
              Nous contacter
            </Text>
          </Pressable>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Développé avec ❤️ pour la communauté
          </Text>
          <Text style={[styles.footerCopyright, { color: colors.textSecondary }]}>
            © 2026 Sakina. Tous droits réservés.
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

// Composant Feature
interface FeatureItemProps {
  icon: string;
  title: string;
  description: string;
  color: string;
  textColor: string;
  textSecondaryColor: string;
  isLast?: boolean;
}

const FeatureItem: React.FC<FeatureItemProps> = ({
  icon,
  title,
  description,
  color,
  textColor,
  textSecondaryColor,
  isLast,
}) => (
  <View style={[styles.featureItem, !isLast && styles.featureItemBorder]}>
    <View style={[styles.featureIcon, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon as any} size={20} color={color} />
    </View>
    <View style={styles.featureContent}>
      <Text style={[styles.featureTitle, { color: textColor }]}>{title}</Text>
      <Text style={[styles.featureDescription, { color: textSecondaryColor }]}>
        {description}
      </Text>
    </View>
  </View>
);

// Composant Credit
interface CreditItemProps {
  title: string;
  value: string;
  color: string;
  secondaryColor: string;
  isLast?: boolean;
}

const CreditItem: React.FC<CreditItemProps> = ({
  title,
  value,
  color,
  secondaryColor,
  isLast,
}) => (
  <View style={[styles.creditItem, !isLast && styles.creditItemBorder]}>
    <Text style={[styles.creditTitle, { color: secondaryColor }]}>{title}</Text>
    <Text style={[styles.creditValue, { color }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  logoSection: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 25,
    marginBottom: Spacing.lg,
  },
  appName: {
    fontSize: Typography.sizes['3xl'],
    fontWeight: Typography.weights.bold,
  },
  appTagline: {
    fontSize: Typography.sizes.lg,
    marginTop: Spacing.xs,
  },
  versionBadge: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.radiusFull,
  },
  versionText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  descriptionCard: {
    marginHorizontal: Spacing.screenHorizontal,
    padding: Spacing.lg,
    borderRadius: Spacing.radiusLg,
  },
  descriptionText: {
    fontSize: Typography.sizes.md,
    lineHeight: Typography.sizes.md * 1.6,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: Spacing.screenHorizontal,
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.md,
  },
  featuresCard: {
    borderRadius: Spacing.radiusLg,
    overflow: 'hidden',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  featureItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  featureDescription: {
    fontSize: Typography.sizes.sm,
    marginTop: 2,
  },
  creditsCard: {
    borderRadius: Spacing.radiusLg,
    overflow: 'hidden',
  },
  creditItem: {
    padding: Spacing.md,
  },
  creditItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  creditTitle: {
    fontSize: Typography.sizes.sm,
    marginBottom: Spacing.xs,
  },
  creditValue: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: Spacing.radiusMd,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  actionButtonOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: Spacing.radiusMd,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  actionButtonOutlineText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  footer: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.screenHorizontal,
  },
  footerText: {
    fontSize: Typography.sizes.sm,
    marginBottom: Spacing.xs,
  },
  footerCopyright: {
    fontSize: Typography.sizes.xs,
  },
  bottomSpacer: {
    height: Spacing['4xl'],
  },
});

export default AboutScreen;
