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
  ScrollView,
  ActivityIndicator,
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
} from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Note, NoteCategory } from '../../types';
import {
  NOTE_CATEGORY_COLORS,
  NOTE_CATEGORY_ICONS,
  NOTE_CATEGORY_LABELS,
} from '../../utils/theme';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

const CATEGORIES: NoteCategory[] = ['recipes', 'travel', 'passwords', 'other'];

function NoteCard({
  note,
  onPress,
}: {
  note: Note;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const color = NOTE_CATEGORY_COLORS[note.category];
  const icon = NOTE_CATEGORY_ICONS[note.category];
  const label = NOTE_CATEGORY_LABELS[note.category];

  const timeAgo = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.noteCard, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg }]}
      activeOpacity={0.7}
    >
      <View style={[styles.noteCategoryIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <View style={styles.noteBody}>
        <View style={styles.noteHeader}>
          <Text style={[styles.noteTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {note.title}
          </Text>
          <View style={[styles.categoryBadge, { backgroundColor: color + '20' }]}>
            <Text style={[styles.categoryBadgeText, { color }]}>{label}</Text>
          </View>
        </View>
        {note.content ? (
          <Text style={[styles.notePreview, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {note.content}
          </Text>
        ) : null}
        <Text style={[styles.noteMeta, { color: theme.colors.textTertiary }]}>
          Edited by {note.lastEditedByName} · {timeAgo(note.updatedAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function NotesScreen() {
  const { user, family } = useAuth();
  const { theme } = useTheme();

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<NoteCategory | 'all'>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  // Form
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState<NoteCategory>('other');
  const [saving, setSaving] = useState(false);

  const familyId = family?.id ?? user?.familyId;

  useEffect(() => {
    if (!familyId) return;
    const q = query(
      collection(db, 'families', familyId, 'notes'),
      orderBy('updatedAt', 'desc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          updatedAt: data.updatedAt?.toDate() ?? new Date(),
          createdAt: data.createdAt?.toDate() ?? new Date(),
        } as Note;
      });
      setNotes(list);
      setLoading(false);
    });
    return unsub;
  }, [familyId]);

  const openAddModal = useCallback(() => {
    setEditingNote(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteCategory('other');
    setModalVisible(true);
  }, []);

  const openEditModal = useCallback((note: Note) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteCategory(note.category);
    setModalVisible(true);
  }, []);

  const handleSave = async () => {
    if (!noteTitle.trim() || !familyId || !user) return;
    setSaving(true);
    try {
      const payload = {
        title: noteTitle.trim(),
        content: noteContent.trim(),
        category: noteCategory,
        lastEditedBy: user.uid,
        lastEditedByName: user.displayName,
        updatedAt: serverTimestamp(),
      };

      if (editingNote) {
        await updateDoc(doc(db, 'families', familyId, 'notes', editingNote.id), payload);
      } else {
        await addDoc(collection(db, 'families', familyId, 'notes'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalVisible(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (note: Note) => {
    if (!familyId) return;
    Alert.alert('Delete Note', `Delete "${note.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteDoc(doc(db, 'families', familyId, 'notes', note.id));
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        },
      },
    ]);
  };

  const filtered = filterCategory === 'all'
    ? notes
    : notes.filter((n) => n.category === filterCategory);

  if (!familyId) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <EmptyState icon="people-outline" title="Link your family first" subtitle="Go to your profile to link with your partner" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text, ...theme.typography.h2 }]}>
          Shared Notes
        </Text>
        <TouchableOpacity
          onPress={openAddModal}
          style={[styles.addBtn, { backgroundColor: theme.colors.primary }]}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Category filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={[styles.filterScroll, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}
      >
        <TouchableOpacity
          onPress={() => setFilterCategory('all')}
          style={[
            styles.filterChip,
            {
              backgroundColor: filterCategory === 'all' ? theme.colors.primary : theme.colors.surfaceSecondary,
              borderRadius: theme.radius.full,
            },
          ]}
        >
          <Text style={[styles.filterChipText, { color: filterCategory === 'all' ? '#FFFFFF' : theme.colors.textSecondary }]}>
            All
          </Text>
        </TouchableOpacity>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setFilterCategory(cat)}
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  filterCategory === cat
                    ? NOTE_CATEGORY_COLORS[cat]
                    : theme.colors.surfaceSecondary,
                borderRadius: theme.radius.full,
              },
            ]}
          >
            <Ionicons
              name={NOTE_CATEGORY_ICONS[cat] as any}
              size={13}
              color={filterCategory === cat ? '#FFFFFF' : theme.colors.textSecondary}
            />
            <Text style={[styles.filterChipText, { color: filterCategory === cat ? '#FFFFFF' : theme.colors.textSecondary }]}>
              {NOTE_CATEGORY_LABELS[cat]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 60 }} />
          ) : (
            <EmptyState
              icon="document-text-outline"
              title="No notes yet"
              subtitle="Tap + to add a shared note"
            />
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity onLongPress={() => handleDelete(item)} delayLongPress={600}>
            <NoteCard note={item} onPress={() => openEditModal(item)} />
          </TouchableOpacity>
        )}
      />

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setModalVisible(false)} activeOpacity={1} />
          <View style={[styles.modalSheet, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHandle, { backgroundColor: theme.colors.border }]} />
            <Text style={[styles.modalTitle, { color: theme.colors.text, ...theme.typography.h3 }]}>
              {editingNote ? 'Edit Note' : 'New Note'}
            </Text>

            {/* Category selector */}
            <Text style={[styles.categoryLabel, { color: theme.colors.textSecondary, ...theme.typography.label }]}>
              Category
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setNoteCategory(cat)}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor:
                        noteCategory === cat
                          ? NOTE_CATEGORY_COLORS[cat]
                          : theme.colors.surfaceSecondary,
                      borderRadius: theme.radius.full,
                    },
                  ]}
                >
                  <Ionicons
                    name={NOTE_CATEGORY_ICONS[cat] as any}
                    size={13}
                    color={noteCategory === cat ? '#FFFFFF' : theme.colors.textSecondary}
                  />
                  <Text style={[styles.categoryChipText, { color: noteCategory === cat ? '#FFFFFF' : theme.colors.textSecondary }]}>
                    {NOTE_CATEGORY_LABELS[cat]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Input
              label="Title *"
              placeholder="Note title"
              value={noteTitle}
              onChangeText={setNoteTitle}
              autoFocus
              containerStyle={{ marginTop: 8 }}
            />

            <Text style={[styles.contentLabel, { color: theme.colors.textSecondary, ...theme.typography.label }]}>
              Content
            </Text>
            <TextInput
              style={[
                styles.contentInput,
                {
                  color: theme.colors.text,
                  backgroundColor: theme.colors.inputBackground,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius.md,
                },
              ]}
              placeholder="Write your note here..."
              placeholderTextColor={theme.colors.textTertiary}
              value={noteContent}
              onChangeText={setNoteContent}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <Button title="Cancel" variant="secondary" onPress={() => setModalVisible(false)} style={styles.modalBtn} />
              <Button title={editingNote ? 'Save' : 'Create'} onPress={handleSave} loading={saving} disabled={!noteTitle.trim()} style={styles.modalBtn} />
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
  filterScroll: { borderBottomWidth: 1, maxHeight: 60 },
  filterRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: 'center' },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7, paddingHorizontal: 13 },
  filterChipText: { fontSize: 12, fontWeight: '500' },
  listContent: { padding: 16, paddingBottom: 100 },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  noteCategoryIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  noteBody: { flex: 1 },
  noteHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  noteTitle: { fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  categoryBadgeText: { fontSize: 10, fontWeight: '700' },
  notePreview: { fontSize: 13, lineHeight: 18, marginBottom: 6 },
  noteMeta: { fontSize: 11 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { marginBottom: 16 },
  categoryLabel: { marginBottom: 10 },
  categoryScroll: { marginBottom: 16 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 14, marginRight: 8 },
  categoryChipText: { fontSize: 12, fontWeight: '500' },
  contentLabel: { marginBottom: 8 },
  contentInput: {
    borderWidth: 1.5,
    padding: 14,
    fontSize: 15,
    minHeight: 120,
    marginBottom: 20,
    lineHeight: 22,
  },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1 },
});
