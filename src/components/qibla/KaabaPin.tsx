/**
 * KaabaPin — Spatial Kaaba marker for AR Qibla mode.
 * Precision circle (color-coded), validation progress arc,
 * Kaaba icon with glow, checkmark on validation success.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, {
  Circle as SvgCircle,
  Path,
  Defs,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

const GOLD = '#D4AF37';

// Dimensions
const SVG_SIZE = 160;
const CENTER = SVG_SIZE / 2;
const PRECISION_R = 62;
const VALIDATION_R = 48;
const VALIDATION_STROKE = 7;
const ICON_SIZE = 52;

interface KaabaPinProps {
  /** Absolute offset from Qibla in degrees */
  offset: number;
  /** Validation progress 0-100 */
  validationProgress: number;
  /** Whether direction has been validated */
  isValidated: boolean;
  /** Distance to Kaaba in km */
  distance: number;
}

const getCircleColor = (offset: number): string => {
  if (offset < 5) return '#4CAF50';
  if (offset < 15) return '#FFC107';
  return '#F44336';
};

/** SVG arc path: starts at 12 o'clock, sweeps clockwise to `pct`% */
const buildArc = (pct: number, r: number, cx: number, cy: number): string => {
  if (pct <= 0) return '';
  const p = Math.min(pct, 99.9);
  const a = (p / 100) * 2 * Math.PI;
  const ex = cx + r * Math.sin(a);
  const ey = cy - r * Math.cos(a);
  return `M ${cx} ${cy - r} A ${r} ${r} 0 ${p > 50 ? 1 : 0} 1 ${ex} ${ey}`;
};

export const KaabaPin: React.FC<KaabaPinProps> = React.memo(({
  offset,
  validationProgress,
  isValidated,
  distance,
}) => {
  const aligned = offset < 5;
  const color = getCircleColor(offset);
  const showArc = validationProgress > 0;

  // --- Pulse animation ---
  const pulse = useRef(new Animated.Value(1)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    loopRef.current?.stop();

    if (isValidated) {
      // Success burst → gentle sustained pulse
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.22, duration: 150, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        loopRef.current = Animated.loop(
          Animated.sequence([
            Animated.timing(pulse, { toValue: 1.06, duration: 900, useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
          ]),
        );
        loopRef.current.start();
      });
    } else if (aligned) {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.12, duration: 600, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      );
      loopRef.current.start();
    } else {
      pulse.setValue(1);
    }

    return () => { loopRef.current?.stop(); };
  }, [aligned, isValidated]);

  // --- Checkmark spring animation ---
  const checkScale = useRef(new Animated.Value(0)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isValidated) {
      Animated.parallel([
        Animated.spring(checkScale, { toValue: 1, tension: 120, friction: 8, useNativeDriver: true }),
        Animated.timing(checkOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      checkScale.setValue(0);
      checkOpacity.setValue(0);
    }
  }, [isValidated]);

  return (
    <Animated.View style={[styles.root, { transform: [{ scale: pulse }] }]}>
      {/* SVG: precision circle + validation arc + glow */}
      <View style={styles.svgWrap}>
        <Svg width={SVG_SIZE} height={SVG_SIZE}>
          {/* Radial glow when aligned */}
          {aligned && (
            <>
              <Defs>
                <RadialGradient id="pinGlow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor={color} stopOpacity="0.2" />
                  <Stop offset="100%" stopColor={color} stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <SvgCircle cx={CENTER} cy={CENTER} r={PRECISION_R + 14} fill="url(#pinGlow)" />
            </>
          )}

          {/* Precision circle (outer) */}
          <SvgCircle
            cx={CENTER}
            cy={CENTER}
            r={PRECISION_R}
            stroke={color}
            strokeWidth={2.5}
            fill="none"
            opacity={0.7}
          />

          {/* Validation track (inner, subtle) */}
          {showArc && (
            <SvgCircle
              cx={CENTER}
              cy={CENTER}
              r={VALIDATION_R}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth={VALIDATION_STROKE}
              fill="none"
            />
          )}

          {/* Validation progress arc */}
          {showArc && validationProgress > 0 && (
            validationProgress >= 99.9 ? (
              <SvgCircle
                cx={CENTER}
                cy={CENTER}
                r={VALIDATION_R}
                stroke={isValidated ? '#4CAF50' : GOLD}
                strokeWidth={VALIDATION_STROKE}
                fill="none"
              />
            ) : (
              <Path
                d={buildArc(validationProgress, VALIDATION_R, CENTER, CENTER)}
                stroke={GOLD}
                strokeWidth={VALIDATION_STROKE}
                strokeLinecap="round"
                fill="none"
              />
            )
          )}
        </Svg>

        {/* Kaaba icon (centered on SVG) */}
        <View style={[styles.icon, isValidated && styles.iconValidated]}>
          {isValidated ? (
            <Animated.View style={{ transform: [{ scale: checkScale }], opacity: checkOpacity }}>
              <Ionicons name="checkmark" size={28} color="#FFF" />
            </Animated.View>
          ) : (
            <Text style={styles.emoji}>🕋</Text>
          )}
        </View>
      </View>

      {/* Distance label */}
      <View style={styles.distBadge}>
        <Text style={styles.distText}>{distance.toLocaleString()} km</Text>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
  },
  svgWrap: {
    width: SVG_SIZE,
    height: SVG_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    position: 'absolute',
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  iconValidated: {
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
  },
  emoji: {
    fontSize: 26,
  },
  distBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 6,
  },
  distText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
