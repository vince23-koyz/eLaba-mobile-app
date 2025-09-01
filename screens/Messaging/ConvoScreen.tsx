import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View, Dimensions, ScrollView } from 'react-native'
import React, { useState } from 'react'
import LinearGradient from 'react-native-linear-gradient'
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/Navigator'

const screenHeight = Dimensions.get("window").height;

export default function ConvoScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>(); 
  const [inputText, setInputText] = useState('');
  const [inputHeight, setInputHeight] = useState(40); // default height

  const handleBack = () => {
    navigation.goBack();
  }

  return (
    <LinearGradient
      colors={['#a6fdf3', '#96bcff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      <View style={styles.header}>
        {/* Back Button */}
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Image source={require('../../assets/img/icon/back.png')} style={styles.backIcon} />
        </TouchableOpacity>

        {/* Shop Name */}
        <Text style={styles.shopName}>Denniel Shop</Text>

        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <Image source={require('../../assets/img/washnfold.png')} style={styles.avatar} />
        </View>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 16, marginBottom: 70 }}>
        <View>
          <Text>HAHAHAHAHA</Text>
        </View>
      </ScrollView>

      {/* Footer (Messaging Input) */}
      <View style={styles.footer}>
        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.inputPlaceholder, 
              { height: Math.min(Math.max(40, inputHeight), screenHeight * 0.20) } 
            ]}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            keyboardType="default"
            multiline={true}
            value={inputText}
            onChangeText={setInputText}
            onContentSizeChange={(e) =>
              setInputHeight(e.nativeEvent.contentSize.height)
            }
          />
        </View>
        <TouchableOpacity style={styles.sendButton}>
          <Image source={require('../../assets/img/icon/sent2.png')} style={styles.sendIcon} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    width: '100%',
    height: 60,
    backgroundColor: '#ffffff',
    marginTop: 40,
    flexDirection: 'row',
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 15,
    borderBottomColor: '#4f4f4f45',
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    alignItems: 'flex-start',
  },
  backIcon: {
    width: 25,
    height: 25,
    tintColor: '#224ee0',
  },
  shopName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  avatarContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    resizeMode: 'cover',
  },
  footer: {
    width: '100%',
    backgroundColor: '#ffffff',
    position: 'absolute',
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    paddingVertical: 14, 
  },
  inputContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  inputPlaceholder: {
    color: '#000',
    fontSize: 16,
    paddingVertical: 8,
    textAlignVertical: 'top',
  },
  sendButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 3,
  },
  sendIcon: {
    width: 28,
    height: 28,
    tintColor: '#224ee0',
    marginBottom: 3,
  },
})
