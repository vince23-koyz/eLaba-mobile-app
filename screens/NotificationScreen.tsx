import { Alert, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React, { useState } from 'react'
import LinearGradient from 'react-native-linear-gradient'
import Confirmed from '../assets/img/icon/confirmed.png'

export default function NotificationScreen() {
  const [expanded, setExpanded] = useState(false)

  const CheckProgress = () => {
    Alert.alert('Checking Progress', 'loading please wait.....')
  }

  const handleToggleExpand = () => {
    setExpanded(!expanded)
  }

  return (
    <LinearGradient
      colors={['#a2fff4', '#96bcff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      <SafeAreaView>
        <ScrollView>
          <View style={styles.notificationContainer}>
            <Text style={styles.notifLabel}>Notification</Text>
          </View>

          <View style={styles.contentContainer}>
            <View style={styles.conterCard}>
              <View style={styles.rowTop}>
                <Image source={Confirmed} style={styles.notifyIcon} />
                <Text style={styles.statusLabel}>Book Confirmed!</Text>
              </View>

              <View style={styles.descriptCon}>
                <Text style={styles.description}>
                  {expanded
                    ? "Hi Customer, your booking has been successfully confirmed! You can track your order number #11111. Our team is preparing your order. Please wait for updates regarding dispatch and delivery."
                    : "Hi Customer, your booking has been successfully confirmed!..."}
                </Text>
              </View>

              <TouchableOpacity onPress={handleToggleExpand} style={styles.expandBtn}>
                <Text style={{ fontSize: 20 }}>
                  {expanded ? "▲" : "▼"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.checkBtn} onPress={CheckProgress}>
                <Text style={styles.buttonText}>Check Progress</Text>
              </TouchableOpacity>

            </View>
            <View style={styles.conterCard}>
              <View style={styles.rowTop}>
                <Image source={Confirmed} style={styles.notifyIcon} />
                <Text style={styles.statusLabel}>Book Confirmed!</Text>
              </View>

              <View style={styles.descriptCon}>
                <Text style={styles.description}>
                  {expanded
                    ? "Hi Customer, your booking has been successfully confirmed! You can track your order number #11111. Our team is preparing your order. Please wait for updates regarding dispatch and delivery."
                    : "Hi Customer, your booking has been successfully confirmed!..."}
                </Text>
              </View>

              <TouchableOpacity onPress={handleToggleExpand} style={styles.expandBtn}>
                <Text style={{ fontSize: 20 }}>
                  {expanded ? "▲" : "▼"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.checkBtn} onPress={CheckProgress}>
                <Text style={styles.buttonText}>Check Progress</Text>
              </TouchableOpacity>

            </View>
            <View style={styles.conterCard}>
              <View style={styles.rowTop}>
                <Image source={Confirmed} style={styles.notifyIcon} />
                <Text style={styles.statusLabel}>Book Confirmed!</Text>
              </View>

              <View style={styles.descriptCon}>
                <Text style={styles.description}>
                  {expanded
                    ? "Hi Customer, your booking has been successfully confirmed! You can track your order number #11111. Our team is preparing your order. Please wait for updates regarding dispatch and delivery."
                    : "Hi Customer, your booking has been successfully confirmed!..."}
                </Text>
              </View>

              <TouchableOpacity onPress={handleToggleExpand} style={styles.expandBtn}>
                <Text style={{ fontSize: 20 }}>
                  {expanded ? "▲" : "▼"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.checkBtn} onPress={CheckProgress}>
                <Text style={styles.buttonText}>Check Progress</Text>
              </TouchableOpacity>

            </View>
            <View style={styles.conterCard}>
              <View style={styles.rowTop}>
                <Image source={Confirmed} style={styles.notifyIcon} />
                <Text style={styles.statusLabel}>Book Confirmed!</Text>
              </View>

              <View style={styles.descriptCon}>
                <Text style={styles.description}>
                  {expanded
                    ? "Hi Customer, your booking has been successfully confirmed! You can track your order number #11111. Our team is preparing your order. Please wait for updates regarding dispatch and delivery."
                    : "Hi Customer, your booking has been successfully confirmed!..."}
                </Text>
              </View>

              <TouchableOpacity onPress={handleToggleExpand} style={styles.expandBtn}>
                <Text style={{ fontSize: 20 }}>
                  {expanded ? "▲" : "▼"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.checkBtn} onPress={CheckProgress}>
                <Text style={styles.buttonText}>Check Progress</Text>
              </TouchableOpacity>

            </View>
            <View style={styles.conterCard}>
              <View style={styles.rowTop}>
                <Image source={Confirmed} style={styles.notifyIcon} />
                <Text style={styles.statusLabel}>Book Confirmed!</Text>
              </View>

              <View style={styles.descriptCon}>
                <Text style={styles.description}>
                  {expanded
                    ? "Hi Customer, your booking has been successfully confirmed! You can track your order number #11111. Our team is preparing your order. Please wait for updates regarding dispatch and delivery."
                    : "Hi Customer, your booking has been successfully confirmed!..."}
                </Text>
              </View>

              <TouchableOpacity onPress={handleToggleExpand} style={styles.expandBtn}>
                <Text style={{ fontSize: 20 }}>
                  {expanded ? "▲" : "▼"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.checkBtn} onPress={CheckProgress}>
                <Text style={styles.buttonText}>Check Progress</Text>
              </TouchableOpacity>

            </View>
            <View style={styles.conterCard}>
              <View style={styles.rowTop}>
                <Image source={Confirmed} style={styles.notifyIcon} />
                <Text style={styles.statusLabel}>Book Confirmed!</Text>
              </View>

              <View style={styles.descriptCon}>
                <Text style={styles.description}>
                  {expanded
                    ? "Hi Customer, your booking has been successfully confirmed! You can track your order number #11111. Our team is preparing your order. Please wait for updates regarding dispatch and delivery."
                    : "Hi Customer, your booking has been successfully confirmed!..."}
                </Text>
              </View>

              <TouchableOpacity onPress={handleToggleExpand} style={styles.expandBtn}>
                <Text style={{ fontSize: 20 }}>
                  {expanded ? "▲" : "▼"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.checkBtn} onPress={CheckProgress}>
                <Text style={styles.buttonText}>Check Progress</Text>
              </TouchableOpacity>

            </View>
            <View style={styles.conterCard}>
              <View style={styles.rowTop}>
                <Image source={Confirmed} style={styles.notifyIcon} />
                <Text style={styles.statusLabel}>Book Confirmed!</Text>
              </View>

              <View style={styles.descriptCon}>
                <Text style={styles.description}>
                  {expanded
                    ? "Hi Customer, your booking has been successfully confirmed! You can track your order number #11111. Our team is preparing your order. Please wait for updates regarding dispatch and delivery."
                    : "Hi Customer, your booking has been successfully confirmed!..."}
                </Text>
              </View>

              <TouchableOpacity onPress={handleToggleExpand} style={styles.expandBtn}>
                <Text style={{ fontSize: 20 }}>
                  {expanded ? "▲" : "▼"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.checkBtn} onPress={CheckProgress}>
                <Text style={styles.buttonText}>Check Progress</Text>
              </TouchableOpacity>

            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  notificationContainer: {
    alignItems: 'center',
    marginTop: '15%'
  },
  notifLabel: {
    fontSize: 21,
    fontWeight: '600'
  },
  contentContainer: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    flex: 1,
    marginTop: 20,
    borderTopColor: '#e2e2e2',
    borderTopWidth: 2
  },
  conterCard: {
    width: '100%',
    borderColor: '#b5a5a5c2',
    borderWidth: 1,
    borderBottomLeftRadius: 30,
    padding: 10,
    marginTop: 12,
    justifyContent: 'space-between',
    minHeight: 120,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10
  },
  notifyIcon: {
    width: 40,
    height: 40,
    marginLeft: 5
  },
  statusLabel: {
    fontSize: 17,
    fontWeight: '500',
    paddingLeft: 15
  },
  descriptCon: {
    alignSelf: 'stretch',
  },
  description: {
    fontSize: 15,
    paddingLeft: 60,
    paddingRight: 50,
    textAlign: 'justify'
  },
  expandBtn: {
    position: 'absolute',
    right: 15,
    top: 50,
  },
  checkBtn: {
    backgroundColor: '#a6a6a6b7',
    width: 110,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginLeft: '60%',
    marginTop: 10
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '500'
  },
})
