
import { View, Text, StyleSheet } from 'react-native';

export default function PlannerScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Monthly Planner</Text>
      <Text style={styles.subtitle}>
        Organize your purchases by month.
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
