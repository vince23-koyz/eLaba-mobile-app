import React from 'react';
import { KeyboardAvoidingView, ScrollView } from 'react-native';
import renderer from 'react-test-renderer';

jest.mock('react-native-linear-gradient', () => 'LinearGradient');

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    reset: jest.fn(),
  }),
}));

jest.mock('@react-native-firebase/messaging', () => ({
  __esModule: true,
  default: () => ({
    getToken: jest.fn().mockResolvedValue('test-token'),
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('../config/api', () => ({
  api: {
    post: jest.fn(),
  },
}));

import LoginScreen from '../screens/Auth/LoginScreen';

describe('LoginScreen', () => {
  it('renders a keyboard-aware scroll layout so the password field remains usable', async () => {
    let tree: renderer.ReactTestRenderer;

    await renderer.act(async () => {
      tree = renderer.create(<LoginScreen />);
    });

    expect(tree!.root.findByType(KeyboardAvoidingView)).toBeTruthy();
    expect(tree!.root.findByType(ScrollView)).toBeTruthy();
  });
});
