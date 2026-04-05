import { Dimensions } from 'react-native';

export const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const AVATAR_COLORS = [
  '#6C63FF', // violet
  '#FF6584', // pink
  '#43B89C', // teal
  '#FF9F43', // orange
  '#5352ED', // indigo
  '#2ED573', // green
  '#FF4757', // red
  '#1E90FF', // blue
];

export const PRIORITY_COLORS = {
  want_badly: '#FF6584',
  someday: '#A0AEC0',
};

export const PRIORITY_LABELS = {
  want_badly: 'Want badly',
  someday: 'Someday',
};

export const NOTE_CATEGORY_COLORS: Record<string, string> = {
  recipes: '#FF9F43',
  travel: '#1E90FF',
  passwords: '#FF4757',
  other: '#A0AEC0',
};

export const NOTE_CATEGORY_ICONS: Record<string, string> = {
  recipes: 'restaurant',
  travel: 'airplane',
  passwords: 'lock-closed',
  other: 'document-text',
};

export const NOTE_CATEGORY_LABELS: Record<string, string> = {
  recipes: 'Recipes',
  travel: 'Travel Ideas',
  passwords: 'Passwords',
  other: 'Other',
};

const palette = {
  primary: '#6C63FF',
  primaryLight: '#8B85FF',
  primaryDark: '#5349E0',
  accent: '#FF6584',
  success: '#43B89C',
  warning: '#FF9F43',
  error: '#FF4757',
  white: '#FFFFFF',
  black: '#000000',
};

export const lightTheme = {
  dark: false,
  colors: {
    ...palette,
    background: '#F7F8FC',
    surface: '#FFFFFF',
    surfaceSecondary: '#F0F1F7',
    card: '#FFFFFF',
    text: '#1A1A2E',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    inputBackground: '#F9FAFB',
    shadow: 'rgba(0,0,0,0.08)',
    overlay: 'rgba(0,0,0,0.5)',
    tabBar: '#FFFFFF',
    tabBarBorder: '#E5E7EB',
    checked: '#9CA3AF',
    statusBar: 'dark' as const,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  typography: {
    h1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
    h2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
    h3: { fontSize: 18, fontWeight: '600' as const },
    body: { fontSize: 16, fontWeight: '400' as const },
    bodySmall: { fontSize: 14, fontWeight: '400' as const },
    caption: { fontSize: 12, fontWeight: '400' as const },
    label: { fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.3 },
  },
};

export const darkTheme: typeof lightTheme = {
  dark: true,
  colors: {
    ...palette,
    background: '#0F0F1A',
    surface: '#1A1A2E',
    surfaceSecondary: '#252540',
    card: '#1E1E35',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    textTertiary: '#6B7280',
    border: '#2D2D4E',
    borderLight: '#252540',
    inputBackground: '#252540',
    shadow: 'rgba(0,0,0,0.3)',
    overlay: 'rgba(0,0,0,0.7)',
    tabBar: '#1A1A2E',
    tabBarBorder: '#2D2D4E',
    checked: '#4B5563',
    statusBar: 'light' as const,
  },
  spacing: lightTheme.spacing,
  radius: lightTheme.radius,
  typography: lightTheme.typography,
};

export type Theme = typeof lightTheme;
