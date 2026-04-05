import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
  Alert,
  KeyboardAvoidingView,
  FlatList,
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
import { Calendar, DateData } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { CalendarEvent } from '../../types';
import { scheduleEventReminder, cancelNotification } from '../../services/notifications';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

function EventCard({
  event,
  onPress,
  myUid,
}: {
  event: CalendarEvent;
  onPress: () => void;
  myUid: string;
}) {
  const { theme } = useTheme();
  const isMyEvent = event.createdBy === myUid;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.eventCard,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.md,
          borderLeftColor: event.createdByColor,
        },
      ]}
      activeOpacity={0.7}
    >
      <View style={[styles.eventColorBar, { backgroundColor: event.createdByColor }]} />
      <View style={styles.eventContent}>
        <Text style={[styles.eventTitle, { color: theme.colors.text }]}>{event.title}</Text>
        <View style={styles.eventMeta}>
          {event.time && (
            <View style={styles.eventMetaItem}>
              <Ionicons name="time-outline" size={12} color={theme.colors.textTertiary} />
              <Text style={[styles.eventMetaText, { color: theme.colors.textTertiary }]}>
                {event.time}
              </Text>
            </View>
          )}
          <View style={styles.eventMetaItem}>
            <Ionicons name="person-outline" size={12} color={theme.colors.textTertiary} />
            <Text style={[styles.eventMetaText, { color: theme.colors.textTertiary }]}>
              {event.createdByName}
            </Text>
          </View>
        </View>
        {event.note && (
          <Text style={[styles.eventNote, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {event.note}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function CalendarScreen() {
  const { user, partner, family } = useAuth();
  const { theme } = useTheme();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Form state
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState(new Date());
  const [eventTime, setEventTime] = useState<Date | null>(null);
  const [eventNote, setEventNote] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const familyId = family?.id ?? user?.familyId;

  useEffect(() => {
    if (!familyId) return;
    const q = query(
      collection(db, 'families', familyId, 'events'),
      orderBy('date', 'asc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          createdAt: data.createdAt?.toDate() ?? new Date(),
          updatedAt: data.updatedAt?.toDate() ?? new Date(),
        } as CalendarEvent;
      });
      setEvents(list);
    });
    return unsub;
  }, [familyId]);

  // Build calendar markers
  const markedDates = events.reduce<Record<string, any>>((acc, event) => {
    const existing = acc[event.date];
    const dot = { key: event.id, color: event.createdByColor };
    if (existing) {
      acc[event.date] = {
        ...existing,
        dots: [...(existing.dots ?? []), dot],
      };
    } else {
      acc[event.date] = { dots: [dot] };
    }
    return acc;
  }, {});

  if (selectedDate) {
    markedDates[selectedDate] = {
      ...(markedDates[selectedDate] ?? {}),
      selected: true,
      selectedColor: theme.colors.primary,
    };
  }

  const eventsForSelectedDate = events.filter((e) => e.date === selectedDate);

  const openAddModal = useCallback(() => {
    setEventTitle('');
    setEventDate(new Date(selectedDate + 'T12:00:00'));
    setEventTime(null);
    setEventNote('');
    setEditMode(false);
    setModalVisible(true);
  }, [selectedDate]);

  const openEditModal = useCallback((event: CalendarEvent) => {
    setEventTitle(event.title);
    setEventDate(new Date(event.date + 'T12:00:00'));
    setEventTime(event.time ? new Date(`${event.date}T${event.time}:00`) : null);
    setEventNote(event.note ?? '');
    setEditMode(true);
    setSelectedEvent(event);
    setDetailModalVisible(false);
    setModalVisible(true);
  }, []);

  const formatTime = (date: Date): string => {
    return date.toTimeString().slice(0, 5);
  };

  const formatDateDisplay = (date: Date): string => {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const handleSave = async () => {
    if (!eventTitle.trim() || !familyId || !user) return;
    setSaving(true);
    try {
      const dateStr = eventDate.toISOString().split('T')[0];
      const timeStr = eventTime ? formatTime(eventTime) : undefined;

      // Cancel old notification
      if (editMode && selectedEvent?.notificationId) {
        await cancelNotification(selectedEvent.notificationId);
      }

      // Schedule new notification
      let notificationId: string | null = null;
      if (eventTime) {
        const eventDateTime = new Date(`${dateStr}T${timeStr}:00`);
        notificationId = await scheduleEventReminder(
          selectedEvent?.id ?? 'new',
          eventTitle.trim(),
          eventDateTime,
        );
      }

      const payload = {
        title: eventTitle.trim(),
        date: dateStr,
        time: timeStr ?? null,
        note: eventNote.trim() || null,
        createdBy: user.uid,
        createdByName: user.displayName,
        createdByColor: user.avatarColor,
        notificationId: notificationId ?? null,
        updatedAt: serverTimestamp(),
      };

      if (editMode && selectedEvent) {
        await updateDoc(doc(db, 'families', familyId, 'events', selectedEvent.id), payload);
      } else {
        await addDoc(collection(db, 'families', familyId, 'events'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalVisible(false);
      setSelectedDate(dateStr);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (event: CalendarEvent) => {
    if (!familyId) return;
    Alert.alert('Delete Event', `Delete "${event.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (event.notificationId) await cancelNotification(event.notificationId);
          await deleteDoc(doc(db, 'families', familyId, 'events', event.id));
          setDetailModalVisible(false);
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        },
      },
    ]);
  };

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
          Calendar
        </Text>
        <TouchableOpacity
          onPress={openAddModal}
          style={[styles.addBtn, { backgroundColor: theme.colors.primary }]}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Calendar */}
        <Calendar
          onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
          markedDates={markedDates}
          markingType="multi-dot"
          theme={{
            backgroundColor: theme.colors.surface,
            calendarBackground: theme.colors.surface,
            textSectionTitleColor: theme.colors.textSecondary,
            selectedDayBackgroundColor: theme.colors.primary,
            selectedDayTextColor: '#FFFFFF',
            todayTextColor: theme.colors.primary,
            dayTextColor: theme.colors.text,
            textDisabledColor: theme.colors.textTertiary,
            dotColor: theme.colors.primary,
            monthTextColor: theme.colors.text,
            arrowColor: theme.colors.primary,
            indicatorColor: theme.colors.primary,
          }}
        />

        {/* Selected day events */}
        <View style={styles.eventsList}>
          <Text style={[styles.eventsDateTitle, { color: theme.colors.text, ...theme.typography.h3 }]}>
            {selectedDate === new Date().toISOString().split('T')[0]
              ? 'Today'
              : new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'long', month: 'long', day: 'numeric',
                })}
          </Text>

          {eventsForSelectedDate.length === 0 ? (
            <View style={styles.noEvents}>
              <Text style={[styles.noEventsText, { color: theme.colors.textTertiary }]}>
                No events this day
              </Text>
            </View>
          ) : (
            eventsForSelectedDate.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                myUid={user?.uid ?? ''}
                onPress={() => { setSelectedEvent(event); setDetailModalVisible(true); }}
              />
            ))
          )}
        </View>
      </ScrollView>

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
              {editMode ? 'Edit Event' : 'New Event'}
            </Text>

            <Input
              label="Event Title *"
              placeholder="What's happening?"
              value={eventTitle}
              onChangeText={setEventTitle}
              autoFocus
            />

            {/* Date picker trigger */}
            <View style={styles.dateTimeRow}>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={[styles.dateTimePicker, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, borderRadius: theme.radius.md, flex: 1 }]}
              >
                <Ionicons name="calendar-outline" size={18} color={theme.colors.textSecondary} />
                <Text style={[styles.dateTimeText, { color: theme.colors.text }]}>
                  {formatDateDisplay(eventDate)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowTimePicker(true)}
                style={[styles.dateTimePicker, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, borderRadius: theme.radius.md, flex: 1 }]}
              >
                <Ionicons name="time-outline" size={18} color={theme.colors.textSecondary} />
                <Text style={[styles.dateTimeText, { color: eventTime ? theme.colors.text : theme.colors.textTertiary }]}>
                  {eventTime ? formatTime(eventTime) : 'No time'}
                </Text>
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={eventDate}
                mode="date"
                onChange={(_, date) => {
                  setShowDatePicker(false);
                  if (date) setEventDate(date);
                }}
              />
            )}

            {showTimePicker && (
              <DateTimePicker
                value={eventTime ?? new Date()}
                mode="time"
                onChange={(_, date) => {
                  setShowTimePicker(false);
                  if (date) setEventTime(date);
                }}
              />
            )}

            <Input
              label="Note (optional)"
              placeholder="Add a note..."
              value={eventNote}
              onChangeText={setEventNote}
              multiline
              numberOfLines={3}
              containerStyle={{ marginTop: 8 }}
            />

            <View style={styles.modalActions}>
              <Button title="Cancel" variant="secondary" onPress={() => setModalVisible(false)} style={styles.modalBtn} />
              <Button title={editMode ? 'Save' : 'Add'} onPress={handleSave} loading={saving} disabled={!eventTitle.trim()} style={styles.modalBtn} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <Modal visible={detailModalVisible} animationType="fade" transparent onRequestClose={() => setDetailModalVisible(false)}>
          <TouchableOpacity style={styles.detailBackdrop} onPress={() => setDetailModalVisible(false)} activeOpacity={1}>
            <View style={[styles.detailCard, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl }]}>
              <View style={[styles.detailColorBar, { backgroundColor: selectedEvent.createdByColor }]} />
              <View style={styles.detailContent}>
                <Text style={[styles.detailTitle, { color: theme.colors.text, ...theme.typography.h2 }]}>
                  {selectedEvent.title}
                </Text>

                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
                  <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
                    {new Date(selectedEvent.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </Text>
                </View>

                {selectedEvent.time && (
                  <View style={styles.detailRow}>
                    <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
                    <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
                      {selectedEvent.time} — reminder 1h before
                    </Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Ionicons name="person-outline" size={16} color={theme.colors.textSecondary} />
                  <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
                    Added by {selectedEvent.createdByName}
                  </Text>
                </View>

                {selectedEvent.note && (
                  <View style={[styles.detailNote, { backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.sm }]}>
                    <Text style={[styles.detailNoteText, { color: theme.colors.text }]}>
                      {selectedEvent.note}
                    </Text>
                  </View>
                )}

                <View style={styles.detailActions}>
                  <Button
                    title="Edit"
                    variant="outline"
                    onPress={() => openEditModal(selectedEvent)}
                    style={styles.detailBtn}
                  />
                  <Button
                    title="Delete"
                    variant="danger"
                    onPress={() => handleDelete(selectedEvent)}
                    style={styles.detailBtn}
                  />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
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
  eventsList: { padding: 16, paddingBottom: 100 },
  eventsDateTitle: { marginBottom: 12 },
  noEvents: { paddingVertical: 24, alignItems: 'center' },
  noEventsText: { fontSize: 14 },
  eventCard: {
    flexDirection: 'row',
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  eventColorBar: { width: 4 },
  eventContent: { flex: 1, padding: 14 },
  eventTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  eventMeta: { flexDirection: 'row', gap: 12 },
  eventMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventMetaText: { fontSize: 12 },
  eventNote: { fontSize: 13, marginTop: 6 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { marginBottom: 16 },
  dateTimeRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  dateTimePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderWidth: 1.5,
  },
  dateTimeText: { fontSize: 14, fontWeight: '500' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtn: { flex: 1 },
  detailBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  detailCard: {
    width: '100%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  detailColorBar: { height: 6 },
  detailContent: { padding: 24 },
  detailTitle: { marginBottom: 16 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  detailText: { fontSize: 14 },
  detailNote: { padding: 12, marginTop: 8, marginBottom: 4 },
  detailNoteText: { fontSize: 14, lineHeight: 20 },
  detailActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  detailBtn: { flex: 1 },
});
