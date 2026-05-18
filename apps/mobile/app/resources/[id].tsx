import { Ionicons } from '@expo/vector-icons';
import {
  addResourceComment,
  deleteResource,
  deleteResourceComment,
  getResource,
  getResourceSignedUrl,
  incrementResourceView,
  listResourceComments,
  resourceCategoryEmoji,
  resourceCategoryLabel,
  type ResourceComment,
  type TeamResource,
} from '@metsystem/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ResourceViewer } from '@/components/resource-viewer';
import { useAuth } from '@/lib/auth-context';
import { Palette, Radius } from '@/constants/theme';
import { formatBytes } from '@/lib/image-compress';
import { supabase } from '@/lib/supabase';

export default function ResourceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { authUser, profile } = useAuth();

  const [resource, setResource] = useState<TeamResource | null>(null);
  const [comments, setComments] = useState<ResourceComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([getResource(supabase, id), listResourceComments(supabase, id)])
      .then(([r, c]) => {
        setResource(r);
        setComments(c);
        if (r) void incrementResourceView(supabase, r.id).catch(() => {});
      })
      .catch((e) => console.warn('[resource detail] load failed', e))
      .finally(() => setLoading(false));
  }, [id]);

  const handleOpen = async () => {
    if (!resource) return;
    // 외부 링크는 바로 viewer 로 (YouTube embed 등)
    if (resource.external_url && !resource.file_path) {
      setViewerUrl(null);
      setViewerOpen(true);
      return;
    }
    if (!resource.file_path) return;
    setDownloading(true);
    try {
      const url = await getResourceSignedUrl(supabase, resource.file_path);
      setViewerUrl(url);
      setViewerOpen(true);
    } catch (e) {
      console.warn('[resource] open failed', e);
    } finally {
      setDownloading(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !authUser || !resource) return;
    setPosting(true);
    try {
      await addResourceComment(supabase, {
        resource_id: resource.id,
        user_id: authUser.id,
        body: newComment.trim(),
      });
      setNewComment('');
      const refreshed = await listResourceComments(supabase, resource.id);
      setComments(refreshed);
    } catch (e) {
      console.warn('[comment] failed', e);
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!resource) return;
    const ok =
      Platform.OS === 'web' ? window.confirm('댓글을 삭제할까요?') : true;
    if (!ok) return;
    await deleteResourceComment(supabase, commentId).catch(() => {});
    const refreshed = await listResourceComments(supabase, resource.id);
    setComments(refreshed);
  };

  const handleDeleteResource = async () => {
    if (!resource) return;
    const ok =
      Platform.OS === 'web'
        ? window.confirm(`"${resource.title}" 자료를 삭제할까요? 댓글도 같이 사라져요.`)
        : true;
    if (!ok) return;
    try {
      await deleteResource(supabase, resource.id);
      router.back();
    } catch (e) {
      console.warn('[resource] delete failed', e);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Palette.primary} />
      </View>
    );
  }

  if (!resource) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.emptyText}>자료를 찾을 수 없어요</Text>
      </View>
    );
  }

  const canDelete =
    resource.uploaded_by === authUser?.id ||
    profile?.role === 'manager' ||
    profile?.role === 'owner';

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Palette.card }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={Palette.textMain} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            자료 상세
          </Text>
          {canDelete ? (
            <TouchableOpacity onPress={handleDeleteResource} hitSlop={8}>
              <Ionicons name="trash-outline" size={20} color={Palette.red} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 22 }} />
          )}
        </View>
      </SafeAreaView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll}>
        {/* 메인 카드 */}
        <View style={styles.card}>
          <View style={styles.catRow}>
            <Text style={styles.catChip}>
              {resourceCategoryEmoji(resource.category)}{' '}
              {resourceCategoryLabel(resource.category)}
            </Text>
            <Text style={styles.metaText}>조회 {resource.view_count}</Text>
          </View>
          <Text style={styles.title}>{resource.title}</Text>
          {resource.description ? (
            <Text style={styles.desc}>{resource.description}</Text>
          ) : null}

          {/* 파일 / 링크 미리보기 */}
          {resource.file_path && (
            <TouchableOpacity
              style={styles.openBtn}
              onPress={handleOpen}
              disabled={downloading}
              activeOpacity={0.85}>
              {downloading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="open-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.openBtnText}>
                    파일 열기 · {resource.file_name}{' '}
                    {resource.file_size_bytes
                      ? `(${formatBytes(resource.file_size_bytes)})`
                      : ''}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
          {resource.external_url && (
            <TouchableOpacity
              style={styles.openBtn}
              onPress={handleOpen}
              activeOpacity={0.85}>
              <Ionicons name="link" size={16} color="#FFFFFF" />
              <Text style={styles.openBtnText} numberOfLines={1}>
                링크 열기 · {resource.external_url}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 댓글 섹션 */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>댓글 {comments.length}</Text>

          {comments.length === 0 ? (
            <Text style={styles.emptyComment}>
              아직 댓글이 없어요. 첫 의견을 남겨주세요!
            </Text>
          ) : (
            comments.map((c) => (
              <View key={c.id} style={styles.commentRow}>
                <View style={styles.commentAvatar}>
                  <Text style={styles.commentAvatarText}>
                    {(c.author_name ?? '?').slice(0, 1)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.commentHead}>
                    <Text style={styles.commentName}>{c.author_name ?? '익명'}</Text>
                    <Text style={styles.commentDate}>{relativeTime(c.created_at)}</Text>
                  </View>
                  <Text style={styles.commentBody}>{c.body}</Text>
                </View>
                {c.user_id === authUser?.id && (
                  <TouchableOpacity
                    onPress={() => handleDeleteComment(c.id)}
                    hitSlop={6}>
                    <Ionicons name="close" size={14} color={Palette.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* 댓글 입력 — 하단 sticky */}
      <SafeAreaView edges={['bottom']} style={styles.composerWrap}>
        <View style={styles.composer}>
          <TextInput
            style={styles.composerInput}
            placeholder="댓글 적기..."
            placeholderTextColor={Palette.textMuted}
            value={newComment}
            onChangeText={setNewComment}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !newComment.trim() && styles.sendBtnDisabled]}
            onPress={handlePostComment}
            disabled={!newComment.trim() || posting}>
            {posting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* 인앱 자료 뷰어 — PDF/이미지/YouTube 모달 */}
      <ResourceViewer
        visible={viewerOpen}
        url={viewerUrl}
        fileName={resource.file_name}
        mimeType={resource.mime_type}
        externalUrl={resource.external_url}
        onClose={() => setViewerOpen(false)}
      />
    </View>
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return iso.slice(0, 10);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 14, color: Palette.textSub },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  headerTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: Palette.textMain },

  scroll: { padding: 12, paddingBottom: 24 },

  card: {
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  catRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  catChip: { fontSize: 12, fontWeight: '600', color: Palette.primaryDeep },
  metaText: { fontSize: 11, color: Palette.textMuted },
  title: { fontSize: 17, fontWeight: '700', color: Palette.textMain, marginBottom: 6 },
  desc: { fontSize: 13, color: Palette.textSub, lineHeight: 20, marginBottom: 10 },

  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Palette.primary,
    paddingVertical: 12,
    borderRadius: Radius.md,
    marginTop: 8,
  },
  openBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: Palette.textMain, marginBottom: 10 },
  emptyComment: {
    fontSize: 12,
    color: Palette.textMuted,
    textAlign: 'center',
    paddingVertical: 16,
    fontStyle: 'italic',
  },

  commentRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
  },
  commentAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Palette.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentAvatarText: { fontSize: 12, fontWeight: '700', color: Palette.primaryDeep },
  commentHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  commentName: { fontSize: 12, fontWeight: '700', color: Palette.textMain },
  commentDate: { fontSize: 10, color: Palette.textMuted },
  commentBody: { fontSize: 13, color: Palette.textMain, marginTop: 3, lineHeight: 18 },

  composerWrap: {
    backgroundColor: Palette.card,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    gap: 8,
  },
  composerInput: {
    flex: 1,
    backgroundColor: Palette.grayBg,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Palette.textMain,
    maxHeight: 100,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Palette.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: Palette.borderStrong },
});
