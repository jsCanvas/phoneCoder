import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type ScreenCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function ScreenCard({ title, description, children }: ScreenCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  title: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '800',
  },
  description: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  content: {
    marginTop: 18,
  },
});
