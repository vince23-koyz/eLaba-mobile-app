# Auth Screens

This folder contains all authentication-related screens for the eLaba customer app.

## Screens

- **WelcomeScreen.tsx** - Landing screen with app introduction and animations
- **LoginScreen.tsx** - User login with phone number and password
- **SignupScreen.tsx** - User registration with OTP verification
- **PasswordRecovery.tsx** - Multi-step password recovery with phone + OTP verification

## Features

- Phone number-based authentication
- OTP verification for signup and password recovery
- Consistent UI/UX design patterns
- Proper navigation flow
- Form validation and error handling

## Usage

All screens are exported from the index.ts file for easy importing:

```tsx
import { LoginScreen, SignupScreen, PasswordRecovery } from '../screens/Auth';
```
