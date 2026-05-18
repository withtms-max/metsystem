import { Ionicons } from '@expo/vector-icons';
import {
  createResource,
  RESOURCE_CATEGORIES,
  uploadResourceFile,
  type ResourceCategory,
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
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Palette, Radius } from '@/constants/theme';
import { compressImage, formatBytes } from '@/lib/image-compress';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

interface Props {
  visible: boolean;
  onClose: () => void;
  onUploaded?: () => void;
}

type UploadMode = 'file' | 'link';

export function ResourceUploadSheet({ visible, onClose, onUploaded }: Props) {
  const { authUser, profile } = useAuth();

  const [mode, setMode] = useState<UploadMode>('file');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ResourceCategory>('training');
  const [externalUrl, setExternalUrl] = useState('');
  const [file, setFile] = useState<{ blob: Blob; name: string; mime: string } | null>(null);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);
  const [originalSize, setOriginalSize] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setMode('file');
    setTitle('');
    setDescription('');
    setCategory('training');
    setExternalUrl('');
    setFile(null);
    setCompressedSize(null);
    setOriginalSize(null);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handlePickFile = () => {
    if (Platform.OS !== 'web') {
      setError('파일 업로드는 웹에서 지원돼요 (모바일 곧 지원)');
      return;
    }
    setError(null);

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png,.webp,image/*,application/pdf';
    input.onchange = async () => {
      const picked = input.files?.[0];
      if (!picked) return;

      setOriginalSize(picked.size);
      if (picked.type.startsWith('image/')) {
        const compressed = await compressImage(picked);
        setFile({ blob: compressed, name: picked.name, mime: picked.type });
        setCompressedSize(compressed.size);
      } else {
        setFile({ blob: picked, name: picked.name, mime: picked.type });
        setCompressedSize(picked.size);
      }
      if (!title.trim()) {
        setTitle(picked.name.replace(/\.[^.]+$/, ''));
      }
    };
    input.click();
  };

  const handleSubmit = async () => {
    setError(null);
    if (!title.trim()) {
      setError('제목을 적어주세요');
      return;
    }
    if (mode === 'file' && !file) {
      setError('파일을 선택해주세요');
      return;
    }
    if (mode === 'link' && !externalUrl.trim()) {
      setError('링크 URL을 입력해주세요');
      return;
    }
    if (!authUser || !profile?.organization_id) {
      setError('로그인 정보가 필요해요');
      return;
    }

    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let createdResourceId: string | null = null;
    try {
      // 1) DB row 먼저 (resource id 생성)
      const resource = await createResource(supabase, {
        organization_id: profile.organization_id,
        uploaded_by: authUser.id,
        title: title.trim(),
        description: description.trim() || null,
        category,
        external_url: mode === 'link' ? externalUrl.trim() : null,
        file_name: mode === 'file' ? file?.name ?? null : null,
        file_size_bytes: mode === 'file' ? compressedSize : null,
        mime_type: mode === 'file' ? file?.mime ?? null : null,
      });
      createdResourceId = resource.id;

      // 2) 파일 모드면 Storage 업로드 후 file_path UPDATE
      if (mode === 'file' && file) {
        const { path } = await uploadResourceFile(supabase, {
          organizationId: profile.organization_id,
          resourceId: resource.id,
          file: file.blob,
          fileName: file.name,
          mimeType: file.mime,
        });

        const { error: updErr } = await supabase
          .from('team_resources')
          .update({ file_path: path })
          .eq('id', resource.id);
        if (updErr) throw updErr;
      }

      reset();
      onUploaded?.();
    } catch (e) {
      // 파일 업로드 실패 시 고아 DB 행 정리
      if (createdResourceId) {
        try {
          await supabase.from('team_resources').delete().eq('id', createdResourceId);
        } catch {
          // 정리 실패는 조용히 무시 (원본 에러가 더 중요)
        }
      }
      const err = e as { message?: string; details?: string; hint?: string };
      console.error('[resource upload] failed', e);
      setError(
        [err.message, err.details, err.hint].filter(Boolean).join(' · ') || '업로드 실패',
      );
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

            <Text style={styles.title}>자료 업로드</Text>
            <Text style={styles.subtitle}>같은 조직 모든 멤버가 볼 수 있어요</Text>

            {/* 모드 토글 */}
            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[styles.modeBtn, mode === 'file' && styles.modeBtnActive]}
                onPress={() => setMode('file')}>
                <Ionicons
                  name="cloud-upload-outline"
                  size={14}
                  color={mode === 'file' ? '#FFFFFF' : Palette.textSub}
                />
                <Text
                  style={[styles.modeBtnText, mode === 'file' && styles.modeBtnTextActive]}>
                  파일 업로드
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, mode === 'link' && styles.modeBtnActive]}
                onPress={() => setMode('link')}>
                <Ionicons
                  name="link"
                  size={14}
                  color={mode === 'link' ? '#FFFFFF' : Palette.textSub}
                />
                <Text
                  style={[styles.modeBtnText, mode === 'link' && styles.modeBtnTextActive]}>
                  외부 링크 (YouTube 등)
                </Text>
              </TouchableOpacity>
            </View>

            {mode === 'file' ? (
              <>
                <Text style={styles.label}>파일</Text>
                {!file ? (
                  <TouchableOpacity style={styles.pickBtn} onPress={handlePickFile}>
                    <Ionicons name="add-circle-outline" size={20} color={Palette.primary} />
                    <Text style={styles.pickBtnText}>PDF · 이미지 선택</Text>
                    <Text style={styles.pickBtnSub}>이미지는 자동 압축돼요</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.fileBox}>
                    <Ionicons
                      name={
                        file.mime.startsWith('image/')
                          ? 'image-outline'
                          : 'document-text-outline'
                      }
                      size={18}
                      color={Palette.primary}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fileName} numberOfLines={1}>
                        {file.name}
                      </Text>
                      <Text style={styles.fileMeta}>
                        {originalSize && compressedSize && originalSize > compressedSize ? (
                          <>
                            {formatBytes(originalSize)} →{' '}
                            <Text style={{ color: Palette.green, fontWeight: '700' }}>
                              {formatBytes(compressedSize)}
                            </Text>
                            {' '}({Math.round((1 - compressedSize / originalSize) * 100)}% 압축)
                          </>
                        ) : (
                          formatBytes(compressedSize)
                        )}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setFile(null)} hitSlop={6}>
                      <Ionicons name="close-circle" size={18} color={Palette.textMuted} />
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              <>
                <Text style={styles.label}>외부 링크 URL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://www.youtube.com/watch?v=..."
                  placeholderTextColor={Palette.textMuted}
                  value={externalUrl}
                  onChangeText={setExternalUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </>
            )}

            <Text style={styles.label}>제목</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 5월 신상품 안내"
              placeholderTextColor={Palette.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>설명 (선택)</Text>
            <TextInput
              style={[styles.input, styles.descInput]}
              placeholder="자료에 대한 짧은 설명"
              placeholderTextColor={Palette.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />

            <Text style={styles.label}>카테고리</Text>
            <View style={styles.catGrid}>
              {RESOURCE_CATEGORIES.map((c) => {
                const active = category === c.code;
                return (
                  <TouchableOpacity
                    key={c.code}
                    style={[styles.catChip, active && styles.catChipActive]}
                    onPress={() => setCategory(c.code)}>
                    <Text style={[styles.catText, active && styles.catTextActive]}>
                      {c.emoji} {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
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
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>업로드</Text>
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

  modeRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: Radius.md,
    backgroundColor: Palette.grayBg,
  },
  modeBtnActive: { backgroundColor: Palette.textMain },
  modeBtnText: { fontSize: 12, fontWeight: '600', color: Palette.textSub },
  modeBtnTextActive: { color: '#FFFFFF' },

  label: { fontSize: 12, fontWeight: '700', color: Palette.textSub, marginTop: 10, marginBottom: 6 },

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
  pickBtnText: { fontSize: 14, fontWeight: '700', color: Palette.primaryDeep },
  pickBtnSub: { fontSize: 11, color: Palette.primary },

  fileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Palette.primarySoft,
    borderRadius: Radius.md,
    padding: 12,
  },
  fileName: { fontSize: 13, fontWeight: '700', color: Palette.primaryDeep },
  fileMeta: { fontSize: 11, color: Palette.primary, marginTop: 2 },

  input: {
    backgroundColor: Palette.grayBg,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Palette.textMain,
  },
  descInput: { minHeight: 60 },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    backgroundColor: Palette.grayBg,
  },
  catChipActive: { backgroundColor: Palette.primary },
  catText: { fontSize: 12, fontWeight: '600', color: Palette.textSub },
  catTextActive: { color: '#FFFFFF' },

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
