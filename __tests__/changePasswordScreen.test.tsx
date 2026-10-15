import React from 'react';
import renderer from 'react-test-renderer';
import { Image, Text, TextInput, TouchableOpacity } from 'react-native';

jest.mock('react-native-linear-gradient', () => 'LinearGradient');

jest.mock('../components/CustomAlertModal', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');
  return function MockCustomAlertModal(props: {
    visible: boolean;
    title: string;
    message: string;
    actions?: Array<{ text: string; onPress?: () => void }>;
  }) {
    return props.visible
      ? React.createElement(
          React.Fragment,
          null,
          React.createElement(Text, { testID: 'custom-alert' }, `${props.title}: ${props.message}`),
          ...(props.actions || []).map((action) =>
            React.createElement(TouchableOpacity, {
              key: action.text,
              testID: `custom-alert-action-${action.text}`,
              onPress: action.onPress,
            })
          )
        )
      : null;
  };
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
  getItem: jest.fn().mockResolvedValue('09123456789'),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('../config/api', () => ({
  api: {
    post: jest.fn(),
  },
  API_ENDPOINTS: {
    CUSTOMERS: {
      CHANGE_PASSWORD: '/customers/change-password',
    },
  },
}));

import ChangePasswordScreen from '../screens/Auth/ChangePasswordScreen';
import { api } from '../config/api';

describe('ChangePasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the change password screen and title', async () => {
    let tree!: renderer.ReactTestRenderer;

    await renderer.act(async () => {
      tree = renderer.create(<ChangePasswordScreen />);
    });

    const title = tree.root.findAllByType(Text).find((node) => node.props.children === 'Change Password');

    expect(title).toBeTruthy();
  });

  it('shows password visibility toggle icons instead of text labels', async () => {
    let tree!: renderer.ReactTestRenderer;

    await renderer.act(async () => {
      tree = renderer.create(<ChangePasswordScreen />);
    });

    const eyeToggleButtons = tree.root.findAll((node) =>
      node.props.accessibilityLabel && /Show|Hide .*password/.test(node.props.accessibilityLabel)
    );

    expect(eyeToggleButtons.length).toBeGreaterThanOrEqual(3);
    expect(tree.root.findAllByType(Image).length).toBeGreaterThanOrEqual(4);
  });

  it('submits the current password to the change-password endpoint', async () => {
    let tree!: renderer.ReactTestRenderer;

    await renderer.act(async () => {
      tree = renderer.create(<ChangePasswordScreen />);
    });

    const passwordInputs = tree.root.findAllByType(TextInput);
    await renderer.act(async () => {
      passwordInputs[0].props.onChangeText('current-pass');
      passwordInputs[1].props.onChangeText('new-pass');
      passwordInputs[2].props.onChangeText('new-pass');
    });

    const submitButton = tree.root.findAllByType(TouchableOpacity).find((button) =>
      button.findAllByType(Text).some((text) => text.props.children === 'Update Password')
    );

    await renderer.act(async () => {
      submitButton?.props.onPress();
    });

    expect(api.post).toHaveBeenCalledWith('/customers/change-password', {
      phone_number: '09123456789',
      current_password: 'current-pass',
      new_password: 'new-pass',
    });
  });

  it('shows a custom incorrect-password modal when the current password is rejected', async () => {
    jest.mocked(api.post).mockRejectedValueOnce({
      response: {
        status: 401,
        data: { code: 'INCORRECT_CURRENT_PASSWORD', message: 'Current password is incorrect' },
      },
    });

    let tree!: renderer.ReactTestRenderer;
    await renderer.act(async () => {
      tree = renderer.create(<ChangePasswordScreen />);
    });

    const passwordInputs = tree.root.findAllByType(TextInput);
    await renderer.act(async () => {
      passwordInputs[0].props.onChangeText('wrong-pass');
      passwordInputs[1].props.onChangeText('new-pass');
      passwordInputs[2].props.onChangeText('new-pass');
    });

    const submitButton = tree.root.findAllByType(TouchableOpacity).find((button) =>
      button.findAllByType(Text).some((text) => text.props.children === 'Update Password')
    );

    await renderer.act(async () => {
      submitButton?.props.onPress();
    });

    expect(tree.root.findByProps({ testID: 'custom-alert' }).props.children).toBe(
      'Incorrect password: The current password you entered is incorrect. Please try again.'
    );
  });

  it('shows a custom success modal when the password is updated', async () => {
    jest.mocked(api.post).mockResolvedValueOnce({
      data: { success: true, message: 'Password updated successfully' },
    });

    let tree!: renderer.ReactTestRenderer;
    await renderer.act(async () => {
      tree = renderer.create(<ChangePasswordScreen />);
    });

    const passwordInputs = tree.root.findAllByType(TextInput);
    await renderer.act(async () => {
      passwordInputs[0].props.onChangeText('current-pass');
      passwordInputs[1].props.onChangeText('new-pass');
      passwordInputs[2].props.onChangeText('new-pass');
    });

    const submitButton = tree.root.findAllByType(TouchableOpacity).find((button) =>
      button.findAllByType(Text).some((text) => text.props.children === 'Update Password')
    );

    await renderer.act(async () => {
      submitButton?.props.onPress();
    });

    expect(tree.root.findByProps({ testID: 'custom-alert' }).props.children).toBe(
      'Password updated: Your password has been updated successfully.'
    );
  });
});
