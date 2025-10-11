import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Modal
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../navigation/Navigator';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';

import useShops from '../../hook/useShops';
import useShopServices from '../../hook/useShopServices';

type ShopDetailsNavProp = NativeStackNavigationProp< RootStackParamList,'ShopDetails'>;
type ShopDetailsRouteProp = RouteProp<RootStackParamList, 'ShopDetails'>;

export default function ShopDetailsScreen() {
  const route = useRoute<ShopDetailsRouteProp>();
  const { shop_id } = route.params;
  const navigation = useNavigation<ShopDetailsNavProp>();

  const { shops, loading: shopsLoading, error: shopsError, refresh: refreshShops } = useShops();
  const { services, loading: servicesLoading, refresh: refreshServices } = useShopServices(shop_id);
  const [expandedService, setExpandedService] = useState<number | null>(null);

  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'services' | 'about'>('services');

  // Modal states
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedType, setSelectedType] = useState<'Walk in' | 'Pick up' | null>(null);

  const handleMessagePress = () => {
    if (!shop || !shop.admin_id) {
      console.log('❌ Shop or admin_id not available:', { shop, admin_id: shop?.admin_id });
      return;
    }
    
    // Use shop logo as avatar if available, otherwise use creative icon flag
    const avatarSource = shop.logo 
      ? { uri: `http://10.0.2.2:5000${shop.logo}` }
      : null; // Pass null to trigger creative icon in ConvoScreen
    
    navigation.navigate('Convo', {
      shopName: shop.name,
      shopId: shop_id.toString(),
      receiverId: shop.admin_id.toString(),
      receiverType: 'admin' as const,
      avatar: avatarSource,
      useCreativeIcon: !shop.logo // Flag to use creative icon when no logo
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshShops(), refreshServices()]);
    setRefreshing(false);
  };

  const shop = shops.find(s => s.shop_id === shop_id);

  if (shopsLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading shop info...</Text>
      </View>
    );
  }
  if (shopsError) return <Text style={[styles.centerText, { color: 'red' }]}>{shopsError}</Text>;
  if (!shop) return <Text style={styles.centerText}>Shop not found</Text>;

  return (
    <View style={styles.container}>
      <FlatList
        data={activeTab === 'services' ? services : []}
        keyExtractor={(item, index) =>
          activeTab === 'services' ? item.service_id.toString() : index.toString()
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <>
            {/* HEADER */}
            <LinearGradient
              colors={['#78e4d7', '#96bcff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.headerGradient}
            >
              <View style={styles.headerIcons}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconBtn, styles.leftIcon]}>
                  <Image source={require('../../assets/img/icon/back.png')} style={styles.iconImg} />
                </TouchableOpacity>

                <Text style={styles.logoText}>eLaba</Text>

                <TouchableOpacity onPress={handleMessagePress} style={[styles.iconBtn, styles.rightIcon]}>
                  <Image source={require('../../assets/img/icon/chats.png')} style={styles.iconImg} />
                </TouchableOpacity>
              </View>


              {/* Shop Info Full Width */}
              <View style={styles.shopInfoCard}>
                {shop.logo ? (
                  <Image 
                    source={{ uri: `http://10.0.2.2:5000${shop.logo}` }} 
                    style={styles.shopImg} 
                  />
                ) : (
                  <View style={styles.shopImgPlaceholder}>
                    <Text style={styles.shopImgPlaceholderText}>🏪</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.shopName}>{shop.name}</Text>
                  <View style={styles.operationHoursContainer}>
                    <View style={styles.operationHoursBadge}>
                      <Text style={styles.operationHoursLabel}>Hours</Text>
                    </View>
                    <Text style={styles.shopHours}>{shop.operation_hours}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.favoriteBtn}>
                  <Image
                    source={require('../../assets/img/icon/favorite-icon.png')}
                    style={styles.favoriteIcon}
                  />
                </TouchableOpacity>
              </View>
            </LinearGradient>

          {/* Tabs (attached to shop card) */}
          <View style={styles.tabRow}>
            <TouchableOpacity 
              style={[styles.tabBtn, activeTab === 'services' && styles.activeTab]} 
              onPress={() => setActiveTab('services')}
            >
              <Text style={[styles.tabText, activeTab === 'services' && styles.activeTabText]}>
                Services Offered
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabBtn, activeTab === 'about' && styles.activeTab]} 
              onPress={() => setActiveTab('about')}
            >
              <Text style={[styles.tabText, activeTab === 'about' && styles.activeTabText]}>
                About
              </Text>
            </TouchableOpacity>
          </View>

            {/* About Tab */}
            {activeTab === 'about' && (
              <View style={styles.aboutContainer}>
                <View style={styles.aboutCard}>
                  <Text style={styles.aboutTitle}>Shop Information</Text>
                  
                  <View style={styles.aboutRow}>
                    <View style={styles.aboutLabelContainer}>
                      <Text style={styles.aboutLabel}>Owner</Text>
                    </View>
                    <Text style={styles.aboutValue}>{shop.owner_name}</Text>
                  </View>
                  
                  <View style={styles.aboutRow}>
                    <View style={styles.aboutLabelContainer}>
                      <Text style={styles.aboutLabel}>Address</Text>
                    </View>
                    <Text style={styles.aboutValue}>{shop.address}</Text>
                  </View>
                  
                  <View style={styles.aboutRow}>
                    <View style={styles.aboutLabelContainer}>
                      <Text style={styles.aboutLabel}>Website</Text>
                    </View>
                    <Text style={styles.aboutValue}>{shop.website || "Not Available"}</Text>
                  </View>
                  
                  <View style={styles.aboutRow}>
                    <View style={styles.aboutLabelContainer}>
                      <Text style={styles.aboutLabel}>Contact</Text>
                    </View>
                    <Text style={styles.aboutValue}>Not Available</Text>
                  </View>
                </View>
              </View>
            )}
          </>
        }
        renderItem={({ item }) =>
          activeTab === 'services' ? (
            <TouchableOpacity
              style={styles.serviceCard}
              onPress={() =>
                setExpandedService(expandedService === item.service_id ? null : item.service_id)
              }
              activeOpacity={0.9}
            >
              <View style={styles.serviceContent}>
                <View style={styles.serviceHeader}>
                  <Text style={styles.serviceName}>{item.offers}</Text>
                  <View style={styles.priceContainer}>
                    <Text style={styles.priceCurrency}>₱</Text>
                    <Text style={styles.servicePrice}>{item.price}</Text>
                  </View>
                </View>
                
                <Text
                  style={styles.serviceDesc}
                  numberOfLines={expandedService === item.service_id ? undefined : 2}
                >
                  {item.description}
                </Text>
                
                {/* Only show Read More button if description is long enough */}
                {item.description && item.description.length > 100 && (
                  <TouchableOpacity 
                    style={styles.expandButton}
                    onPress={() =>
                      setExpandedService(expandedService === item.service_id ? null : item.service_id)
                    }
                  >
                    <Text style={styles.expandText}>
                      {expandedService === item.service_id ? "Show Less" : "Read More"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          activeTab === 'services' && !servicesLoading ? (
            <Text style={{ textAlign: 'center', marginTop: 15 }}>No services available</Text>
          ) : null
        }
      />

      {/* Floating Book Now Button */}
      <TouchableOpacity 
        style={styles.floatingBtn} 
        onPress={() => {
          setModalVisible(true);
        }}
      >
        <Text style={styles.floatingBtnText}>Book Now</Text>
      </TouchableOpacity>

      {/* BOOKING TYPE MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Booking Type</Text>

            {['Walk in', 'Pick up'].map(type => (
              <TouchableOpacity 
                key={type} 
                style={styles.radioRow}
                onPress={() => setSelectedType(type as 'Walk in' | 'Pick up')}
              >
                <View style={[styles.radioOuter, selectedType === type && styles.radioOuterActive]}>
                  {selectedType === type && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.radioText}>{type}</Text>
              </TouchableOpacity>
            ))}

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: '#6c757d' }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: '#007bff' }]}
                  onPress={() => {
                    if (selectedType) {
                      setModalVisible(false);
                      navigation.navigate('BookingService', { 
                        type: selectedType,
                        shop_id,
                        shop_name: shop.name,
                        services: services,                 
                      });
                    }
                  }}
                >
                <Text style={styles.modalBtnText}>Proceed</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#555' },
  centerText: { textAlign: 'center', marginTop: 20, fontSize: 16 },

  // HEADER
  headerGradient: {
    paddingBottom: 0,
    paddingTop: 30,
  },
  headerIcons: {
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  leftIcon: {
    position: 'absolute',
    left: 20,
  },
  rightIcon: {
    position: 'absolute',
    right: 20,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  iconBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 8,
    borderRadius: 50,
  },
  iconImg: { width: 30, height: 30, tintColor: '#ffffff' },
  
  // SHOP INFO CARD
  shopInfoCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 24,
    width: '100%',
    borderRadius: 0, 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 3,
  },
  shopImg: { 
    width: 100, 
    height: 100, 
    marginRight: 18, 
    borderRadius: 16, 
    resizeMode: 'cover',
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  shopImgPlaceholder: {
    width: 100, 
    height: 100, 
    marginRight: 18, 
    borderRadius: 16,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  shopImgPlaceholderText: {
    fontSize: 32,
    color: '#ffffff',
    opacity: 0.9,
  }, 
  shopName: { 
    fontSize: 22, 
    fontWeight: '700', 
    color: '#1a1a1a',
    marginBottom: 8,
    letterSpacing: 0.3,
  }, 
  operationHoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  operationHoursBadge: {
    backgroundColor: '#e8f4fd',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  operationHoursLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2196F3',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  shopHours: { 
    fontSize: 15, 
    color: '#555', 
    fontWeight: '500',
  }, 
  favoriteBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 2,
  },
  favoriteIcon: { width: 16, height: 16, resizeMode: 'contain' },
  
  // TAB ROW
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#eee',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    overflow: 'hidden',
    paddingBottom: 18,
    paddingTop: 6,
  },
  tabBtn: { 
    flex: 1, 
    paddingVertical: 16, 
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    marginHorizontal: 8,
  },
  tabText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#666',
    letterSpacing: 0.3,
  },
  activeTab: {
    borderBottomColor: '#147be9',
  },
  activeTabText: { 
    color: '#147be9', 
    fontWeight: '700' 
  },
  
  // SERVICES
  serviceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 8,
    shadowColor: '#78e4d7',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f8ff',
  },
  serviceContent: {
    padding: 12,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  serviceName: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: '#2c3e50',
    flex: 1,
    marginRight: 10,
    letterSpacing: 0.2,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: '#78e4d7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6bd0d7',
  },
  priceCurrency: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
    marginRight: 1,
  },
  servicePrice: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#ffffff',
  },
  serviceDesc: { 
    fontSize: 13, 
    color: '#5a6c7d', 
    lineHeight: 18,
    marginBottom: 8,
  },
  expandButton: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: '#e8f4fd',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#78e4d7',
  },
  expandText: { 
    fontSize: 11, 
    color: '#2d79d1', 
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // ABOUT
  aboutContainer: { padding: 20 },
  aboutCard: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  aboutTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    marginBottom: 20, 
    color: '#1a1a1a',
    letterSpacing: 0.3,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  aboutLabelContainer: {
    minWidth: 80,
    marginRight: 16,
  },
  aboutLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2196F3',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  aboutValue: {
    fontSize: 15,
    color: '#444',
    flex: 1,
    lineHeight: 22,
    fontWeight: '500',
  },

  // FLOATING BUTTON
  floatingBtn: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#007bff',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 30,
    shadowColor: '#007bff',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 8,
  },
  floatingBtnText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    marginBottom: 20, 
    color: '#1a1a1a',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  radioRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 18,
    paddingVertical: 8,
  },
  radioOuter: {
    width: 24, 
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  radioOuterActive: { borderColor: '#007bff' },
  radioInner: { 
    width: 12, 
    height: 12, 
    backgroundColor: '#007bff', 
    borderRadius: 6 
  },
  radioText: { 
    fontSize: 16, 
    color: '#333',
    fontWeight: '500',
  },
  modalActions: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    marginTop: 24,
    gap: 12,
  },
  modalBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  modalBtnText: { 
    color: '#fff', 
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.3,
  }
});
