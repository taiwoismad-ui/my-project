import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = false,
  size = 'md',
}: ButtonProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const sizeStyles: Record<string, ViewStyle> = {
    sm: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: theme.radius.sm },
    md: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: theme.radius.md },
    lg: { paddingVertical: 18, paddingHorizontal: 32, borderRadius: theme.radius.lg },
  };

  const textSizes: Record<string, TextStyle> = {
    sm: { fontSize: 13, fontWeight: '600' },
    md: { fontSize: 16, fontWeight: '600' },
    lg: { fontSize: 18, fontWeight: '700' },
  };

  const variantStyles: Record<string, { container: ViewStyle; text: TextStyle }> = {
    primary: {
      container: { backgroundColor: theme.colors.primary },
      text: { color: theme.colors.white },
    },
    secondary: {
      container: { backgroundColor: theme.colors.surfaceSecondary },
      text: { color: theme.colors.text },
    },
    outline: {
      container: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: theme.colors.primary },
      text: { color: theme.colors.primary },
    },
    ghost: {
      container: { backgroundColor: 'transparent' },
      text: { color: theme.colors.primary },
    },
    danger: {
      container: { backgroundColor: theme.colors.error },
      text: { color: theme.colors.white },
    },
  };

  const v = variantStyles[variant];

  return (
    <AnimatedTouchable
      style={[
        styles.base,
        sizeStyles[size],
        v.container,
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        animatedStyle,
        style,
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={0.9}
    >
      {loading ? (
        <ActivityIndicator color={v.text.color as string} size="small" />
      ) : (
        <Text style={[textSizes[size], v.text, textStyle]}>{title}</Text>
      )}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
});
