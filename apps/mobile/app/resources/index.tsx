import { Ionicons } from '@expo/vector-icons';
import {
  listResources,
  RESOURCE_CATEGORIES,
  resourceCategoryEmoji,
  type ResourceCategory,
  type TeamResource,
} from '@metsystem/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ResourceUploadSheet } from '@/components/resource-upload-sheet';
import { Palette, Radius } from '@/constants/theme';
import { formatBytes } from '@/lib/image-compress';
import { supabase } from '@/lib/supabase';

export default function ResourcesScreen() {
  const router = useRouter();
  const [resources, setResources] = useState<TeamResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<ResourceCategory | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listResources(supabase);
      setResources(list);
    } catch (e) {
      console.warn('[resources] load failed', e);
      setResources([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const filtered = useMemo(
    () => (category ? resources.filter((r) => r.category === category) : resources),
    [resources, category],
  );

  const categoryCounts = useMemo(() => {
    const c: Record<string, number> = {};
    resources.forEach((r) => {
      c[r.category] = (c[r.category] ?? 0) + 1;
    });
    return c;
  }, [resources]);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Palette.card }}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
              <Ionicons name="arrow-back" size={22} color={Palette.textMain} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.title}>팀 자료실</Text>
              <Text style={styles.sub}>총 {resources.length}개</Text>
            </View>
            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={() => setUploadOpen(true)}
              activeOpacity={0.85}>
              <Ionicons name="cloud-upload-outline" size={14} color="#FFFFFF" />
              <Text style={styles.uploadBtnText}>업로드</Text>
            </TouchableOpacity>
          </View>

          {/* 카테고리 필터 */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}>
            <CategoryChip
              label="전체"
              count={resources.length}
              active={category === null}
              onPress={() => setCategory(null)}
            />
            {RESOURCE_CATEGORIES.map((c) => (
              <CategoryChip
                key={c.code}
                label={`${c.emoji} ${c.label}`}
                count={categoryCounts[c.code] ?? 0}
                active={category === c.code}
                onPress={() => setCategory(category === c.code ? null : c.code)}
              />
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color={Palette.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="folder-open-outline" size={28} color={Palette.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>아직 자료가 없어요</Text>
          <Text style={styles.emptySub}>
            교육·영업·공지 자료를 한곳에서 관리해보세요
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ResourceCard
              resource={item}
              onPress={() =>
                router.push({
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  pathname: '/resources/[id]' as any,
                  params: { id: item.id },
                })
              }
            />
          )}
        />
      )}

      <ResourceUploadSheet
        visible={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={() => {
          setUploadOpen(false);
          void reload();
        }}
      />
    </View>
  );
}

function CategoryChip({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.7}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label} {count}
      </Text>
    </TouchableOpacity>
  );
}

function ResourceCard({
  resource,
  onPress,
}: {
  resource: TeamResource;
  onPress: () => void;
}) {
  const isLink = !!resource.external_url && !resource.file_path;
  const icon = isLink
    ? 'link'
    : resource.mime_type?.startsWith('image/')
      ? 'image'
      : resource.mime_type === 'application/pdf'
        ? 'document-text'
        : 'document-attach';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardIcon}>
        <Ionicons name={icon as 'document'} size={20} color={Palette.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.cardHeadRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {resource.title}
          </Text>
          <Text style={styles.cardCategory}>
            {resourceCategoryEmoji(resource.category)}
          </Text>
        </View>
        {resource.description ? (
          <Text style={styles.cardDesc} numberOfLines={2}>
            {resource.description}
          </Text>
        ) : null}
        <View style={styles.cardMeta}>
          {resource.file_size_bytes ? (
            <Text style={styles.cardMetaText}>
              {formatBytes(resource.file_size_bytes)}
            </Text>
          ) : isLink ? (
            <Text style={styles.cardMetaText}>외부 링크</Text>
          ) : null}
          <Text style={styles.cardMetaText}>· 조회 {resource.view_count}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={Palette.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.bg },
  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 20, fontWeight: '700', color: Palette.textMain, letterSpacing: -0.3 },
  sub: { fontSize: 11, color: Palette.textSub, marginTop: 2 },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
  },
  uploadBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },

  chipRow: { gap: 6, paddingRight: 16 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    backgroundColor: Palette.grayBg,
  },
  chipActive: { backgroundColor: Palette.textMain },
  chipText: { fontSize: 11, fontWeight: '600', color: Palette.textSub },
  chipTextActive: { color: '#FFFFFF' },

  list: { padding: 12, gap: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Palette.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Palette.textMain, flex: 1 },
  cardCategory: { fontSize: 14 },
  cardDesc: { fontSize: 12, color: Palette.textSub, marginTop: 3, lineHeight: 17 },
  cardMeta: { flexDirection: 'row', gap: 6, marginTop: 5 },
  cardMetaText: { fontSize: 10, color: Palette.textMuted },

  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Palette.grayBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: Palette.textMain, marginBottom: 6 },
  emptySub: { fontSize: 12, color: Palette.textSub, textAlign: 'center', lineHeight: 18 },
});
