import { StyleSheet, Text, View } from 'react-native'
import React from 'react'

export default function FlatCards() {
  return (
    <View>
      <Text style={styles.headinText}>FlatCards</Text>
      <View style={styles.container}>
        <View style={[styles.card, styles.card1]}>
            <Text>violet</Text>
        </View>
        <View style={[styles.card, styles.card2]}>
            <Text>aqua</Text>
        </View>
        <View style={[styles.card, styles.card3]}>
            <Text>cream</Text>
        </View>
        <View style={[styles.card, styles.card2]}>
            <Text>aqua</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
    headinText: {
        fontSize: 25,
        fontWeight: 'bold',
        paddingHorizontal: 10,
    },

    container: {
        flex: 1,
        flexDirection: 'row',
        padding: 8,
    },
    card: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: 100,
        height: 100,
        borderRadius: 15,
        margin: 8,
    },
    card1: {
        backgroundColor: '#511D43',
        
    },
    card2: {
        backgroundColor: '#56DFCF',
        
    },
    card3: {
        backgroundColor: '#FFFADC',
        
    },
})