import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, Usage } from '../types';
import { DiseaseApiError, plantIdService } from '../services/diseaseApi';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [usage, setUsage] = useState<Usage | null>(null);

  // Refresh on focus so the count updates after returning from a diagnosis.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      plantIdService
        .getUsage()
        .then((u) => active && setUsage(u))
        .catch(() => active && setUsage(null));
      return () => {
        active = false;
      };
    }, []),
  );

  async function pick(source: 'camera' | 'library') {
    setError(null);
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError(`Permission to access the ${source} was denied.`);
      return;
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
    const res =
      source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (!res.canceled) setImageUri(res.assets[0].uri);
  }

  async function analyze() {
    if (!imageUri) return;
    setLoading(true);
    setError(null);
    try {
      const rendered = await ImageManipulator.manipulate(imageUri).resize({ width: 1024 }).renderAsync();
      const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
      const diagnosis = await plantIdService.analyze(saved.base64 ?? '');
      navigation.navigate('Result', { diagnosis, imageUri });
    } catch (e) {
      setError(e instanceof DiseaseApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Leaf Disease Detector</Text>
      {usage && <CreditsBadge usage={usage} />}
      <Text style={styles.subtitle}>Take or choose a clear, close-up photo of a single leaf.</Text>

      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.preview} />
      ) : (
        <View style={[styles.preview, styles.placeholder]}>
          <Text style={styles.placeholderText}>No photo selected</Text>
        </View>
      )}

      <View style={styles.row}>
        <Pressable style={styles.secondary} onPress={() => pick('camera')} disabled={loading}>
          <Text style={styles.secondaryText}>Take photo</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => pick('library')} disabled={loading}>
          <Text style={styles.secondaryText}>Choose photo</Text>
        </Pressable>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={[styles.primary, (!imageUri || loading) && styles.disabled]} onPress={analyze} disabled={!imageUri || loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Analyze</Text>}
      </Pressable>
    </ScrollView>
  );
}

function CreditsBadge({ usage }: { usage: Usage }) {
  const left = usage.remainingMonth ?? usage.remainingTotal;
  const label =
    left === null
      ? `${usage.usedMonth} credits used this month`
      : usage.limitMonth
        ? `${left} of ${usage.limitMonth} credits left this month`
        : `${left} credits left`;
  const low = left !== null && left <= 5;
  return (
    <View style={[styles.badge, low && styles.badgeLow]}>
      <Text style={[styles.badgeText, low && styles.badgeTextLow]}>{label}</Text>
    </View>
  );
}

const GREEN = '#2e7d32';
const styles = StyleSheet.create({
  container: { padding: 20, gap: 16, alignItems: 'stretch' },
  title: { fontSize: 26, fontWeight: '700', color: GREEN },
  subtitle: { color: '#555' },
  preview: { width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: '#eee' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  placeholderText: { color: '#888' },
  row: { flexDirection: 'row', gap: 12 },
  secondary: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: GREEN, alignItems: 'center' },
  secondaryText: { color: GREEN, fontWeight: '600' },
  primary: { padding: 16, borderRadius: 10, backgroundColor: GREEN, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  disabled: { opacity: 0.5 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#e8f5e9' },
  badgeLow: { backgroundColor: '#ffebee' },
  badgeText: { color: GREEN, fontWeight: '600' },
  badgeTextLow: { color: '#c62828' },
  error: { color: '#c62828' },
});
