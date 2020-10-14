/** QR-to-QR - 2020 - Sidney Radcliffe 
 * Version 0.0.0.. there may be bugs..
*/
import * as React from 'react'
import {
  Text, View, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  Clipboard, Alert, Image, AppState, ActivityIndicator
} from 'react-native'
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, useFocusEffect } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { Fontisto, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import { BarCodeScanner } from 'expo-barcode-scanner'
import QRCode from 'react-native-qrcode-svg'

if (!__DEV__) {
  console.log = () => { }
}

console.log('\n\n#### App was refreshed ################\n\n')

// Fix a react native 63 issue, delayPressIn was set to slow...:
TouchableOpacity.defaultProps = { ...(TouchableOpacity.defaultProps || {}), delayPressIn: 0 }

// Parameters:
const MESSAGE_LENGTH = 64  // Number of chars sent in each QR.
const CONFIRMATION_A = '{{a}}'  // One of the two confirmations sent by ReceiveScreen.
const CONFIRMATION_B = '{{b}}'

// Split text into strings of length MESSAGE_LENGTH.
// ('.' doesn't match new lines, '[\s\S]' does.)
const splitTextRegex = new RegExp(`[\\s\\S]{1,${MESSAGE_LENGTH}}`, "g")
const splitText = text => text.match(splitTextRegex)


// ↓↓↓↓↓↓↓↓↓ SCREENS ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓

const Stack = createStackNavigator()
const navRef = React.createRef()

export default function Main() {
  return <ErrorBoundary><App /></ErrorBoundary>
}

function App() {
  const hasScannerPermission = useScannerPermission()
  const isAppActive = useIsAppActive()
  const [isScanPaused, setIsScanPaused] = React.useState(false)
  const [onScan, _setOnScan] = React.useState()

  function setOnScan(func) {
    /** To let the child screens use the scanner. */
    if (!func) {
      _setOnScan(null)
      return
    }
    _setOnScan(() => {
      return ({ data }) => {
        setIsScanPaused(true)
        func({ data })
        setIsScanPaused(false)
      }
    })
  }

  if (hasScannerPermission === null) {
    return (
      <View style={styles.bgContainer}>
        <Text>Requesting camera permission...</Text>
      </View>
    )
  }
  if (hasScannerPermission === false) {
    return (
      <View style={styles.bgContainer}>
        <Text>This app requires camera permission.</Text>
      </View>
    )
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.c }}>
      <NavigationContainer ref={navRef}>
        <Stack.Navigator
          screenOptions={{
            headerBackTitle: 'Back',
            headerTitleAlign: 'center',
            headerTitle: () => <Logo />,
            headerStyle: { backgroundColor: colors.c },
          }}
        >

          <Stack.Screen name="Home"
            component={HomeScreen}
            options={{
              headerRight: () => < AboutButtonHeader
                onPress={() => navRef.current?.navigate('About')}
              />
            }}
          />

          <Stack.Screen name="PreSend" component={PreSendScreen} />

          <Stack.Screen name="Send">
            {navProps => <SendScreen {...navProps} setOnScan={setOnScan} />}
          </Stack.Screen>

          <Stack.Screen name="Receive">
            {navProps => <ReceiveScreen {...navProps} setOnScan={setOnScan} />}
          </Stack.Screen>

          <Stack.Screen name="About" component={AboutScreen} />

        </Stack.Navigator>
      </NavigationContainer>

      {isAppActive && <BarCodeScanner
        onBarCodeScanned={isScanPaused ? undefined : onScan}
        type={BarCodeScanner.Constants.Type.front}
        barCodeTypes={[BarCodeScanner.Constants.BarCodeType.qr]}
        style={{ position: 'absolute', width: 1, height: 1 }}
      // Don't want to render scanner, but if try to stop
      // (e.g. set width/height to zero),
      // the scanning stops happening...
      />}

      <StatusBar
        style="auto"
        backgroundColor={colors.c}
        barStyle="light-content"
      />
    </View>
  )
}

function HomeScreen({ navigation }) {
  return (
    <View style={{ flex: 1 }}>

      <TouchableOpacity
        onPress={() => navigation.navigate('PreSend')}
        style={[styles.container, { backgroundColor: colors.b }]}
      >
        <FontAwesome name="send" size={24} color={colors.a} />
        <Text style={[styles.strongText, { color: colors.a, paddingTop: 5 }]}>
          SEND
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate('Receive')}
        style={[styles.container, { backgroundColor: colors.d }]}
      >
        <MaterialCommunityIcons name="download" size={32} color={colors.e} />
        <Text style={[styles.strongText, { color: colors.e }]}>
          RECEIVE
        </Text>
      </TouchableOpacity>

    </View>
  )
}

function PreSendScreen({ navigation }) {
  /** Prepare the text to send. */

  const [textToSend, setTextToSend] = React.useState('')

  function onPressSendMessage() {
    if (!textToSend) {
      return
    }
    const messages = splitText(textToSend)
    const numMessages = messages.length
    navigation.navigate('Send', { messages, numMessages })
  }

  React.useLayoutEffect(() => {
    // Place 'Send' button in navigation header.
    if (!textToSend) {
      navigation.setOptions({ headerRight: null })
      return
    }
    navigation.setOptions({
      headerRight: () => <SendButtonHeader onPress={onPressSendMessage} />,
    })
  }, [navigation, textToSend])

  React.useEffect(() =>
    // Check with user before unmounting this screen.
    navigation.addListener('beforeRemove', (e) => {
      if (!textToSend) {
        return
      }
      e.preventDefault()
      Alert.alert(
        'Leave this screen?',
        'The text you have entered will be discarded.',
        [
          {
            text: "Don't leave",
            style: 'cancel',
            onPress: () => { }
          },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      )
    }), [navigation, textToSend])

  return (
    <View style={{ flex: 1 }} >

      <TextInput
        value={textToSend}
        onChangeText={text => setTextToSend(text)}
        style={{
          flexGrow: 1,
          backgroundColor: colors.b,
          textAlignVertical: 'top',
          color: 'black',
          fontSize: 18,
          padding: 14,
        }}
        multiline={true}
        editable={true}
        placeholder={'Enter the text that you would like to send.'}
      />

    </View>
  )
}

function SendScreen({ route, navigation, setOnScan }) {
  /** Send the text. */
  const { messages, numMessages } = route.params

  const [messageIdx, setMessageIndex] = React.useState(0)
  const [message, setMessage] = React.useState()
  const [confirmation, setConfirmation] = React.useState()  // Alternates between two known values.

  React.useEffect(() => {
    // Set what happens when a QR is scanned.
    if (messageIdx === numMessages) {
      navigation.goBack()
      Alert.alert('Success!', 'Your message has been sent.')
    }
    else {
      function onScan({ data }) {
        if (messageIdx === numMessages) {
          return
        }
        console.log('Send onscan called')
        if (data !== CONFIRMATION_A && data !== CONFIRMATION_B) {
          console.log('SendScreen onScan: received invalid data, data=', data)
        }
        else {
          if (data !== confirmation) {
            const newConfirmation = data
            const newMessageIdx = messageIdx + 1
            setConfirmation(newConfirmation)
            setMessageIndex(newMessageIdx)
            console.log(`SendScreen onScan: newConfirmation=${newConfirmation}, newMessageIdx=${messageIdx}`)
          }
        }
      }
      setOnScan(onScan)
    }
  }, [messageIdx])

  React.useEffect(() => {
    // Ensure two consecutive messages aren't identical:
    let newMessage = messages[messageIdx]
    const prevMessage = messages[messageIdx - 1]
    const prevPrevMessage = messages[messageIdx - 2]

    if (newMessage === prevMessage && newMessage !== prevPrevMessage) {
      newMessage = newMessage + 'e'  // append a char, to differentiate identical messages.
    }
    setMessage(newMessage)
  }, [messageIdx])

  useFocusEffect(
    // Clean up when leave screen.
    React.useCallback(() => {
      // On focus... don't do anything..
      return () => {
        // On unfocus, clean up.
        console.log('Cleaning up SendScreen')
        setOnScan(null)
      }
    }, [])
  )

  return (
    <View style={[styles.container, { backgroundColor: colors.b }]}>
      {message && <FlexQR value={message} />}
    </View>
  )
}

function ReceiveScreen({ navigation, setOnScan }) {
  const [message, setMessage] = React.useState()
  const [confirmation, setConfirmation] = React.useState('_')
  const messages = React.useRef('')

  function toggleConfirmation() {
    setConfirmation((confirmation === CONFIRMATION_A) ? CONFIRMATION_B : CONFIRMATION_A)
  }

  const copyToClipboard = () => {
    if (messages.current && messages.current.length > 0) {
      Clipboard.setString(messages.current)
      Alert.alert('Copied text.')
    }
  }

  React.useEffect(() => {
    function onScan({ data }) {
      console.log('Receive onScan called')
      if (data !== message && data !== CONFIRMATION_A && data !== CONFIRMATION_B) {
        console.log('ReceiveScreen: received new data.', data)
        const newMessage = data.slice(0, MESSAGE_LENGTH)
        messages.current += newMessage
        setMessage(newMessage)
        toggleConfirmation()
      }
    }
    setOnScan(onScan)
  }, [confirmation])

  React.useEffect(() =>
    // Check with user before unmounting this screen.
    navigation.addListener('beforeRemove', (e) => {
      if (!messages.current) {
        return
      }
      e.preventDefault()
      Alert.alert(
        'Leave this screen?',
        "The text you received will be discarded.",
        [
          { text: "Don't leave", style: 'cancel', onPress: () => { } },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      )
    }), [navigation])

  useFocusEffect(
    // Clean up when leave screen.
    React.useCallback(() => {
      // On focus... don't do anything.
      return () => {
        // On unfocus, clean up.
        console.log('Cleaning up ReceiveScreen')
        setOnScan(null)
      }
    }, [])
  )

  return (
    <View style={{ flex: 1, backgroundColor: colors.d }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <FlexQR value={confirmation} />
      </View>

      <View style={{ flex: 1, justifyContent: 'center', margin: '6%' }}>

        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <Text
            selectable={true}
            selectionColor={colors.a}
            style={{ flex: 1, height: '100%', backgroundColor: colors.e, color: 'white', fontSize: 18 }}
          >
            {messages.current}
          </Text>
        </ScrollView>

        <TouchableOpacity
          style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 50, backgroundColor: colors.c }}
          onPress={copyToClipboard}
        >
          <Text style={{ color: colors.a, fontSize: 16 }}>{'Copy all  '}</Text>
          <Fontisto name="copy" size={24} color={colors.a} />
        </TouchableOpacity>

      </View>
    </View>
  )
}

function AboutScreen() {
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>

      <View style={styles.bgContainer}>

        <Text style={{ fontSize: 18, textAlign: 'center', padding: 20, color: colors.a }}>
          This app enables a pair of phones
          (that have front facing cameras),
          to share text using QR codes.
        </Text>

        <Image source={require('./assets/phone2phone.png')} style={{ resizeMode: 'contain', flex: 1 }} />

        <Text style={{ fontSize: 18, textAlign: 'center', padding: 20, color: colors.a }}>
          {'Instructions:\n' +
            '1. Put phone A into send mode.\n' +
            '2. Put phone B into receive mode.\n' +
            '3. Put the two phones face to face (experiment with the distance).\n' +
            '4. You should see the QRs change, and the text gradually appearing on phone B.\n' +
            "\n Note that the camera's view is not displayed, in order to improve the QR read rate."
            + '\n\nVersion ' + Constants.manifest.version
            + '\nCreated by Sidney Radcliffe\n'
            // + 'Code available on GitHub.'
          }
        </Text>

      </View>
    </ScrollView>
  )
}

// ↑↑↑↑↑↑↑↑↑ SCREENS ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑


// ↓↓↓↓↓↓↓↓↓ HOOKS ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓

function useScannerPermission() {
  /** Ask for permission to use the barcode scanner. */
  const [hasScannerPermission, setHasScannerPermission] = React.useState(null)

  React.useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync()
      setHasScannerPermission(status === 'granted')
    })()
  }, [])

  return hasScannerPermission
}

function useIsAppActive() {
  /** Whether the app is in the foreground. */
  const [isActive, setIsActive] = React.useState()

  React.useEffect(() => {
    AppState.addEventListener('change', handleChange)
    return () => AppState.removeEventListener('change', handleChange)
  }, [])

  const handleChange = (newState) => {
    console.log('AppState =', newState)
    setIsActive(newState === "active")
  }

  return isActive
}

// ↑↑↑↑↑↑↑↑↑ HOOKS ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑


// ↓↓↓↓↓↓↓↓↓ COMPONENTS ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓

function Logo() {
  /** The logo centered in the header. */
  return <Image
    source={require('./assets/logo.png')}
    style={{ height: '50%', resizeMode: 'contain' }}
  />
}

function FlexQR(props) {
  /** An auto sized QR code, based on the container size. */
  const [qrSize, setQrSize] = React.useState(0)
  const MAX_QR_SIZE = 220  // limit how big the QR can get.
  return (
    <View
      style={styles.container}
      onLayout={(event) => {
        var { width, height } = event.nativeEvent.layout
        setQrSize(Math.min(Math.min(width, height), MAX_QR_SIZE))
      }}
    >
      <QRCode value={props.value} size={qrSize} />
    </View>
  )
}

function SendButtonHeader({ onPress }) {
  /** Send button to put in navigation header. */
  return (
    <TouchableOpacity onPress={onPress}
      style={[styles.container, { flexDirection: 'row', paddingHorizontal: 20 }]}>
      <Text style={{ fontSize: 18, paddingRight: 8, color: colors.a }}>Send </Text>
      <FontAwesome name="send" size={20} color={colors.a} />
    </TouchableOpacity>
  )
}

function AboutButtonHeader({ onPress }) {
  /** Send button to put in navigation header. */
  return (
    <TouchableOpacity onPress={onPress}
      style={[styles.container]}>
      <Text style={{ fontSize: 18, paddingRight: 8, color: colors.a }}>
        About
      </Text>
    </TouchableOpacity>
  )
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, errorMessage: null }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.    
    return { hasError: true, errorMessage: error.message }
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.bgContainer}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, width: '100%' }}>
            <Text style={{ fontSize: 20 }}>
              {'The app has encountered an error:\n\n'}
            </Text>
            <Text style={{ textAlign: 'left' }}>
              {this.state.errorMessage}
            </Text>
          </ScrollView>
        </View>
      )
    }
    return this.props.children
  }
}

// ↑↑↑↑↑↑↑↑↑ COMPONENTS ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑


// ↓↓↓↓↓↓↓↓↓ STYLE ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓

const colors = {
  a: '#557763',
  b: '#cdda95',
  c: '#f0eed6',
  d: '#a4d4f6',
  e: '#427ac1',
}

const styles = StyleSheet.create({
  'container': {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  'bgContainer': {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    backgroundColor: colors.c,
  },
  'textInput': {
    flexGrow: 1,
    textAlignVertical: 'top',
    backgroundColor: 'lightgray',
    color: 'black',
  },
  'strongText': {
    fontWeight: 'bold',
    fontSize: 28,
    textAlign: 'center',
  }
})

// ↑↑↑↑↑↑↑↑↑ STYLE ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
