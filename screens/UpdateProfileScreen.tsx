import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import LinearGradient from 'react-native-linear-gradient'

export default function SaveScreen() {
  return (
    <LinearGradient
          colors={['#a2fff4', '#96bcff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.container}
        >
        
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
})