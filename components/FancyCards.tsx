import { Image, StyleSheet, Text, View } from 'react-native'
import React from 'react'

export default function FancyCards() {
  return (
    <View>
    <Text style={styles.headingText}>Anime Characters</Text>
        <View style={[styles.card, styles.cardElevated]}>
            <Image
            source={{
                uri: 'https://static.beebom.com/wp-content/uploads/2024/05/Luffy-devil-fruit.jpg?quality=75&strip=all'
            }}
            style={styles.cardImage}
            />
            <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Monkey D. Luffy</Text>
            <Text style={styles.cardLabel}>One Piece</Text>
            <Text style={styles.cardDescription}>
                A legendary high-seas quest unlike any other. Luffy is a young adventurer who has longed for a life of freedom ever since he can remember. He sets off from his small village on a perilous journey to find the legendary fabled treasure, ONE PIECE, to become King of the Pirates!
            </Text>
            <Text style={styles.cardFooter}>Weekly Release!</Text>
            </View>
        </View>
    </View>

  )
}

const styles = StyleSheet.create({
    headingText: {
        fontSize: 24,
        fontWeight: 'bold',
        paddingHorizontal: 8,
    },
    card:  {
        width: 350,
        height: 360,
        borderRadius: 6,
        marginVertical: 12,
        marginHorizontal: 16,
    },
    cardElevated: {
        backgroundColor: '#FCEF91',
        elevation: 3,
        shadowOffset: {
            width: 1,
            height: 1
        }
    },
    cardImage: {
        height: 180,
        marginBottom: 8,
        borderTopLeftRadius: 6,
        borderTopRightRadius: 6,
    },
    cardBody: {
        flex: 1,
        flexGrow: 1,
        paddingHorizontal: 15
    },
    cardTitle: {
        fontWeight: 'bold',
        color: '#131D4F',
        fontSize: 22,
        marginBottom: 4,
    },
    cardLabel: {
        color: '#131D4F',
        fontSize: 16,
        marginBottom: 6
    },
    cardDescription: {
        color: '#0E2148',
        fontSize: 12,
        marginBottom: 12,
        marginTop: 5,
        flexShrink: 1
    },
    cardFooter: {
        color: '#131D4F'
    },
})