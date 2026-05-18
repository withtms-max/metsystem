import { Ionicons } from '@expo/vector-icons';
import {
  CAMPAIGN_METRICS,
  campaignMetricLabel,
  campaignMetricUnit,
  createTeamEvent,
  type CampaignMetric,
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
}

/**
 * 시책 작성 — 관리자/오너 전용.
 * team_events INSERT 시 event_type='campaign' + 기간 + 목표.
 */
export function CampaignAddSheet({ visible, onClose, onAdded }: Props) {
  const { authUser, profile } = useAuth();
  const today = new Date().toISOString().slice(0, 10);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState('');
  const [metric, setMetric] = useState<CampaignMetric>('contracts');
  const [targetValue, setTargetValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setTitle('');
    setDescription('');
    setStartDate(today);
    setEndDate('');
    setMetric('contracts');
    setTargetValue('');
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    setError(null);
    if (!title.trim()) return setError('시책 제목을 입력해주세요');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return setError('시작일 형식 YYYY-MM-DD');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return setError('종료일 형식 YYYY-MM-DD');
    if (endDate < startDate) return setError('종료일은 시작일 이후여야 해요');
    const target = Number(targetValue);
    if (!target || target <= 0) return setError('목표치를 1 이상 입력해주세요');
    if (!authUser || !profile?.organization_id) return setError('로그인 정보가 필요해요');

    setLoading(true);
    try {
      await createTeamEvent(supabase, {
        organization_id: profile.organization_id,
        created_by: authUser.id,
        title: title.trim(),
        description: description.trim() || null,
        event_date: startDate,
        event_time: null,
        is_all_day: true,
        event_type: 'campaign',
        start_date: startDate,
        end_date: endDate,
        target_value: target,
        target_metric: metric,
      });
      reset();
      onAdded?.();
    } catch (e) {
      const err = e as { message?: string; details?: string };
      console.error('[campaign add] failed', e);
      setError(err.message || err.details || '저장 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={styles.handle} />

            <Text style={styles.title}>시책 추가</Text>
            <Text style={styles.subtitle}>
              기간 + 목표를 설정하면 팀원 활동량이 자동으로 집계돼요
            </Text>

            <Text style={styles.label}>시책 제목</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 5월 신규 계약 5건 도전"
              placeholderTextColor={Palette.textMuted}
              value={title}
              onChangeText={setTitle}
              autoFocus
            />

            <Text style={styles.label}>설명 (선택)</Text>
            <TextInput
              style={[styles.input, styles.descInput]}
              placeholder="시책 안내·보상 등"
              placeholderTextColor={Palette.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>시작일</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2026-05-01"
                  placeholderTextColor={Palette.textMuted}
                  value={startDate}
                  onChangeText={setStartDate}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>종료일</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2026-05-06"
                  placeholderTextColor={Palette.textMuted}
                  value={endDate}
                  onChangeText={setEndDate}
                />
              </View>
            </View>

            <Text style={styles.label}>목표 지표</Text>
            <View style={styles.metricRow}>
              {CAMPAIGN_METRICS.map((m) => {
                const active = metric === m;
                return (
                  <TouchableOpacity
                    key={m}
                    style={[styles.metricChip, active && styles.metricChipActive]}
                    onPress={() => setMetric(m)}>
                    <Text
                      style={[styles.metricText, active && styles.metricTextActive]}>
                      {campaignMetricLabel(m)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>목표치 ({campaignMetricUnit(metric)})</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 5"
              placeholderTextColor={Palette.textMuted}
              keyboardType="numeric"
              value={targetValue}
              onChangeText={setTargetValue}
            />

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
                disabled={loading}>
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
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Palette.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 12,
    maxHeight: '92%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.borderStrong,
    alignSelf: 'center',
    marginBottom: 14,
  },
  title: { fontSize: 18, fontWeight: '700', color: Palette.textMain, letterSpacing: -0.3 },
  subtitle: { fontSize: 12, color: Palette.textSub, marginTop: 4, marginBottom: 14 },

  label: { fontSize: 12, fontWeight: '700', color: Palette.textSub, marginTop: 10, marginBottom: 6 },
  input: {
    backgroundColor: Palette.grayBg,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Palette.textMain,
  },
  descInput: { minHeight: 60 },
  row: { flexDirection: 'row', gap: 8 },

  metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metricChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    backgroundColor: Palette.grayBg,
  },
  metricChipActive: { backgroundColor: Palette.primary },
  metricText: { fontSize: 12, fontWeight: '600', color: Palette.textSub },
  metricTextActive: { color: '#FFFFFF' },

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

  btnRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: Radius.md,
    backgroundColor: Palette.grayBg,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: Palette.textMain },
  submitBtn: {
    flex: 1.6,
    paddingVertical: 13,
    borderRadius: Radius.md,
    backgroundColor: Palette.primary,
    alignItems: 'center',
  },
  submitBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
});
