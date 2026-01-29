/**
 * AudioPlayer - Lecteur audio pour les Duas
 * Utilise Expo AV pour la lecture audio
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useDua } from '../contexts';
import { Spacing, Typography, Shadows } from '../constants';
import type { AudioPlaybackSpeed } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDER_WIDTH = SCREEN_WIDTH - (Spacing.screenHorizontal * 2) - (Spacing.lg * 2);

interface AudioPlayerProps {
  audioUrl: string;
  duaId: string;
  reciter: string;
  onError?: (error: string) => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  duaId,
  reciter,
  onError,
}) => {
  const { colors } = useTheme();
  const { getAudioPosition, saveAudioPosition } = useDua();

  // État du player
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<AudioPlaybackSpeed>(1);
  const [isLooping, setIsLooping] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showVolume, setShowVolume] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);

  // Ref pour l'intervalle de sauvegarde
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Formater le temps (ms vers mm:ss)
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Callback de mise à jour du statut
  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        console.error('Erreur de lecture:', status.error);
        onError?.('Erreur de lecture audio');
      }
      return;
    }

    setIsPlaying(status.isPlaying);
    if (!isSeeking) {
      setPosition(status.positionMillis);
    }
    setDuration(status.durationMillis || 0);

    // Fin de lecture
    if (status.didJustFinish && !status.isLooping) {
      setIsPlaying(false);
      setPosition(0);
    }
  }, [onError, isSeeking]);

  // Charger l'audio
  const loadAudio = useCallback(async () => {
    if (!audioUrl || audioUrl.startsWith('PLACEHOLDER')) {
      return;
    }

    try {
      setIsLoading(true);

      // Configurer le mode audio
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });

      // Charger le son
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        {
          shouldPlay: false,
          isLooping,
          rate: playbackSpeed,
          volume,
        },
        onPlaybackStatusUpdate
      );

      setSound(newSound);
      soundRef.current = newSound;
      setIsLoaded(true);

      // Restaurer la position sauvegardée
      const savedPosition = getAudioPosition(duaId);
      if (savedPosition > 0) {
        await newSound.setPositionAsync(savedPosition);
        setPosition(savedPosition);
      }
    } catch (error) {
      console.error('Erreur lors du chargement audio:', error);
      onError?.('Impossible de charger l\'audio');
    } finally {
      setIsLoading(false);
    }
  }, [audioUrl, duaId, isLooping, playbackSpeed, volume, getAudioPosition, onError, onPlaybackStatusUpdate]);

  // Effet de chargement initial
  useEffect(() => {
    loadAudio();

    return () => {
      // Nettoyage
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    };
  }, [audioUrl]);

  // Sauvegarde périodique de la position
  useEffect(() => {
    if (isPlaying) {
      saveIntervalRef.current = setInterval(() => {
        if (position > 0) {
          saveAudioPosition(duaId, position);
        }
      }, 5000);
    } else {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
      if (position > 0) {
        saveAudioPosition(duaId, position);
      }
    }

    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    };
  }, [isPlaying, position, duaId, saveAudioPosition]);

  // Play/Pause
  const togglePlayPause = async () => {
    if (!sound) {
      await loadAudio();
      return;
    }

    try {
      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
    } catch (error) {
      console.error('Erreur play/pause:', error);
    }
  };

  // Seek (déplacer la position)
  const seekTo = async (value: number) => {
    if (!sound) return;

    try {
      await sound.setPositionAsync(value);
      setPosition(value);
    } catch (error) {
      console.error('Erreur seek:', error);
    }
  };

  // Reculer de 10 secondes
  const seekBackward = async () => {
    const newPosition = Math.max(0, position - 10000);
    await seekTo(newPosition);
  };

  // Avancer de 10 secondes
  const seekForward = async () => {
    const newPosition = Math.min(duration, position + 10000);
    await seekTo(newPosition);
  };

  // Changer la vitesse
  const cyclePlaybackSpeed = async () => {
    const speeds: AudioPlaybackSpeed[] = [0.75, 1, 1.25];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);

    if (sound) {
      try {
        await sound.setRateAsync(nextSpeed, true);
      } catch (error) {
        console.error('Erreur changement vitesse:', error);
      }
    }
  };

  // Toggle loop
  const toggleLoop = async () => {
    const newLooping = !isLooping;
    setIsLooping(newLooping);

    if (sound) {
      try {
        await sound.setIsLoopingAsync(newLooping);
      } catch (error) {
        console.error('Erreur toggle loop:', error);
      }
    }
  };

  // Handler pour le tap sur la barre de progression
  const handleProgressBarPress = async (event: any) => {
    if (!isLoaded || duration === 0) return;

    const { locationX } = event.nativeEvent;
    const percentage = Math.max(0, Math.min(1, locationX / SLIDER_WIDTH));
    const newPosition = percentage * duration;
    await seekTo(newPosition);
  };

  // Calcul de la progression
  const progress = duration > 0 ? (position / duration) * 100 : 0;

  // Si l'URL est un placeholder, afficher un message
  if (!audioUrl || audioUrl.startsWith('PLACEHOLDER')) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }, Shadows.medium]}>
        <View style={styles.placeholderContent}>
          <Ionicons name="musical-notes-outline" size={24} color={colors.textSecondary} />
          <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
            Audio non disponible
          </Text>
          <Text style={[styles.reciterText, { color: colors.textSecondary }]}>
            {reciter}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }, Shadows.medium]}>
      {/* Récitateur */}
      <View style={styles.reciterContainer}>
        <Ionicons name="mic-outline" size={16} color={colors.primary} />
        <Text style={[styles.reciterName, { color: colors.text }]}>{reciter}</Text>
      </View>

      {/* Barre de progression */}
      <View style={styles.progressContainer}>
        <Pressable
          onPress={handleProgressBarPress}
          style={[styles.progressBar, { backgroundColor: colors.border }]}
        >
          <View
            style={[
              styles.progressFill,
              { backgroundColor: colors.primary, width: `${progress}%` },
            ]}
          />
          <View
            style={[
              styles.progressThumb,
              {
                backgroundColor: colors.primary,
                left: `${progress}%`,
              },
            ]}
          />
        </Pressable>
        <View style={styles.timeContainer}>
          <Text style={[styles.timeText, { color: colors.textSecondary }]}>
            {formatTime(position)}
          </Text>
          <Text style={[styles.timeText, { color: colors.textSecondary }]}>
            {formatTime(duration)}
          </Text>
        </View>
      </View>

      {/* Contrôles */}
      <View style={styles.controlsContainer}>
        {/* Vitesse */}
        <Pressable
          style={[styles.controlButton, styles.smallButton]}
          onPress={cyclePlaybackSpeed}
        >
          <Text style={[styles.speedText, { color: colors.text }]}>
            {playbackSpeed}x
          </Text>
        </Pressable>

        {/* Reculer */}
        <Pressable
          style={styles.controlButton}
          onPress={seekBackward}
          disabled={!isLoaded}
        >
          <Ionicons
            name="play-back"
            size={24}
            color={isLoaded ? colors.text : colors.textSecondary}
          />
        </Pressable>

        {/* Play/Pause */}
        <Pressable
          style={[styles.playButton, { backgroundColor: colors.primary }]}
          onPress={togglePlayPause}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={28}
              color="#FFFFFF"
            />
          )}
        </Pressable>

        {/* Avancer */}
        <Pressable
          style={styles.controlButton}
          onPress={seekForward}
          disabled={!isLoaded}
        >
          <Ionicons
            name="play-forward"
            size={24}
            color={isLoaded ? colors.text : colors.textSecondary}
          />
        </Pressable>

        {/* Loop */}
        <Pressable
          style={[styles.controlButton, styles.smallButton]}
          onPress={toggleLoop}
        >
          <Ionicons
            name="repeat"
            size={20}
            color={isLooping ? colors.primary : colors.textSecondary}
          />
        </Pressable>
      </View>

      {/* Indicateur de volume */}
      <Pressable
        style={styles.volumeToggle}
        onPress={() => setShowVolume(!showVolume)}
      >
        <Ionicons
          name={volume === 0 ? 'volume-mute' : volume < 0.5 ? 'volume-low' : 'volume-high'}
          size={18}
          color={colors.textSecondary}
        />
      </Pressable>

      {showVolume && (
        <View style={[styles.volumeContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={styles.volumeButtons}>
            <Pressable
              style={styles.volumeButton}
              onPress={() => setVolume(Math.max(0, volume - 0.1))}
            >
              <Ionicons name="remove" size={20} color={colors.text} />
            </Pressable>
            <Text style={[styles.volumeValue, { color: colors.text }]}>
              {Math.round(volume * 100)}%
            </Text>
            <Pressable
              style={styles.volumeButton}
              onPress={() => setVolume(Math.min(1, volume + 0.1))}
            >
              <Ionicons name="add" size={20} color={colors.text} />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    borderRadius: Spacing.radiusLg,
  },
  reciterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  reciterName: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  progressContainer: {
    marginBottom: Spacing.lg,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'visible',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressThumb: {
    position: 'absolute',
    top: -5,
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: -8,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  timeText: {
    fontSize: Typography.sizes.xs,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  controlButton: {
    padding: Spacing.md,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallButton: {
    padding: Spacing.sm,
    minWidth: 44,
    minHeight: 44,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  volumeToggle: {
    position: 'absolute',
    right: Spacing.sm,
    top: Spacing.sm,
    padding: Spacing.sm,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeContainer: {
    marginTop: Spacing.md,
    padding: Spacing.sm,
    borderRadius: Spacing.radiusSm,
    borderWidth: 1,
  },
  volumeButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  volumeButton: {
    padding: Spacing.sm,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeValue: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    minWidth: 40,
    textAlign: 'center',
  },
  placeholderContent: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  placeholderText: {
    fontSize: Typography.sizes.sm,
  },
  reciterText: {
    fontSize: Typography.sizes.xs,
  },
});

export default AudioPlayer;
