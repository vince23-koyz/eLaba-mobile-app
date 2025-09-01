import { StyleSheet, Text, View, FlatList, Image, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import LinearGradient from 'react-native-linear-gradient'
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/Navigator'; 

const sampleChats = [
  { id: '1', name: 'Alice Johnson', lastMessage: 'See you tomorrow!', time: '09:15', avatar: require('../../assets/img/default-profile.png') },
  { id: '2', name: 'Bob Smith', lastMessage: 'Thanks for the update.', time: '08:42', avatar: require('../../assets/img/bhive.png') },
  { id: '3', name: 'Cathy Lee', lastMessage: 'Let me know when you arrive.', time: 'Yesterday', avatar: require('../../assets/img/geofer.png') },
];

export default function MessagingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>(); 
  const [activeFilter, setActiveFilter] = useState('All');

  const handleProfile = () => {
    navigation.navigate('EditProfile');
  };
  const handleChatPress = () => {
    navigation.navigate('Convo'); 
  };

  const handleFilterPress = (filter: string) => {
    setActiveFilter(filter);
  };

  const renderFilterButton = (title: string, count?: number) => {
    const isActive = activeFilter === title;
    return (
      <TouchableOpacity 
        style={[
          styles.filterButton, 
          isActive ? styles.activeFilterButton : styles.inactiveFilterButton
        ]} 
        onPress={() => handleFilterPress(title)}
        activeOpacity={0.7}
      >
        <View style={styles.filterContent}>
          <Text style={[
            styles.filterText, 
            isActive ? styles.activeFilterText : styles.inactiveFilterText
          ]}>
            {title}
          </Text>
          {count !== undefined && (
            <View style={[
              styles.badge,
              isActive ? styles.activeBadge : styles.inactiveBadge
            ]}>
              <Text style={[
                styles.badgeText,
                isActive ? styles.activeBadgeText : styles.inactiveBadgeText
              ]}>
                {count}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: any) => (
    <TouchableOpacity style={styles.chatItem} onPress={handleChatPress}>
      <Image source={item.avatar} style={styles.avatar} />
      <View style={styles.chatInfo}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.lastMessage}>{item.lastMessage}</Text>
      </View>
      <Text style={styles.time}>{item.time}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <LinearGradient
        colors={['#91e2d9', '#96bcff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.headerContainer, { elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8 }]}
      >
        {/* Left side (Back) */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Image source={require('../../assets/img/icon/back.png')} style={styles.backIcon} />
        </TouchableOpacity>

        {/* Center Title */}
        <Text style={styles.headerTitle}>Messaging</Text>

        {/* Right side (Profile) */}
        <TouchableOpacity onPress={handleProfile}>
          <Image source={require('../../assets/img/default-profile.png')} style={styles.profileIcon} />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.filterContainer}>
        {renderFilterButton('All', 12)}
        {renderFilterButton('Unread', 3)}
        {renderFilterButton('Spam', 1)}
      </View>

      <FlatList
        data={sampleChats}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 40,
    paddingBottom: 14,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    width: 26,
    height: 26,
    tintColor: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    flex: 1, 
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    resizeMode: 'cover',
    backgroundColor: '#eee',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  filterButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 25,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  activeFilterButton: {
    backgroundColor: '#1ca7ec',
    elevation: 4,
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  inactiveFilterButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  filterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  activeFilterText: {
    color: '#ffffff',
  },
  inactiveFilterText: {
    color: '#6c757d',
  },
  badge: {
    marginLeft: 6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  activeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  inactiveBadge: {
    backgroundColor: '#e74c3c',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  activeBadgeText: {
    color: '#ffffff',
  },
  inactiveBadgeText: {
    color: '#ffffff',
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 14,
    backgroundColor: '#eee',
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  },
  lastMessage: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  time: {
    fontSize: 12,
    color: '#aaa',
    marginLeft: 8,
  },
});