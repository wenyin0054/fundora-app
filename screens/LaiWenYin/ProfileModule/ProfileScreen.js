import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Switch,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen({navigation}) {
  const [fullName, setFullName] = useState('Sarah Chen');
  const [age, setAge] = useState('28');
  const [income, setIncome] = useState('RM 3,800');
  const [goals, setGoals] = useState(
    'Saving for a first home down payment, building an emergency fund, and investing in a retirement plan.'
  );
  const [dailyQuiz, setDailyQuiz] = useState(true);

  const handleSave = () => {
    console.log('Profile saved!');
  };

  const handleLogout = () => {
    console.log('Logged out');
    navigation.navigate('Login');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Profile Info */}
      <Text style={styles.badge}>Beginner</Text>
      <Image
        source={{ uri: 'https://randomuser.me/api/portraits/women/44.jpg' }}
        style={styles.profileImage}
      />
      <Text style={styles.name}>Sarah Chen</Text>

      {/* Personal Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Details</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
        />
        <TextInput style={styles.input} value={age} onChangeText={setAge} />
        <TextInput
          style={styles.input}
          value={income}
          onChangeText={setIncome}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={3}
          value={goals}
          onChangeText={setGoals}
        />
      </View>

      {/* Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Financial Preferences</Text>
        <Text style={styles.label}>Budgeting Categories</Text>
        <TextInput style={styles.input} value="Savings" editable={false} />

        <View style={styles.switchRow}>
          <Text style={styles.label}>Daily Quizzes</Text>
          <Switch
            value={dailyQuiz}
            onValueChange={setDailyQuiz}
            trackColor={{ false: '#ccc', true: '#57C0A1' }}
          />
        </View>
      </View>

      {/* Buttons */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Changes</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
  },
  header: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600',
  },
  badge: {
    textAlign: 'center',
    marginTop: 15,
    color: '#57C0A1',
    fontWeight: '600',
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignSelf: 'center',
    marginVertical: 15,
  },
  name: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
  section: {
    marginTop: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginVertical: 8,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  textArea: {
    height: 80,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#57C0A1',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 30,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  logoutButton: {
    borderColor: '#FF5A5F',
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 40,
  },
  logoutText: {
    color: '#FF5A5F',
    fontWeight: '600',
    fontSize: 16,
  },
});
