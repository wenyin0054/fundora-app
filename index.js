import { registerRootComponent } from 'expo';
import Navigator from './screens/reuseComponet/navigator.js';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately

function Main() {
  return <Navigator />;
}

registerRootComponent(Main);
