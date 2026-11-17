
import { View, Text, StyleSheet } from 'react-native';

export default function PlansScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Plans</Text>
      <Text style={styles.subtitle}>
        Your planned purchases will appear here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
});
