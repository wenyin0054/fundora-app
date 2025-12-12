import { registerRootComponent } from 'expo';
import Navigator from './screens/reuseComponet/navigator.js';
import { UserProvider } from "./screens/reuseComponet/UserContext.js";
import { View, Text, TextInput } from "react-native";


function Main() {
  Text.defaultProps = Text.defaultProps || {};
  Text.defaultProps.style = { color: "#000" };

  TextInput.defaultProps = TextInput.defaultProps || {};
  TextInput.defaultProps.placeholderTextColor = "#777";
  TextInput.defaultProps.style = { color: "#000" };


  return (
    <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <UserProvider>
        <Navigator />
      </UserProvider>
    </View>
  );
}


registerRootComponent(Main);