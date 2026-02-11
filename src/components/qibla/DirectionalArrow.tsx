/**
 * DirectionalArrow — SVG directional arrow overlay for AR Qibla mode.
 * Gold gradient arrow with precision circle that changes color based on alignment.
 * Animated rotation + pulse when aligned.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Svg, {
  Polygon,
  Circle as SvgCircle,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';

const ARROW_SIZE = 160;
const CIRCLE_SIZE = 180;

interface DirectionalArrowProps {
  /** Rotation in degrees (qiblaAngle - deviceHeading) */
  rotation: number;
  /** Absolute offset from Qibla in degrees (0-180) */
  offset: number;
}

const getCircleColor = (offset: number): string => {
  if (offset < 5) return '#4CAF50';    // Green — aligned
  if (offset < 15) return '#FFC107';   // Yellow — close
  return '#F44336';                     // Red — off
};

const getCircleOpacity = (offset: number): number => {
  if (offset < 5) return 0.8;
  if (offset < 15) return 0.6;
  return 0.4;
};

const AnimatedSvgCircle = Animated.createAnimatedComponent(SvgCircle);

export const DirectionalArrow: React.FC<DirectionalArrowProps> = React.memo(({ rotation, offset }) => {
  const rotateAnim = useRef(new Animated.Value(rotation)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);
  const isAligned = offset < 5;

  // Smooth rotation with spring physics
  useEffect(() => {
    Animated.spring(rotateAnim, {
      toValue: rotation,
      useNativeDriver: true,
      tension: 60,
      friction: 12,
    }).start();
  }, [rotation]);

  // Pulse when aligned
  useEffect(() => {
    if (isAligned) {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.12, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]),
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseAnim.setValue(1);
    }
    return () => { pulseLoop.current?.stop(); };
  }, [isAligned]);

  const rotateInterpolation = rotateAnim.interpolate({
    inputRange: [-3600, 0, 3600],
    outputRange: ['-3600deg', '0deg', '3600deg'],
  });

  const circleColor = getCircleColor(offset);
  const circleOpacity = getCircleOpacity(offset);

  const cx = ARROW_SIZE / 2;

  return (
    <View style={styles.container}>
      {/* Precision circle */}
      <Animated.View style={[styles.circleWrap, { transform: [{ scale: pulseAnim }] }]}>
        <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
          <SvgCircle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={CIRCLE_SIZE / 2 - 3}
            stroke={circleColor}
            strokeWidth={3}
            fill="none"
            opacity={circleOpacity}
          />
          {isAligned && (
            <SvgCircle
              cx={CIRCLE_SIZE / 2}
              cy={CIRCLE_SIZE / 2}
              r={CIRCLE_SIZE / 2 - 10}
              stroke={circleColor}
              strokeWidth={1}
              fill={circleColor}
              opacity={0.08}
            />
          )}
        </Svg>
      </Animated.View>

      {/* Rotating arrow */}
      <Animated.View
        style={[
          styles.arrowWrap,
          { transform: [{ rotate: rotateInterpolation }] },
        ]}
      >
        <Svg width={ARROW_SIZE} height={ARROW_SIZE}>
          <Defs>
            <LinearGradient id="arrowGold" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFD700" />
              <Stop offset="0.4" stopColor="#D4AF37" />
              <Stop offset="1" stopColor="#B8960C" />
            </LinearGradient>
            <LinearGradient id="arrowShadow" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#A07800" />
              <Stop offset="1" stopColor="#8B6914" />
            </LinearGradient>
          </Defs>

          {/* Shadow layer (slight offset) */}
          <Polygon
            points={`${cx},14 ${cx - 22},${cx + 18} ${cx - 8},${cx + 4} ${cx - 8},${cx + 48} ${cx + 8},${cx + 48} ${cx + 8},${cx + 4} ${cx + 22},${cx + 18}`}
            fill="rgba(0,0,0,0.25)"
            translateX={1}
            translateY={2}
          />

          {/* Main arrow shape — chevron top + rectangular tail */}
          <Polygon
            points={`${cx},12 ${cx - 24},${cx + 16} ${cx - 9},${cx + 2} ${cx - 9},${cx + 50} ${cx + 9},${cx + 50} ${cx + 9},${cx + 2} ${cx + 24},${cx + 16}`}
            fill="url(#arrowGold)"
          />

          {/* Highlight stroke on left edge */}
          <Polygon
            points={`${cx},12 ${cx - 24},${cx + 16} ${cx - 9},${cx + 2}`}
            fill="none"
            stroke="#FFE47A"
            strokeWidth={1}
            opacity={0.6}
          />

          {/* 🕋 small Kaaba dot at the tip */}
          <SvgCircle cx={cx} cy={22} r={4} fill="#FFF" opacity={0.9} />
          <SvgCircle cx={cx} cy={22} r={2.5} fill="#D4AF37" />
        </Svg>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleWrap: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
  },
  arrowWrap: {
    width: ARROW_SIZE,
    height: ARROW_SIZE,
  },
});
