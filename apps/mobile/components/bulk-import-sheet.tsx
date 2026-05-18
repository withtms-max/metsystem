import { Ionicons } from '@expo/vector-icons';
import {
  createCustomer,
  detectAndParse,
  type CustomerInsert,
  type ImportedCustomer,
} from '@metsystem/shared';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Palette, Radius } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

interface Props {
  visible: boolean;
  onClose: () => void;
  onImported?: (count: number) => void;
}

/**
 * 일괄 가져오기 — CSV / vCard 파일 선택 → 파싱 → 미리보기 → 등록.
 * Web 전용 (file input). 네이티브는 expo-document-picker 추가 시 지원.
 */
export function BulkImportSheet({ visible, onClose, onImported }: Props) {
  const { authUser } = useAuth();
  const [parsed, setParsed] = useState<ImportedCustomer[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, errors: 0 });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const reset = () => {
    setParsed([]);
    setFileName('');
    setProgress({ done: 0, total: 0, errors: 0 });
    setError(null);
    setDone(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFilePick = () => {
    if (Platform.OS !== 'web') {
      setError('현재 웹 브라우저에서만 지원돼요 (모바일 곧 지원)');
      return;
    }
    setError(null);

    // 동적 file input 생성
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.vcf,.txt,text/csv,text/vcard';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setFileName(file.name);
      try {
        const text = await file.text();
        const records = detectAndParse(file.name, text);
        setParsed(records);
        if (records.length === 0) {
          setError(
            '인식된 고객이 없어요. CSV 컬럼명에 "이름" 또는 "Name" 이 있는지 확인해주세요.',
          );
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : '파일 읽기 실패');
      }
    };
    input.click();
  };

  const handleImport = async () => {
    if (!authUser || parsed.length === 0) return;
    setImporting(true);
    setError(null);
    setProgress({ done: 0, total: parsed.length, errors: 0 });

    let ok = 0;
    let err = 0;
    for (let i = 0; i < parsed.length; i++) {
      const p = parsed[i];
      try {
        const insert: CustomerInsert = {
          owner_id: authUser.id,
          name: p.name,
          phone: p.phone,
          email: p.email,
          company: p.company,
          job_title: p.job_title,
          address: p.address,
          birthday: p.birthday,
          memo: p.memo,
          grade: p.grade,
          source: 'bulk_import',
        };
        await createCustomer(supabase, insert);
        ok++;
      } catch (e) {
        console.warn('[bulk import] row failed', p.name, e);
        err++;
      }
      setProgress({ done: i + 1, total: parsed.length, errors: err });
    }

    setImporting(false);
    setDone(true);
    onImported?.(ok);
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
          <View style={styles.handle} />

          <Text style={styles.title}>고객 일괄 가져오기</Text>
          <Text style={styles.subtitle}>
            챙김 양식 · 리멤버 · 네이버주소록 · 폰 vCard · 구글 연락처 지원
          </Text>

          {!fileName && !done && (
            <>
              <TouchableOpacity
                style={styles.pickBtn}
                onPress={handleFilePick}
                activeOpacity={0.85}>
                <Ionicons name="cloud-upload-outline" size={24} color={Palette.primary} />
                <Text style={styles.pickBtnText}>파일 선택</Text>
                <Text style={styles.pickBtnSub}>.csv / .vcf 파일</Text>
              </TouchableOpacity>

              <View style={styles.guideBox}>
                <Text style={styles.guideTitle}>📥 소스별 내보내기 방법</Text>
                <Text style={styles.guideText}>
                  · <Text style={styles.bold}>리멤버:</Text> 명함첩 → ⋮ → 내보내기 → Excel/CSV
                  {'\n'}· <Text style={styles.bold}>네이버주소록:</Text> 설정 → 내보내기 → vCard
                  {'\n'}· <Text style={styles.bold}>iPhone 연락처:</Text> 연락처 앱 → 그룹 선택 → 공유 → vCard
                  {'\n'}· <Text style={styles.bold}>구글 연락처:</Text> contacts.google.com → 내보내기 → CSV
                  {'\n'}· <Text style={styles.bold}>엑셀 양식:</Text> 우상단 양식 다운로드 → 채워서 업로드
                </Text>
              </View>
            </>
          )}

          {fileName && !done && (
            <>
              <View style={styles.fileBox}>
                <Ionicons name="document-text-outline" size={18} color={Palette.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.fileName}>{fileName}</Text>
                  <Text style={styles.fileMeta}>
                    {parsed.length}명 인식됨
                  </Text>
                </View>
                <TouchableOpacity onPress={() => reset()} hitSlop={6}>
                  <Ionicons name="close-circle" size={18} color={Palette.textMuted} />
                </TouchableOpacity>
              </View>

              {parsed.length > 0 && (
                <ScrollView style={styles.previewList}>
                  {parsed.slice(0, 50).map((p, i) => (
                    <View key={i} style={styles.previewRow}>
                      <Text style={styles.previewName}>{p.name}</Text>
                      <Text style={styles.previewSub} numberOfLines={1}>
                        {[p.company, p.job_title, p.phone].filter(Boolean).join(' · ') || '(추가 정보 없음)'}
                      </Text>
                    </View>
                  ))}
                  {parsed.length > 50 && (
                    <Text style={styles.previewMore}>
                      ... 외 {parsed.length - 50}명 더
                    </Text>
                  )}
                </ScrollView>
              )}

              {importing && (
                <View style={styles.progressBox}>
                  <ActivityIndicator size="small" color={Palette.primary} />
                  <Text style={styles.progressText}>
                    {progress.done} / {progress.total} 등록 중...{' '}
                    {progress.errors > 0 && `(실패 ${progress.errors})`}
                  </Text>
                </View>
              )}
            </>
          )}

          {done && (
            <View style={styles.doneBox}>
              <Ionicons name="checkmark-circle" size={48} color={Palette.green} />
              <Text style={styles.doneTitle}>완료!</Text>
              <Text style={styles.doneText}>
                {progress.done - progress.errors}명 등록 ·{' '}
                {progress.errors > 0 ? `${progress.errors}명 실패` : '실패 없음'}
              </Text>
            </View>
          )}

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={14} color={Palette.red} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelBtnText}>{done ? '닫기' : '취소'}</Text>
            </TouchableOpacity>
            {parsed.length > 0 && !done && !importing && (
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleImport}
                activeOpacity={0.85}>
                <Text style={styles.submitBtnText}>{parsed.length}명 가져오기</Text>
              </TouchableOpacity>
            )}
          </View>
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

  pickBtn: {
    backgroundColor: Palette.primarySoft,
    borderRadius: Radius.lg,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: Palette.primary,
    borderStyle: 'dashed',
  },
  pickBtnText: { fontSize: 15, fontWeight: '700', color: Palette.primaryDeep },
  pickBtnSub: { fontSize: 11, color: Palette.primary },

  guideBox: {
    marginTop: 16,
    backgroundColor: Palette.grayBg,
    borderRadius: Radius.md,
    padding: 12,
  },
  guideTitle: { fontSize: 12, fontWeight: '700', color: Palette.textMain, marginBottom: 6 },
  guideText: { fontSize: 11, color: Palette.textSub, lineHeight: 18 },
  bold: { fontWeight: '700', color: Palette.textMain },

  fileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Palette.primarySoft,
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 10,
  },
  fileName: { fontSize: 13, fontWeight: '700', color: Palette.primaryDeep },
  fileMeta: { fontSize: 11, color: Palette.primary, marginTop: 2 },

  previewList: { maxHeight: 240, marginBottom: 10 },
  previewRow: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  previewName: { fontSize: 13, fontWeight: '600', color: Palette.textMain },
  previewSub: { fontSize: 11, color: Palette.textSub, marginTop: 2 },
  previewMore: {
    fontSize: 11,
    color: Palette.textMuted,
    textAlign: 'center',
    paddingVertical: 10,
    fontStyle: 'italic',
  },

  progressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Palette.primarySoft,
    padding: 12,
    borderRadius: Radius.md,
  },
  progressText: { fontSize: 12, color: Palette.primaryDeep, fontWeight: '600' },

  doneBox: { alignItems: 'center', paddingVertical: 24 },
  doneTitle: { fontSize: 18, fontWeight: '700', color: Palette.textMain, marginTop: 8 },
  doneText: { fontSize: 13, color: Palette.textSub, marginTop: 4 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.md,
    marginTop: 10,
  },
  errorText: { fontSize: 12, color: Palette.red, fontWeight: '500', flex: 1 },

  btnRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.md,
    backgroundColor: Palette.grayBg,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: Palette.textMain },
  submitBtn: {
    flex: 1.6,
    paddingVertical: 14,
    borderRadius: Radius.md,
    backgroundColor: Palette.primary,
    alignItems: 'center',
  },
  submitBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
});
