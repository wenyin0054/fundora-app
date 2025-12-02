import { registerRootComponent } from 'expo';
import Navigator from './screens/reuseComponet/navigator.js';
import { UserProvider } from "./screens/reuseComponet/UserContext.js";

function Main() {
  return (
    <UserProvider>
      <Navigator />
    </UserProvider>
  );
}

registerRootComponent(Main);