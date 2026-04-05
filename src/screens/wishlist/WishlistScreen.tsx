import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  Alert,
  KeyboardAvoidingView,
  Share,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { WishlistItem, Priority } from '../../types';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '../../utils/theme';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

type WishlistType = 'personal' | 'shared';

function WishlistItemRow({
  item,
  onDelete,
  canDelete,
}: {
  item: WishlistItem;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const { theme } = useTheme();
  return (
    <View style={[styles.itemRow, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md }]}>
      <View
        style={[
          styles.priorityDot,
          { backgroundColor: PRIORITY_COLORS[item.priority] },
        ]}
      />
      <View style={styles.itemContent}>
        <Text style={[styles.itemTitle, { color: theme.colors.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.itemMeta}>
          <Text style={[styles.addedBy, { color: theme.colors.textTertiary }]}>
            {item.addedByName}
          </Text>
          <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLORS[item.priority] + '20' }]}>
            <Text style={[styles.priorityBadgeText, { color: PRIORITY_COLORS[item.priority] }]}>
              {PRIORITY_LABELS[item.priority]}
            </Text>
          </View>
        </View>
      </View>
      {canDelete && (
        <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function WishlistScreen() {
  const { user, partner, family } = useAuth();
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState<WishlistType>('personal');
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [priority, setPriority] = useState<Priority>('someday');
  const [saving, setSaving] = useState(false);

  const familyId = family?.id ?? user?.familyId;

  const getCollectionPath = useCallback(
    (type: WishlistType) => {
      if (type === 'personal' && user) return `users/${user.uid}/wishlist`;
      if (type === 'shared' && familyId) return `families/${familyId}/sharedWishlist`;
      return null;
    },
    [user, familyId],
  );

  useEffect(() => {
    const path = getCollectionPath(activeTab);
    if (!path) { setItems([]); setLoading(false); return; }

    setLoading(true);
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return { id: d.id, ...data, createdAt: data.createdAt?.toDate() ?? new Date() } as WishlistItem;
      });
      setItems(list);
      setLoading(false);
    });
    return unsub;
  }, [activeTab, getCollectionPath]);

  const handleAdd = async () => {
    if (!title.trim() || !user) return;
    const path = getCollectionPath(activeTab);
    if (!path) return;

    setSaving(true);
    try {
      await addDoc(collection(db, path), {
        title: title.trim(),
        url: url.trim() || null,
        priority,
        addedBy: user.uid,
        addedByName: user.displayName,
        createdAt: serverTimestamp(),
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalVisible(false);
      setTitle(''); setUrl(''); setPriority('someday');
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: WishlistItem) => {
    const path = getCollectionPath(activeTab);
    if (!path) return;

    Alert.alert('Remove Item', `Remove "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteDoc(doc(db, path, item.id));
        },
      },
    ]);
  };

  const handleShare = async () => {
    if (!user) return;
    const type = activeTab;
    const id = type === 'personal' ? user.uid : familyId;
    if (!id) return;

    const shareUrl = `https://familyplanner.app/wishlist/${type}/${id}`;
    await Share.share({
      message: `Check out my ${type} wishlist: ${shareUrl}`,
      url: shareUrl,
    });
  };

  const canDelete = useCallback(
    (item: WishlistItem) => {
      if (activeTab === 'personal') return item.addedBy === user?.uid;
      return true; // both can delete from shared
    },
    [activeTab, user],
  );

  const tabs: { type: WishlistType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { type: 'personal', label: 'My List', icon: 'person-outline' },
    { type: 'shared', label: 'Our List', icon: 'heart-outline' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text, ...theme.typography.h2 }]}>
          Wishlists
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShare} style={styles.headerBtn}>
            <Ionicons name="share-outline" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setTitle(''); setUrl(''); setPriority('someday'); setModalVisible(true); }}
            style={[styles.addBtn, { backgroundColor: theme.colors.primary }]}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.type}
            onPress={() => setActiveTab(tab.type)}
            style={[
              styles.tab,
              activeTab === tab.type && [styles.tabActive, { borderBottomColor: theme.colors.primary }],
            ]}
          >
            <Ionicons
              name={tab.icon}
              size={16}
              color={activeTab === tab.type ? theme.colors.primary : theme.colors.textTertiary}
            />
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === tab.type ? theme.colors.primary : theme.colors.textTertiary,
                  fontWeight: activeTab === tab.type ? '600' : '400',
                },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 60 }} />
          ) : (
            <EmptyState
              icon={activeTab === 'personal' ? 'gift-outline' : 'heart-outline'}
              title={activeTab === 'personal' ? 'Your wishlist is empty' : 'Shared wishlist is empty'}
              subtitle="Tap + to add something you'd love"
            />
          )
        }
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <WishlistItemRow
            item={item}
            onDelete={() => handleDelete(item)}
            canDelete={canDelete(item)}
          />
        )}
      />

      {/* Add Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setModalVisible(false)} activeOpacity={1} />
          <View style={[styles.modalSheet, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHandle, { backgroundColor: theme.colors.border }]} />
            <Text style={[styles.modalTitle, { color: theme.colors.text, ...theme.typography.h3 }]}>
              Add to {activeTab === 'personal' ? 'My' : 'Shared'} Wishlist
            </Text>

            <Input
              label="Title *"
              placeholder="What do you want?"
              value={title}
              onChangeText={setTitle}
              autoFocus
            />

            <Input
              label="URL (optional)"
              placeholder="https://..."
              value={url}
              onChangeText={setUrl}
              keyboardType="url"
              autoCapitalize="none"
            />

            <Text style={[styles.priorityLabel, { color: theme.colors.textSecondary, ...theme.typography.label }]}>
              Priority
            </Text>
            <View style={styles.priorityRow}>
              {(['want_badly', 'someday'] as Priority[]).map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPriority(p)}
                  style={[
                    styles.priorityChip,
                    {
                      backgroundColor: priority === p ? PRIORITY_COLORS[p] : theme.colors.surfaceSecondary,
                      borderRadius: theme.radius.full,
                    },
                  ]}
                >
                  <Text style={[styles.priorityChipText, { color: priority === p ? '#FFFFFF' : theme.colors.textSecondary }]}>
                    {PRIORITY_LABELS[p]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <Button title="Cancel" variant="secondary" onPress={() => setModalVisible(false)} style={styles.modalBtn} />
              <Button title="Add" onPress={handleAdd} loading={saving} disabled={!title.trim()} style={styles.modalBtn} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {},
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerBtn: { padding: 8 },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {},
  tabText: { fontSize: 14 },
  listContent: { padding: 16, paddingBottom: 100 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  priorityDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: '500', marginBottom: 4 },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addedBy: { fontSize: 12 },
  priorityBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  priorityBadgeText: { fontSize: 10, fontWeight: '700' },
  deleteBtn: { padding: 8 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { marginBottom: 16 },
  priorityLabel: { marginBottom: 10 },
  priorityRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  priorityChip: { paddingVertical: 10, paddingHorizontal: 18 },
  priorityChipText: { fontSize: 13, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1 },
});
