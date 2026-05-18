import { Ionicons } from '@expo/vector-icons';
import {
  createTeamEvent,
  TEAM_EVENT_TYPES,
  teamEventTypeIcon,
  teamEventTypeLabel,
  type TeamEventType,
} from '@metsystem/shared';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Palette, Radius } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdded?: () => void;
  /** 기본 날짜 (YYYY-MM-DD) — 캘린더 셀에서 호출 시 그날 자동 채움 */
  defaultDate?: string;
}

export function TeamEventAdd({ visible, onClose, onAdded, defaultDate }: Props) {
  const { authUser, profile } = useAuth();
  const today = new Date().toISOString().slice(0, 10);

  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState(defaultDate ?? today);
  const [eventTime, setEventTime] = useState('');
  const [eventType, setEventType] = useState<TeamEventType>('meeting');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setTitle('');
    setEventDate(defaultDate ?? today);
    setEventTime('');
    setEventType('meeting');
    setDescription('');
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    setError(null);
    if (!title.trim()) {
      setError('일정 제목을 적어주세요');
      return;
    }
    if (!eventDate) {
      setError('날짜를 선택하세요 (YYYY-MM-DD 형식)');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
      setError('날짜는 YYYY-MM-DD 형식으로 입력하세요');
      return;
    }
    if (eventTime && !/^\d{2}:\d{2}$/.test(eventTime)) {
      setError('시간은 HH:MM 형식으로 입력하세요 (예: 19:00)');
      return;
    }
    if (!authUser || !profile?.organization_id) {
      setError('로그인 정보 확인이 필요해요');
      return;
    }
    setLoading(true);
    try {
      await createTeamEvent(supabase, {
        organization_id: profile.organization_id,
        created_by: authUser.id,
        title: title.trim(),
        event_date: eventDate,
        event_time: eventTime || null,
        is_all_day: !eventTime,
        event_type: eventType,
        description: description.trim() || null,
      });
      reset();
      onAdded?.();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '저장 실패';
      if (msg.includes('policy')) {
        setError('센터장/오너만 팀 일정을 등록할 수 있어요');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={styles.handle} />

            <Text style={styles.title}>팀 일정 추가</Text>
            <Text style={styles.subtitle}>같은 조직 모든 멤버가 볼 수 있어요</Text>

            <Text style={styles.label}>제목</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="예: 5월 정기 회식"
                placeholderTextColor={Palette.textMuted}
                value={title}
                onChangeText={setTitle}
                autoFocus
              />
            </View>

            <Text style={styles.label}>날짜 / 시간</Text>
            <View style={styles.row}>
              <View style={[styles.inputWrap, { flex: 1.5 }]}>
                <TextInput
                  style={styles.input}
                  placeholder="2026-05-25"
                  placeholderTextColor={Palette.textMuted}
                  value={eventDate}
                  onChangeText={setEventDate}
                />
              </View>
              <View style={[styles.inputWrap, { flex: 1 }]}>
                <TextInput
                  style={styles.input}
                  placeholder="19:00 (선택)"
                  placeholderTextColor={Palette.textMuted}
                  value={eventTime}
                  onChangeText={setEventTime}
                />
              </View>
            </View>

            <Text style={styles.label}>분류</Text>
            <View style={styles.typeGrid}>
              {TEAM_EVENT_TYPES.map((t) => {
                const active = eventType === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, active && styles.typeChipActive]}
                    onPress={() => setEventType(t)}
                    activeOpacity={0.7}>
                    <Ionicons
                      name={teamEventTypeIcon(t) as keyof typeof Ionicons.glyphMap}
                      size={14}
                      color={active ? '#FFFFFF' : Palette.textSub}
                    />
                    <Text
                      style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                      {teamEventTypeLabel(t)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>설명 (선택)</Text>
            <View style={[styles.inputWrap, styles.descWrap]}>
              <TextInput
                style={[styles.input, styles.descInput]}
                placeholder="장소·참석자 등 메모"
                placeholderTextColor={Palette.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                textAlignVertical="top"
              />
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={14} color={Palette.red} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                <Text style={styles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.85}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>등록</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Palette.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
    maxHeight: '90%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.borderStrong,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '700', color: Palette.textMain, letterSpacing: -0.3 },
  subtitle: { fontSize: 12, color: Palette.textSub, marginTop: 4, marginBottom: 16 },

  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.textSub,
    marginTop: 12,
    marginBottom: 6,
  },
  inputWrap: {
    backgroundColor: Palette.grayBg,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: { fontSize: 14, color: Palette.textMain },
  row: { flexDirection: 'row', gap: 8 },
  descWrap: { minHeight: 80 },
  descInput: { minHeight: 60 },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    backgroundColor: Palette.grayBg,
  },
  typeChipActive: { backgroundColor: Palette.primary },
  typeChipText: { fontSize: 12, fontWeight: '600', color: Palette.textSub },
  typeChipTextActive: { color: '#FFFFFF' },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.md,
    marginTop: 12,
  },
  errorText: { fontSize: 12, color: Palette.red, fontWeight: '500', flex: 1 },

  btnRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.md,
    backgroundColor: Palette.grayBg,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: Palette.textMain },
  submitBtn: {
    flex: 1.6,
    paddingVertical: 14,
    borderRadius: Radius.md,
    backgroundColor: Palette.primary,
    alignItems: 'center',
  },
  submitBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
