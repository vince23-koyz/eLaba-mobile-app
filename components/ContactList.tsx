import { Image, ScrollView, StyleSheet, Text, View } from 'react-native'
import React from 'react'

export default function ContactList() {
    const contacts = [
        {
            uid: 1,
            name: 'Gold D. Roger',
            status: 'Pirate King',
            imageUrl: 'https://static.wikia.nocookie.net/onepiece/images/2/24/Gol_D._Roger_Anime_Infobox.png/revision/latest?cb=20230612100153',
        },
        {
            uid: 2,
            name: 'Whitebeard',
            status: 'Strongest Man, Yonko',
            imageUrl: 'https://qph.cf2.quoracdn.net/main-qimg-f35bf7ace88e275a0daad1421f903a25-pjlq',
        },
        {
            uid: 3,
            name: 'Monkey D. Garp',
            status: 'Marine, Vice Admiral',
            imageUrl: 'https://static.wikia.nocookie.net/onepiece/images/e/e1/Monkey_D._Garp_Anime_Infobox.png/revision/latest?cb=20230207160645',
        },
        {
            uid: 4,
            name: 'Kaido',
            status: 'King of the Beast',
            imageUrl: 'https://static.wikia.nocookie.net/onepiece/images/2/2d/Kaidou_Anime_Infobox.png/revision/latest?cb=20231102015517',
        },

    ]
  return (
    <View>
      <Text style={styles.headingText}>ContactList</Text>
      <ScrollView style={styles.container}
      scrollEnabled={false}
      >
        {contacts.map(({uid, name, status, imageUrl}) => (
            <View key={uid} style={styles.userCard}>
                <Image 
                source={{
                    uri: imageUrl
                }}
                style={styles.userImage}
                />
                <View>
                    <Text style={styles.userName}>{name}</Text>
                    <Text style={styles.userStatus}>{status}</Text>
                </View>
            </View>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
    headingText: {
        fontSize: 24,
        fontWeight: 'bold',
        paddingHorizontal: 8
    },
    container: {
        paddingHorizontal: 16,
        marginBottom: 4
    },
    userCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        backgroundColor: '#FCEF91',
        padding: 4,
        borderRadius: 10
    },
    userImage: {
        height: 60,
        width: 60,
        borderRadius: 60 / 2,
        marginRight: 14,
    },
    userName: {
        fontSize: 17,
        fontWeight: 600,
        color: '#511D43'

    },
    userStatus: {
        fontSize: 12,
    },
})