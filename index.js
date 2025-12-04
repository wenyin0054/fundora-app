import { registerRootComponent } from 'expo';
import Navigator from './screens/reuseComponet/navigator.js';
import { UserProvider } from "./screens/reuseComponet/UserContext.js";
import { View } from "react-native";
import { Text, TextInput } from "react-native";

Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.style = { color: "#000" };

TextInput.defaultProps = TextInput.defaultProps || {};
TextInput.defaultProps.placeholderTextColor = "#777";
TextInput.defaultProps.style = { color: "#000" };


function Main() {
  return (
    <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <UserProvider>
        <Navigator />
      </UserProvider>
    </View>
  );
}


registerRootComponent(Main);