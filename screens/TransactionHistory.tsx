import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image } from 'react-native'
import React from 'react'
import LinearGradient from 'react-native-linear-gradient'

export default function TransactionHistory() {
  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={['#a2fff4', '#96bcff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradientBackground}
      >
        <View style={styles.header}>
          <Image source={require('../assets/img/icon/back.png')} style={styles.backIcon} />
          <Text style={styles.title}>Transaction History</Text>
        </View>
        <View style={styles.form}>
          {/* Confirmed Transaction */}
          <TouchableOpacity style={styles.transactionCard} activeOpacity={0.8}>
            <View style={styles.shopHeaderFull}>
              <Text style={styles.shopName}>Laundry Shop Name</Text>
              <Text style={styles.date}>08/13/25</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.customer}>Customer: John Doe</Text>
              <View style={styles.row}>
                <Text style={styles.service}>Service: Full Service</Text>
                <Text style={styles.total}>Total: 150</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.pickup}>Pickup: 08/18/25</Text>
                <Text style={styles.statusConfirmed}>Confirmed</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Cancelled Transaction */}
          <TouchableOpacity style={styles.transactionCard} activeOpacity={0.8}>
            <View style={styles.shopHeaderFull}>
              <Text style={styles.shopName}>Quick Wash Center</Text>
              <Text style={styles.date}>08/10/25</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.customer}>Customer: Jane Smith</Text>
              <View style={styles.row}>
                <Text style={styles.service}>Service: Wash & Fold</Text>
                <Text style={styles.total}>Total: 90</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.pickup}>Pickup: 08/12/25</Text>
                <Text style={styles.statusCancelled}>Cancelled</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Pending Transaction */}
          <TouchableOpacity style={styles.transactionCard} activeOpacity={0.8}>
            <View style={styles.shopHeaderFull}>
              <Text style={styles.shopName}>Sparkle Laundry</Text>
              <Text style={styles.date}>08/14/25</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.customer}>Customer: Alex Lee</Text>
              <View style={styles.row}>
                <Text style={styles.service}>Service: Dry Cleaning</Text>
                <Text style={styles.total}>Total: 200</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.pickup}>Pickup: 08/20/25</Text>
                <Text style={styles.statusPending}>Pending</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  gradientBackground: {
    flex: 1,
    minHeight: '100%',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backIcon: {
    width: 24,
    height: 24,
    tintColor: '#ffffff',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    letterSpacing: -0.3,
    flex: 1,
    textAlign: 'center',
    marginRight: 24, // To offset the back button and center the title
  },
  form: {
    backgroundColor: '#f6f6f6',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 10, 
    elevation: 6,
    marginBottom: 20,
    height: '100%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  transactionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f3f8',
  },
  shopHeaderFull: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fc',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e8eaff',
  },
  shopName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    letterSpacing: -0.2,
  },
  date: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
    backgroundColor: '#e8eaff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  cardContent: {
    padding: 16,
  },
  customer: {
    fontSize: 14,
    marginBottom: 10,
    color: '#4a5568',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    alignItems: 'center',
  },
  service: {
    fontSize: 13,
    color: '#2d3748',
    fontWeight: '500',
  },
  total: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2d3748',
    backgroundColor: '#f0fff4',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#c6f6d5',
  },
  pickup: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
  },
  statusConfirmed: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
    backgroundColor: '#48bb78',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    textAlign: 'center',
    minWidth: 70,
    shadowColor: '#48bb78',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  statusCancelled: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
    backgroundColor: '#f56565',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    textAlign: 'center',
    minWidth: 70,
    shadowColor: '#f56565',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  statusPending: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
    backgroundColor: '#ed8936',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    textAlign: 'center',
    minWidth: 70,
    shadowColor: '#ed8936',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
})