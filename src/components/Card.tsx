/**
 * Card réutilisable — design luxueux avec coins arrondis 16px
 */

import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { useTheme } from '../contexts';
import { Spacing, Shadows } from '../constants';

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'outlined' | 'gold';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  variant = 'default',
}) => {
  const { colors } = useTheme();

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return { ...Shadows.medium };
      case 'outlined':
        return { borderWidth: 1, borderColor: colors.border };
      case 'gold':
        return { ...Shadows.small, borderWidth: 1, borderColor: colors.secondary + '40' };
      default:
        return { ...Shadows.small };
    }
  };

  const cardStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: Spacing.radiusLg,
    padding: Spacing.cardPadding,
    ...getVariantStyle(),
    ...style,
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          cardStyle,
          pressed && styles.pressed,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
});

export default Card;
