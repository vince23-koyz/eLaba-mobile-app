import { StyleSheet, Text, View, Linking, Image, TouchableOpacity } from 'react-native'
import React from 'react'

export default function ActionCard() {
    function openWebsite(websiteLink: string){
        Linking.openURL(websiteLink)
    }
  return (
    <View>
      <Text style={styles.headingText}>Blog Card</Text>
      <View style={[styles.card, styles.elevatedCard]}>
        <View style={styles.headingContainer}>
            <Text style={styles.headerText}>
                What's new in one piece?
            </Text>
        </View>
        <Image 
        source={{
            uri: 'https://images3.alphacoders.com/134/1342304.jpeg'
        }}
        style={styles.cardImage}
        />
        <View style={styles.bodyContainer}>
            <Text numberOfLines={3}>
                One Piece fans have much to look forward to this month, both in terms of the anime and the manga. They're both in fascinating parts at the moment, but sadly for the anime fans, June 15 is set to be a sad and disappointing day, as a huge break is coming up that fans didn’t expect.
            </Text>
        </View>
        <View style={styles.footerContainer}>
            <TouchableOpacity 
            onPress={() => openWebsite('https://gamerant.com/june-15-sad-day-one-piece-anime-episode-1134-break-release-date/')}
            >
                <Text style={styles.socialLinks}>Read more</Text>
            </TouchableOpacity>
            <TouchableOpacity 
            //onPress={() => openWebsite('https://www.facebook.com/vincemichael.panton.5')}
            >
                <Text style={styles.socialLinks}>Add me on Facebook</Text>
            </TouchableOpacity>
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
        marginHorizontal: 16
    },
    elevatedCard: {
        backgroundColor: '#EAEBD0',
        elevation: 3,
        shadowOffset: {
            width: 1,
            height: 1
        },
        shadowColor: '#333',
        shadowOpacity: 0.4
    },
    headingContainer: {
        height: 40,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center'
    },
    headerText: {
        color: '#0E2148',
        fontSize: 17,
        fontWeight: '600'
    },
    cardImage: {
        height: 190,

    },
    bodyContainer: {
        padding: 10,
    },
    footerContainer: {
        padding: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-evenly'
    },
    socialLinks: {
        fontSize: 16,
        color: '#F4E7E1',
        backgroundColor: '#521C0D',
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 4
    },
})