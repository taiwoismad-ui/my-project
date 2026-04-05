import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Animated,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { ShoppingItem, RecurrenceType } from '../../types';
import { sendLocalNotification } from '../../services/notifications';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import AvatarBadge from '../../components/common/AvatarBadge';

const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string; icon: string }[] = [
  { value: 'none', label: 'No repeat', icon: 'close-circle-outline' },
  { value: 'weekly', label: 'Weekly', icon: 'repeat' },
  { value: 'monthly', label: 'Monthly', icon: 'calendar-outline' },
];

function ShoppingItemRow({
  item,
  onToggle,
  onDelete,
  onEdit,
  partnerColor,
  myUid,
}: {
  item: ShoppingItem;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
  partnerColor: string;
  myUid: string;
}) {
  const { theme } = useTheme();
  const strikeAnim = useRef(new Animated.Value(item.checked ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(strikeAnim, {
      toValue: item.checked ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [item.checked]);

  const isMyItem = item.addedBy === myUid;

  return (
    <Animated.View
      style={[
        styles.itemRow,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.md,
          opacity: item.checked ? 0.6 : 1,
        },
      ]}
    >
      <TouchableOpacity onPress={onToggle} style={styles.checkbox} activeOpacity={0.7}>
        <View
          style={[
            styles.checkboxInner,
            {
              borderColor: item.checked ? theme.colors.success : theme.colors.border,
              backgroundColor: item.checked ? theme.colors.success : 'transparent',
            },
          ]}
        >
          {item.checked && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
        </View>
      </TouchableOpacity>

      <View style={styles.itemContent}>
        <Animated.Text
          style={[
            styles.itemName,
            {
              color: item.checked ? theme.colors.textTertiary : theme.colors.text,
              textDecorationLine: item.checked ? 'line-through' : 'none',
            },
          ]}
        >
          {item.name}
        </Animated.Text>
        <View style={styles.itemMeta}>
          {item.recurrence !== 'none' && (
            <View style={[styles.badge, { backgroundColor: theme.colors.primary + '20' }]}>
              <Ionicons name="repeat" size={10} color={theme.colors.primary} />
              <Text style={[styles.badgeText, { color: theme.colors.primary }]}>
                {item.recurrence}
              </Text>
            </View>
          )}
          <AvatarBadge
            name={item.addedByName}
            color={isMyItem ? theme.colors.primary : partnerColor}
            size={18}
          />
        </View>
      </View>

      <TouchableOpacity onPress={onEdit} style={styles.actionBtn}>
        <Ionicons name="pencil-outline" size={16} color={theme.colors.textTertiary} />
      </TouchableOpacity>
      <TouchableOpacity onPress={onDelete} style={styles.actionBtn}>
        <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ShoppingListScreen() {
  const { user, partner, family } = useAuth();
  const { theme } = useTheme();

  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [selectedRecurrence, setSelectedRecurrence] = useState<RecurrenceType>('none');
  const [saving, setSaving] = useState(false);

  const familyId = family?.id ?? user?.familyId;

  useEffect(() => {
    if (!familyId) return;
    const q = query(
      collection(db, 'families', familyId, 'shoppingList'),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          createdAt: data.createdAt?.toDate() ?? new Date(),
          updatedAt: data.updatedAt?.toDate() ?? new Date(),
          lastRecurred: data.lastRecurred?.toDate(),
        } as ShoppingItem;
      });
      setItems(list);
      setLoading(false);
    });
    return unsub;
  }, [familyId]);

  const openAddModal = useCallback(() => {
    setEditingItem(null);
    setNewItemName('');
    setSelectedRecurrence('none');
    setModalVisible(true);
  }, []);

  const openEditModal = useCallback((item: ShoppingItem) => {
    setEditingItem(item);
    setNewItemName(item.name);
    setSelectedRecurrence(item.recurrence);
    setModalVisible(true);
  }, []);

  const handleSave = async () => {
    if (!newItemName.trim() || !familyId || !user) return;
    setSaving(true);
    try {
      if (editingItem) {
        await updateDoc(doc(db, 'families', familyId, 'shoppingList', editingItem.id), {
          name: newItemName.trim(),
          recurrence: selectedRecurrence,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'families', familyId, 'shoppingList'), {
          name: newItemName.trim(),
          checked: false,
          addedBy: user.uid,
          addedByName: user.displayName,
          recurrence: selectedRecurrence,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Notify partner
        if (partner) {
          await sendLocalNotification(
            'New Shopping Item',
            `${user.displayName} added "${newItemName.trim()}" to the list`,
          );
        }
      }
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setModalVisible(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item: ShoppingItem) => {
    if (!familyId) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await updateDoc(doc(db, 'families', familyId, 'shoppingList', item.id), {
      checked: !item.checked,
      updatedAt: serverTimestamp(),
    });
  };

  const handleDelete = async (item: ShoppingItem) => {
    if (!familyId) return;
    Alert.alert('Delete Item', `Remove "${item.name}" from the list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await deleteDoc(doc(db, 'families', familyId, 'shoppingList', item.id));
        },
      },
    ]);
  };

  const handleClearChecked = async () => {
    if (!familyId) return;
    const checked = items.filter((i) => i.checked);
    if (!checked.length) return;

    Alert.alert('Clear Checked', `Remove ${checked.length} checked item(s)?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          const batch = writeBatch(db);
          checked.forEach((item) => {
            batch.delete(doc(db, 'families', familyId, 'shoppingList', item.id));
          });
          await batch.commit();
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);
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
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text, ...theme.typography.h2 }]}>
          Shopping List
        </Text>
        <View style={styles.headerActions}>
          {checked.length > 0 && (
            <TouchableOpacity onPress={handleClearChecked} style={styles.headerBtn}>
              <Ionicons name="checkmark-done-outline" size={20} color={theme.colors.error} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={openAddModal}
            style={[styles.addBtn, { backgroundColor: theme.colors.primary }]}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={[...unchecked, ...checked]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="cart-outline"
              title="No items yet"
              subtitle="Tap + to add something to the shopping list"
            />
          )
        }
        renderItem={({ item }) => (
          <ShoppingItemRow
            item={item}
            onToggle={() => handleToggle(item)}
            onDelete={() => handleDelete(item)}
            onEdit={() => openEditModal(item)}
            partnerColor={partnerColor}
            myUid={user?.uid ?? ''}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListFooterComponent={() => {
          if (unchecked.length > 0 && checked.length > 0) {
            return (
              <View style={styles.checkedDivider}>
                <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
                <Text style={[styles.checkedLabel, { color: theme.colors.textTertiary }]}>
                  Checked ({checked.length})
                </Text>
                <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
              </View>
            );
          }
          return null;
        }}
      />

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => setModalVisible(false)}
            activeOpacity={1}
          />
          <View style={[styles.modalSheet, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHandle, { backgroundColor: theme.colors.border }]} />
            <Text style={[styles.modalTitle, { color: theme.colors.text, ...theme.typography.h3 }]}>
              {editingItem ? 'Edit Item' : 'Add Item'}
            </Text>

            <TextInput
              style={[
                styles.modalInput,
                {
                  color: theme.colors.text,
                  backgroundColor: theme.colors.inputBackground,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius.md,
                },
              ]}
              placeholder="Item name"
              placeholderTextColor={theme.colors.textTertiary}
              value={newItemName}
              onChangeText={setNewItemName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />

            <Text style={[styles.recurrenceLabel, { color: theme.colors.textSecondary, ...theme.typography.label }]}>
              Repeat
            </Text>
            <View style={styles.recurrenceRow}>
              {RECURRENCE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setSelectedRecurrence(opt.value)}
                  style={[
                    styles.recurrenceChip,
                    {
                      backgroundColor:
                        selectedRecurrence === opt.value
                          ? theme.colors.primary
                          : theme.colors.surfaceSecondary,
                      borderRadius: theme.radius.full,
                    },
                  ]}
                >
                  <Ionicons
                    name={opt.icon as any}
                    size={14}
                    color={selectedRecurrence === opt.value ? '#FFFFFF' : theme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.recurrenceText,
                      {
                        color:
                          selectedRecurrence === opt.value ? '#FFFFFF' : theme.colors.textSecondary,
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setModalVisible(false)}
                style={styles.modalBtn}
              />
              <Button
                title={editingItem ? 'Save' : 'Add'}
                onPress={handleSave}
                loading={saving}
                style={styles.modalBtn}
                disabled={!newItemName.trim()}
              />
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerBtn: { padding: 8 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  checkbox: { marginRight: 12 },
  checkboxInner: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '500' },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: { fontSize: 10, fontWeight: '600' },
  actionBtn: { padding: 8 },
  checkedDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 12,
  },
  dividerLine: { flex: 1, height: 1 },
  checkedLabel: { fontSize: 12, fontWeight: '500' },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 48,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: { marginBottom: 16 },
  modalInput: {
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1.5,
    marginBottom: 20,
  },
  recurrenceLabel: { marginBottom: 10 },
  recurrenceRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  recurrenceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  recurrenceText: { fontSize: 13, fontWeight: '500' },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1 },
});
