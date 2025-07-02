import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'
import LinearGradient from 'react-native-linear-gradient'
import DefaultProfile from '../assets/img/default-profile.png'
import EditIcon from '../assets/img/icon/edit-icon.png'
import TransactionHistory from '../assets/img/icon/history-icon.png'
import LogoutIcon from '../assets/img/icon/logout-icon.png'

export default function ProfileScreen() {
  const handleLogout = () => {
    Alert.alert(
      'Logout ',
      'Are you sure you want to logout?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes', onPress: () => console.log('Navigating to login...') },
      ],
      { cancelable: false }
    )
  }

  return (
    <LinearGradient
      colors={['#a2fff4', '#96bcff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      {/* Profile Title */}
      <View style={styles.profileContainer}>
        <Text style={styles.profileLabel}>My Profile</Text>
      </View>

      {/* Profile Card */}
      <View style={styles.userContainer}>
        <Image source={DefaultProfile} style={styles.profilePic} />
        <View style={styles.nameContainer}>
          <Text style={styles.usernameText}>@cust0m3r</Text>
          <Text style={styles.fullnameText}>Customer Name</Text>
        </View>
          <TouchableOpacity style={styles.editIconButton}>
            <Image source={EditIcon} style={styles.editIcon} />
          </TouchableOpacity>
      </View>

      {/* Section with Buttons */}
      <View style={styles.sectionBackground}>
        <View style={styles.buttonsContainer}>
          <TouchableOpacity style={styles.transactionButton}>
            <Image source={TransactionHistory} style={styles.historyIcon} />
            <Text style={styles.buttonText}>Transaction History</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Image source={LogoutIcon} style={styles.logoutIcon} />
            <Text style={styles.buttonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileContainer: {
    alignItems: 'center',
    marginTop: '15%',
  },
  profileLabel: {
    fontSize: 21,
    fontWeight: '600',
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    width: 307,
    height: 109,
    borderRadius: 15,
    borderColor: '#767587',
    borderWidth: 0.7,
    alignSelf: 'center',
    paddingHorizontal: 15,
    marginTop: 20,
    position: 'relative',
  },
  nameContainer: {
    marginLeft: 19,
  },
  profilePic: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  usernameText: {
    fontSize: 16,
    fontWeight: '600',
  },
  fullnameText: {
    fontSize: 14,
    color: '#555',
  },
  editIconButton: {
    position: 'absolute',
    right: 15,
    top: '50%',
    transform: [{ translateY: -15 }],
    width: 30,
    height: 30,
  },
  editIcon: {
    width: 30,
    height: 30,
  },
  sectionBackground: {
    backgroundColor: '#FFFFFF',
    flex: 1,
    marginTop: 30,
    paddingTop: 20,
    alignItems: 'center',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  buttonsContainer: {
    marginTop: 20,
    gap: 30,
    alignItems: 'center',
  },
  transactionButton: {
    backgroundColor: '#ebebeb',
    width: 320,
    height: 60,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  logoutButton: {
    backgroundColor: '#ff6c6c',
    width: 320,
    height: 60,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#000',
  },
  historyIcon: {
    position: 'absolute',
    left: 20,
    width: 30,
    height: 30,
  },
  logoutIcon: {
    position: 'absolute',
    left: 20,
    width: 30,
    height: 30,
  },
})
