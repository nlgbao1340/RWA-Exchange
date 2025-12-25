/**
 * @format
 */

import 'react-native-get-random-values';
import { Buffer } from 'buffer';
global.Buffer = Buffer;

import { AppRegistry } from 'react-native';
import { enableScreens } from 'react-native-screens';
import App from './App';
import { name as appName } from './app.json';

enableScreens();
AppRegistry.registerComponent(appName, () => App);
