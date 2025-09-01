import React, { useState } from 'react';
import { 
  Image, StyleSheet, Text, TextInput, TouchableOpacity, View, PermissionsAndroid, Platform, Alert 
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/Navigator';

export default function EditProfile() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [profileImage, setProfileImage] = useState<any>(null);

  // Runtime permission request for Android
  const requestStoragePermission = async () => {
    if (Platform.OS === 'android' && Platform.Version >= 23) {
      try {
        const permission = Platform.Version >= 33
          ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
          : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

        const granted = await PermissionsAndroid.request(permission);
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true; // iOS or lower Android versions
  };

  const handleEditImage = async () => {
    const hasPermission = await requestStoragePermission();
    if (!hasPermission) {
      Alert.alert('Permission denied', 'Cannot access storage without permission.');
      return;
    }

    launchImageLibrary(
      {
        mediaType: 'mixed',
        selectionLimit: 1,
      },
      (response) => {
        if (response.didCancel) {
          console.log('User cancelled image picker');
        } else if (response.errorCode) {
          console.log('ImagePicker Error:', response.errorMessage);
        } else if (response.assets && response.assets.length > 0) {
          setProfileImage({ uri: response.assets[0].uri });
        }
      }
    );
  };

  return (
    <LinearGradient
      colors={['#c8fff9', '#96bcff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      <View style={styles.labelContainer}>
        <Text style={styles.profileText}>Profile</Text>
      </View>

      <View style={styles.profilePicWrapper}>
        <TouchableOpacity onPress={handleEditImage}>
          <Image
            source={profileImage ? profileImage : require('../assets/img/default-profile.png')}
            style={styles.imageProfile}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <TextInput style={styles.inputLabel} placeholder="Customer Name" keyboardType='default' />
        <TextInput style={styles.input1} placeholder='Full Name' />
        <TextInput style={styles.input1} placeholder='San Antonio, Iriga City' />
        <TextInput style={styles.input1} placeholder='09963286542' keyboardType="phone-pad" />
        <TouchableOpacity style={styles.saveButton}>
          <Text style={styles.label}>Save</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  labelContainer: { alignItems: 'center', marginTop: '15%' },
  profileText: { fontSize: 21, fontWeight: '400' },
  profilePicWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  imageProfile: { width: 150, height: 150, borderRadius: 75 },
  form: { backgroundColor: '#FFFFFF', width: '100%', height: '100%', marginTop: 10, alignItems: 'center' },
  label: { fontSize: 20 },
  inputLabel: {
    width: '90%', height: 55, backgroundColor: '#ffffffd4', borderRadius: 12,
    borderWidth: 0.3, borderColor: '#000000', paddingHorizontal: 15, fontSize: 16, marginTop: 14, textAlign: 'center',
  },
  input1: {
    width: '90%', height: 55, backgroundColor: '#ffffffd4', borderRadius: 12,
    borderWidth: 0.3, borderColor: '#000000', paddingHorizontal: 15, fontSize: 16, marginTop: 14,
  },
  saveButton: {
    width: '50%', height: 55, backgroundColor: '#96bcff', borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginTop: 20,
  },
});
