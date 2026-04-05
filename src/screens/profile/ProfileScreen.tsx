import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Share,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { AVATAR_COLORS } from '../../utils/theme';
import AvatarBadge from '../../components/common/AvatarBadge';
import Button from '../../components/common/Button';

export default function ProfileScreen() {
  const { user, partner, family, signOut } = useAuth();
  const { theme, isDark } = useTheme();

  const handleShareInvite = async () => {
    if (!user) return;
    await Share.share({
      message: `Join my Family Planner! Use my invite code: ${user.inviteCode}`,
    });
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await signOut();
        },
      },
    ]);
  };

  if (!user) return null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header gradient */}
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDark]}
        style={styles.header}
      >
        <AvatarBadge name={user.displayName} color={user.avatarColor} size={80} />
        <Text style={styles.userName}>{user.displayName}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
      </LinearGradient>

      <View style={[styles.content, { backgroundColor: theme.colors.surface }]}>

        {/* Family Status */}
        <View style={[styles.card, { backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.lg }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="heart-circle-outline" size={22} color={theme.colors.primary} />
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Family</Text>
          </View>

          {family && partner ? (
            <View style={styles.partnerRow}>
              <AvatarBadge name={partner.displayName} color={partner.avatarColor} size={48} />
              <View style={styles.partnerInfo}>
                <Text style={[styles.partnerName, { color: theme.colors.text }]}>{partner.displayName}</Text>
                <Text style={[styles.partnerEmail, { color: theme.colors.textSecondary }]}>{partner.email}</Text>
                <View style={[styles.linkedBadge, { backgroundColor: theme.colors.success + '20' }]}>
                  <Ionicons name="checkmark-circle" size={12} color={theme.colors.success} />
                  <Text style={[styles.linkedText, { color: theme.colors.success }]}>Linked</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.notLinked}>
              <Text style={[styles.notLinkedText, { color: theme.colors.textSecondary }]}>
                Not linked with a partner yet
              </Text>
              <Button
                title="Link Partner"
                variant="outline"
                size="sm"
                onPress={() => {}}
                style={styles.linkBtn}
              />
            </View>
          )}
        </View>

        {/* Invite Code */}
        <View style={[styles.card, { backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.lg }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="key-outline" size={22} color={theme.colors.primary} />
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Your Invite Code</Text>
          </View>
          <TouchableOpacity
            onPress={handleShareInvite}
            style={[styles.codeBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.md }]}
          >
            <Text style={[styles.codeText, { color: theme.colors.primary }]}>{user.inviteCode}</Text>
            <Ionicons name="share-outline" size={18} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.codeHint, { color: theme.colors.textTertiary }]}>
            Share this code with your partner to link accounts
          </Text>
        </View>

        {/* Your Color */}
        <View style={[styles.card, { backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.lg }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="color-palette-outline" size={22} color={theme.colors.primary} />
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Your Color</Text>
          </View>
          <View style={styles.colorRow}>
            {AVATAR_COLORS.map((color) => (
              <View
                key={color}
                style={[
                  styles.colorDot,
                  { backgroundColor: color },
                  user.avatarColor === color && styles.colorDotSelected,
                ]}
              >
                {user.avatarColor === color && (
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                )}
              </View>
            ))}
          </View>
        </View>

        {/* App Info */}
        <View style={[styles.card, { backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.lg }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="information-circle-outline" size={22} color={theme.colors.primary} />
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>About</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Version</Text>
            <Text style={[styles.infoValue, { color: theme.colors.text }]}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Theme</Text>
            <Text style={[styles.infoValue, { color: theme.colors.text }]}>
              {isDark ? 'Dark' : 'Light'} (System)
            </Text>
          </View>
          {family && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Family ID</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]} numberOfLines={1}>
                {family.id.slice(0, 12)}...
              </Text>
            </View>
          )}
        </View>

        <Button
          title="Sign Out"
          variant="danger"
          onPress={handleSignOut}
          fullWidth
          style={styles.signOutBtn}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingBottom: 48,
    alignItems: 'center',
    gap: 8,
  },
  userName: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginTop: 8 },
  userEmail: { fontSize: 14, color: 'rgba(255,255,255,0.75)' },
  content: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    padding: 24,
    paddingTop: 28,
    gap: 16,
  },
  card: { padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  partnerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  partnerInfo: { flex: 1 },
  partnerName: { fontSize: 16, fontWeight: '600' },
  partnerEmail: { fontSize: 13, marginTop: 2 },
  linkedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  linkedText: { fontSize: 11, fontWeight: '600' },
  notLinked: { gap: 12 },
  notLinkedText: { fontSize: 14 },
  linkBtn: { alignSelf: 'flex-start' },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  codeText: { fontSize: 22, fontWeight: '700', letterSpacing: 4 },
  codeHint: { fontSize: 12, lineHeight: 16 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDotSelected: {
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '500' },
  signOutBtn: { marginTop: 8, marginBottom: 40 },
});
