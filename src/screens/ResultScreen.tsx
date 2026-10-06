import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, Suggestion } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Result'>;

function ConfidenceBar({ value }: { value: number }) {
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${Math.round(value * 100)}%` }]} />
    </View>
  );
}

function TreatmentList({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((t, i) => (
        <Text key={i} style={styles.body}>• {t}</Text>
      ))}
    </View>
  );
}

export default function ResultScreen({ route, navigation }: Props) {
  const { diagnosis, imageUri } = route.params;
  const [top, ...others] = diagnosis.suggestions;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={{ uri: imageUri }} style={styles.preview} />

      {!diagnosis.isPlant || !top ? (
        <Text style={styles.warn}>
          {!diagnosis.isPlant
            ? "This doesn't look like a plant. Try a clearer, closer photo of a leaf."
            : 'No diagnosis could be made for this photo.'}
        </Text>
      ) : (
        <>
          <Text style={[styles.heading, diagnosis.isHealthy ? styles.ok : styles.bad]}>
            {diagnosis.isHealthy ? 'Looks healthy' : top.name}
          </Text>
          <Text style={styles.body}>Confidence: {Math.round(top.probability * 100)}%</Text>
          <ConfidenceBar value={top.probability} />
          {top.description && <Text style={styles.body}>{top.description}</Text>}
          <TreatmentList title="Biological treatment" items={top.treatment?.biological} />
          <TreatmentList title="Chemical treatment" items={top.treatment?.chemical} />
          <TreatmentList title="Prevention" items={top.treatment?.prevention} />

          {others.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Other possibilities</Text>
              {others.map((s: Suggestion) => (
                <View key={s.id} style={styles.other}>
                  <Text style={styles.body}>{s.name} — {Math.round(s.probability * 100)}%</Text>
                  <ConfidenceBar value={s.probability} />
                </View>
              ))}
            </View>
          )}
        </>
      )}

      <Pressable style={styles.primary} onPress={() => navigation.goBack()}>
        <Text style={styles.primaryText}>Scan another leaf</Text>
      </Pressable>
      <Text style={styles.disclaimer}>Automated suggestions only — confirm with a local expert before treating.</Text>
    </ScrollView>
  );
}

const GREEN = '#2e7d32';
const styles = StyleSheet.create({
  container: { padding: 20, gap: 12 },
  preview: { width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: '#eee' },
  heading: { fontSize: 24, fontWeight: '700' },
  ok: { color: GREEN },
  bad: { color: '#c62828' },
  body: { color: '#333', lineHeight: 20 },
  warn: { color: '#e65100', fontSize: 16 },
  section: { gap: 4, marginTop: 8 },
  sectionTitle: { fontWeight: '700', fontSize: 16, color: '#222' },
  other: { gap: 4, marginBottom: 6 },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: '#e0e0e0', overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: GREEN },
  primary: { marginTop: 12, padding: 16, borderRadius: 10, backgroundColor: GREEN, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  disclaimer: { color: '#777', fontSize: 12, textAlign: 'center' },
});
