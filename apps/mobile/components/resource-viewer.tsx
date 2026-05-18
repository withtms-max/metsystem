import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Palette, Radius } from '@/constants/theme';

interface Props {
  visible: boolean;
  /** Supabase signed URL */
  url: string | null;
  fileName: string | null;
  mimeType: string | null;
  /** YouTube 같은 외부 링크는 embed 처리 */
  externalUrl: string | null;
  onClose: () => void;
}

/**
 * 자료 인앱 뷰어 — 풀스크린 모달.
 *
 * 지원:
 *  · 이미지 (jpg/png/webp/gif) → <img>
 *  · PDF → web 은 iframe, 네이티브는 외부 앱 폴백 (react-native-pdf 없이)
 *  · YouTube/외부 URL → web iframe, 네이티브는 Linking
 */
export function ResourceViewer({
  visible,
  url,
  fileName,
  mimeType,
  externalUrl,
  onClose,
}: Props) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (visible) setLoaded(false);
  }, [visible, url]);

  const isImage = mimeType?.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';
  const isYouTube =
    externalUrl &&
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/.test(externalUrl);
  const youtubeId = isYouTube
    ? externalUrl!.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/)![1]
    : null;

  const handleOpenExternal = () => {
    const target = url ?? externalUrl;
    if (!target) return;
    Linking.openURL(target).catch(() => {});
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={Palette.textMain} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>
            {fileName ?? '자료 미리보기'}
          </Text>
          <TouchableOpacity onPress={handleOpenExternal} hitSlop={8}>
            <Ionicons name="open-outline" size={20} color={Palette.textMain} />
          </TouchableOpacity>
        </View>

        {/* 본체 */}
        <View style={styles.body}>
          {!loaded && (isImage || isPdf || isYouTube) && (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={Palette.primary} />
            </View>
          )}

          {/* YouTube 외부 링크 */}
          {isYouTube && youtubeId && Platform.OS === 'web' && (
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}`}
              style={iframeStyle}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onLoad={() => setLoaded(true)}
            />
          )}

          {/* 이미지 */}
          {isImage && url && (
            <Image
              source={{ uri: url }}
              style={styles.image}
              resizeMode="contain"
              onLoad={() => setLoaded(true)}
              onError={() => setLoaded(true)}
            />
          )}

          {/* PDF — web 은 iframe, 네이티브는 외부 앱 안내 */}
          {isPdf && url && Platform.OS === 'web' && (
            <iframe
              src={url}
              style={iframeStyle}
              onLoad={() => setLoaded(true)}
            />
          )}
          {isPdf && Platform.OS !== 'web' && (
            <View style={styles.nativeFallback}>
              <Ionicons name="document-text" size={48} color={Palette.textMuted} />
              <Text style={styles.fallbackTitle}>PDF 미리보기는 곧 지원돼요</Text>
              <Text style={styles.fallbackSub}>현재는 외부 앱으로 열어주세요</Text>
              <TouchableOpacity
                style={styles.openExternalBtn}
                onPress={handleOpenExternal}>
                <Ionicons name="open-outline" size={16} color="#FFFFFF" />
                <Text style={styles.openExternalText}>외부 앱으로 열기</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* YouTube 외부 (네이티브) */}
          {isYouTube && Platform.OS !== 'web' && (
            <View style={styles.nativeFallback}>
              <Ionicons name="logo-youtube" size={48} color={Palette.red} />
              <Text style={styles.fallbackTitle}>YouTube 앱에서 열기</Text>
              <TouchableOpacity
                style={styles.openExternalBtn}
                onPress={handleOpenExternal}>
                <Ionicons name="open-outline" size={16} color="#FFFFFF" />
                <Text style={styles.openExternalText}>유튜브 열기</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 기타 외부 링크 (Notion 등) */}
          {externalUrl && !isYouTube && Platform.OS === 'web' && (
            <iframe
              src={externalUrl}
              style={iframeStyle}
              onLoad={() => setLoaded(true)}
            />
          )}
          {externalUrl && !isYouTube && Platform.OS !== 'web' && (
            <View style={styles.nativeFallback}>
              <Ionicons name="link" size={48} color={Palette.primary} />
              <Text style={styles.fallbackTitle}>외부 링크</Text>
              <Text style={styles.fallbackSub} numberOfLines={2}>
                {externalUrl}
              </Text>
              <TouchableOpacity
                style={styles.openExternalBtn}
                onPress={handleOpenExternal}>
                <Ionicons name="open-outline" size={16} color="#FFFFFF" />
                <Text style={styles.openExternalText}>외부 앱으로 열기</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 미지원 파일 타입 */}
          {!isImage && !isPdf && !isYouTube && !externalUrl && (
            <View style={styles.nativeFallback}>
              <Ionicons name="document-attach" size={48} color={Palette.textMuted} />
              <Text style={styles.fallbackTitle}>미리보기를 지원하지 않는 형식이에요</Text>
              <TouchableOpacity
                style={styles.openExternalBtn}
                onPress={handleOpenExternal}>
                <Ionicons name="download-outline" size={16} color="#FFFFFF" />
                <Text style={styles.openExternalText}>다운로드</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const iframeStyle = {
  border: 'none',
  width: '100%',
  height: '100%',
  display: 'block',
} as const;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.card },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
    gap: 12,
  },
  title: { flex: 1, fontSize: 14, fontWeight: '700', color: Palette.textMain },

  body: { flex: 1, backgroundColor: '#000000' },
  image: { width: '100%', height: '100%' },

  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },

  nativeFallback: {
    flex: 1,
    backgroundColor: Palette.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  fallbackTitle: { fontSize: 15, fontWeight: '700', color: Palette.textMain },
  fallbackSub: {
    fontSize: 12,
    color: Palette.textSub,
    textAlign: 'center',
    lineHeight: 18,
  },
  openExternalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: Radius.md,
    marginTop: 8,
  },
  openExternalText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
});
