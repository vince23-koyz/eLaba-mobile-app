import { ScrollView, StyleSheet, Text, View } from 'react-native'
import React from 'react'

export default function ElevatedCards() {
  return (
    <View>
      <Text style={styles.headinText}>ElevatedCards</Text>
      <ScrollView horizontal={true} style={styles.container}>
        <View style={[styles.card, styles.cardElevated]}> 
            <Text>Tap</Text>
        </View>
        <View style={[styles.card, styles.cardElevated]}> 
            <Text>me</Text>
        </View>
        <View style={[styles.card, styles.cardElevated]}> 
            <Text>to</Text>
        </View>
        <View style={[styles.card, styles.cardElevated]}> 
            <Text>scroll</Text>
        </View>
        <View style={[styles.card, styles.cardElevated]}> 
            <Text>more...</Text>
        </View>
        <View style={[styles.card, styles.cardElevated]}> 
            <Text>😊</Text>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
    container: {
        padding: 8,
    },
    headinText: {
        fontSize: 25,
        fontWeight: 'bold',
        paddingHorizontal: 10,
    },
    card: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        width: 100,
        height: 100,
        borderRadius: 5,
        margin: 8,
    },
    cardElevated: {
        backgroundColor: '#C562AF',
        elevation: 5,
        shadowOffset: {
            width: 1,
            height: 1,
        },
        shadowColor: '#FF7D29',
        shadowOpacity: 0.4,
        shadowRadius: 2,
    },
})