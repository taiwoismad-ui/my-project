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
  ActivityIndicator,
  Image,
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
} from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { HomeWishlistItem, Priority } from '../../types';
import { fetchOpenGraphData } from '../../services/openGraph';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '../../utils/theme';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import AvatarBadge from '../../components/common/AvatarBadge';

function WishlistCard({
  item,
  onDelete,
  partnerColor,
  myUid,
}: {
  item: HomeWishlistItem;
  onDelete: () => void;
  partnerColor: string;
  myUid: string;
}) {
  const { theme } = useTheme();
  const isMyItem = item.addedBy === myUid;

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg }]}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.cardImage} resizeMode="cover" />
      ) : (
        <View style={[styles.cardImagePlaceholder, { backgroundColor: theme.colors.primary + '20' }]}>
          <Ionicons name="home-outline" size={32} color={theme.colors.primary} />
        </View>
      )}

      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.priorityBadge,
              { backgroundColor: PRIORITY_COLORS[item.priority] + '20' },
            ]}
          >
            <Text style={[styles.priorityText, { color: PRIORITY_COLORS[item.priority] }]}>
              {PRIORITY_LABELS[item.priority]}
            </Text>
          </View>
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={2}>
          {item.title}
        </Text>

        {item.url && (
          <Text style={[styles.cardUrl, { color: theme.colors.textTertiary }]} numberOfLines={1}>
            {item.url.replace(/^https?:\/\//, '')}
          </Text>
        )}

        <View style={styles.cardFooter}>
          <AvatarBadge
            name={item.addedByName}
            color={isMyItem ? theme.colors.primary : partnerColor}
            size={20}
          />
          <Text style={[styles.addedByText, { color: theme.colors.textTertiary }]}>
            {item.addedByName}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function HomeWishlistScreen() {
  const { user, partner, family } = useAuth();
  const { theme } = useTheme();

  const [items, setItems] = useState<HomeWishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [priority, setPriority] = useState<Priority>('someday');
  const [saving, setSaving] = useState(false);
  const [fetchingOG, setFetchingOG] = useState(false);

  const familyId = family?.id ?? user?.familyId;

  useEffect(() => {
    if (!familyId) return;
    const q = query(
      collection(db, 'families', familyId, 'homeWishlist'),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return { id: d.id, ...data, createdAt: data.createdAt?.toDate() ?? new Date() } as HomeWishlistItem;
      });
      setItems(list);
      setLoading(false);
    });
    return unsub;
  }, [familyId]);

  const handleFetchUrl = async () => {
    if (!url.trim()) return;
    setFetchingOG(true);
    try {
      const data = await fetchOpenGraphData(url.trim());
      if (data.title) setTitle(data.title);
      if (data.image) setImageUrl(data.image);
    } catch (_) {}
    setFetchingOG(false);
  };

  const handleAdd = async () => {
    if (!title.trim() || !familyId || !user) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'families', familyId, 'homeWishlist'), {
        title: title.trim(),
        url: url.trim() || null,
        imageUrl: imageUrl.trim() || null,
        priority,
        addedBy: user.uid,
        addedByName: user.displayName,
        createdAt: serverTimestamp(),
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalVisible(false);
      resetForm();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: HomeWishlistItem) => {
    if (!familyId) return;
    Alert.alert('Remove Item', `Remove "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteDoc(doc(db, 'families', familyId, 'homeWishlist', item.id));
        },
      },
    ]);
  };

  const resetForm = () => {
    setUrl('');
    setTitle('');
    setImageUrl('');
    setPriority('someday');
  };

  const partnerColor = partner?.avatarColor ?? '#A0AEC0';

  if (!familyId) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <EmptyState
          icon="people-outline"
          title="Link your family first"
          subtitle="Go to your profile to link with your partner"
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text, ...theme.typography.h2 }]}>
          Home Wishlist
        </Text>
        <TouchableOpacity
          onPress={() => { resetForm(); setModalVisible(true); }}
          style={[styles.addBtn, { backgroundColor: theme.colors.primary }]}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 60 }} />
          ) : (
            <EmptyState
              icon="home-outline"
              title="No home wishes yet"
              subtitle="Add items you'd love for your home"
            />
          )
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <WishlistCard
              item={item}
              onDelete={() => handleDelete(item)}
              partnerColor={partnerColor}
              myUid={user?.uid ?? ''}
            />
          </View>
        )}
      />

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setModalVisible(false)} activeOpacity={1} />
          <View style={[styles.modalSheet, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHandle, { backgroundColor: theme.colors.border }]} />
            <Text style={[styles.modalTitle, { color: theme.colors.text, ...theme.typography.h3 }]}>
              Add Home Wish
            </Text>

            {/* URL input with fetch */}
            <View style={styles.urlRow}>
              <TextInput
                style={[
                  styles.urlInput,
                  {
                    color: theme.colors.text,
                    backgroundColor: theme.colors.inputBackground,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radius.md,
                    flex: 1,
                  },
                ]}
                placeholder="Paste a URL (optional)"
                placeholderTextColor={theme.colors.textTertiary}
                value={url}
                onChangeText={setUrl}
                keyboardType="url"
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={handleFetchUrl}
                style={[styles.fetchBtn, { backgroundColor: theme.colors.primary }]}
                disabled={fetchingOG}
              >
                {fetchingOG ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Ionicons name="search" size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>

            <Input
              label="Title *"
              placeholder="What do you want?"
              value={title}
              onChangeText={setTitle}
              containerStyle={{ marginBottom: 12 }}
            />

            <Input
              label="Image URL"
              placeholder="https://..."
              value={imageUrl}
              onChangeText={setImageUrl}
              keyboardType="url"
              autoCapitalize="none"
              containerStyle={{ marginBottom: 12 }}
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
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 12, paddingBottom: 100 },
  columnWrapper: { gap: 12 },
  cardWrapper: { flex: 1 },
  card: {
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
  },
  cardImage: { width: '100%', height: 140 },
  cardImagePlaceholder: { width: '100%', height: 100, alignItems: 'center', justifyContent: 'center' },
  cardContent: { padding: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  priorityText: { fontSize: 10, fontWeight: '700' },
  cardTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4, lineHeight: 20 },
  cardUrl: { fontSize: 11, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addedByText: { fontSize: 11 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { marginBottom: 16 },
  urlRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  urlInput: { height: 52, paddingHorizontal: 14, fontSize: 14, borderWidth: 1.5 },
  fetchBtn: { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  priorityLabel: { marginBottom: 10 },
  priorityRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  priorityChip: { paddingVertical: 10, paddingHorizontal: 18 },
  priorityChipText: { fontSize: 13, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1 },
});
