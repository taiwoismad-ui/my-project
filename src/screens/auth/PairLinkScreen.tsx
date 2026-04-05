import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import AvatarBadge from '../../components/common/AvatarBadge';

export default function PairLinkScreen() {
  const { user, signOut, linkFamily } = useAuth();
  const { theme } = useTheme();

  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleShareCode = async () => {
    if (!user) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `Join my Family Planner! Use my invite code: ${user.inviteCode}\n\nDownload the app at familyplanner.app`,
        title: 'Family Planner Invite',
      });
    } catch (_) {}
  };

  const handleLinkFamily = async () => {
    if (!inviteCode.trim()) {
      setError('Please enter an invite code');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await linkFamily(inviteCode.trim());
      setSuccess('Successfully linked! Welcome to your family.');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to link family');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDark]}
        style={styles.header}
      >
        <Ionicons name="heart-circle" size={48} color="#FFFFFF" style={styles.headerIcon} />
        <Text style={styles.headerTitle}>Family Planner</Text>
      </LinearGradient>

      <View style={[styles.content, { backgroundColor: theme.colors.surface }]}>
        {/* User info */}
        <View style={[styles.userCard, { backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.lg }]}>
          <AvatarBadge name={user.displayName} color={user.avatarColor} size={52} />
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: theme.colors.text }]}>{user.displayName}</Text>
            <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]}>{user.email}</Text>
          </View>
        </View>

        {/* My invite code */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text, ...theme.typography.h3 }]}>
            Your Invite Code
          </Text>
          <Text style={[styles.sectionDesc, { color: theme.colors.textSecondary }]}>
            Share this code with your partner to link your accounts
          </Text>

          <TouchableOpacity
            style={[styles.codeBox, { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary + '30', borderRadius: theme.radius.md }]}
            onPress={handleShareCode}
            activeOpacity={0.7}
          >
            <Text style={[styles.codeText, { color: theme.colors.primary }]}>
              {user.inviteCode}
            </Text>
            <Ionicons name="share-outline" size={20} color={theme.colors.primary} />
          </TouchableOpacity>

          <Button
            title="Share Invite Code"
            onPress={handleShareCode}
            variant="outline"
            fullWidth
            style={styles.shareBtn}
          />
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
          <Text style={[styles.dividerText, { color: theme.colors.textTertiary }]}>OR</Text>
          <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
        </View>

        {/* Enter partner's code */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text, ...theme.typography.h3 }]}>
            Join Your Partner
          </Text>
          <Text style={[styles.sectionDesc, { color: theme.colors.textSecondary }]}>
            Enter your partner's invite code to link your families
          </Text>

          {error ? (
            <View style={[styles.banner, { backgroundColor: theme.colors.error + '20' }]}>
              <Ionicons name="alert-circle-outline" size={16} color={theme.colors.error} />
              <Text style={[styles.bannerText, { color: theme.colors.error }]}>{error}</Text>
            </View>
          ) : null}

          {success ? (
            <View style={[styles.banner, { backgroundColor: theme.colors.success + '20' }]}>
              <Ionicons name="checkmark-circle-outline" size={16} color={theme.colors.success} />
              <Text style={[styles.bannerText, { color: theme.colors.success }]}>{success}</Text>
            </View>
          ) : null}

          <Input
            placeholder="Enter invite code (e.g. ABCD1234)"
            value={inviteCode}
            onChangeText={(t) => setInviteCode(t.toUpperCase())}
            autoCapitalize="characters"
            leftIcon="key-outline"
            maxLength={8}
          />

          <Button
            title="Link Family"
            onPress={handleLinkFamily}
            loading={loading}
            fullWidth
          />
        </View>

        <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
          <Ionicons name="log-out-outline" size={16} color={theme.colors.textTertiary} />
          <Text style={[styles.signOutText, { color: theme.colors.textTertiary }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    alignItems: 'center',
  },
  headerIcon: { marginBottom: 8 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  content: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
    padding: 28,
    paddingTop: 32,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 28,
    gap: 14,
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 17, fontWeight: '600' },
  userEmail: { fontSize: 13, marginTop: 2 },
  section: { marginBottom: 8 },
  sectionTitle: { marginBottom: 6 },
  sectionDesc: { fontSize: 14, marginBottom: 16, lineHeight: 20 },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
  },
  codeText: { fontSize: 24, fontWeight: '700', letterSpacing: 4 },
  shareBtn: { marginBottom: 4 },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 12,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontWeight: '600' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  bannerText: { fontSize: 14, flex: 1 },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 32,
    paddingVertical: 12,
  },
  signOutText: { fontSize: 14 },
});
