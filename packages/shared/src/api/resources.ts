/**
 * 팀 자료 + 댓글 API
 *
 * 자료는 두 종류:
 *  1. 파일 업로드 (PDF/이미지) — Supabase Storage
 *  2. 외부 링크 (YouTube/외부 URL) — URL만 저장
 */

import type { MetSupabaseClient } from '../supabase/client';
import type { ResourceCategory } from '../types/database';

export interface TeamResource {
  id: string;
  organization_id: string;
  uploaded_by: string;
  title: string;
  description: string | null;
  category: ResourceCategory;
  file_path: string | null;
  file_name: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  external_url: string | null;
  view_count: number;
  created_at: string;
}

export interface ResourceComment {
  id: string;
  resource_id: string;
  user_id: string;
  body: string;
  created_at: string;
  /** 조인된 작성자 표시명 (선택) */
  author_name?: string | null;
}

export const RESOURCE_CATEGORIES: { code: ResourceCategory; label: string; emoji: string }[] = [
  { code: 'training', label: '교육 자료', emoji: '🎓' },
  { code: 'sales_doc', label: '영업 자료', emoji: '📑' },
  { code: 'contract', label: '약관·계약', emoji: '📋' },
  { code: 'notice', label: '공지', emoji: '📢' },
  { code: 'script', label: '스크립트', emoji: '💬' },
  { code: 'general', label: '일반', emoji: '📁' },
];

export function resourceCategoryLabel(code: string): string {
  return RESOURCE_CATEGORIES.find((c) => c.code === code)?.label ?? '일반';
}

export function resourceCategoryEmoji(code: string): string {
  return RESOURCE_CATEGORIES.find((c) => c.code === code)?.emoji ?? '📁';
}

// ============================================
// 자료 CRUD
// ============================================

export async function listResources(
  supabase: MetSupabaseClient,
  filters: { category?: ResourceCategory } = {},
): Promise<TeamResource[]> {
  let query = supabase
    .from('team_resources')
    .select('*')
    .order('created_at', { ascending: false });
  if (filters.category) query = query.eq('category', filters.category);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as TeamResource[];
}

export async function getResource(
  supabase: MetSupabaseClient,
  id: string,
): Promise<TeamResource | null> {
  const { data, error } = await supabase
    .from('team_resources')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as TeamResource | null) ?? null;
}

export interface CreateResourceInput {
  organization_id: string;
  uploaded_by: string;
  title: string;
  description?: string | null;
  category: ResourceCategory;
  file_path?: string | null;
  file_name?: string | null;
  file_size_bytes?: number | null;
  mime_type?: string | null;
  external_url?: string | null;
}

export async function createResource(
  supabase: MetSupabaseClient,
  input: CreateResourceInput,
): Promise<TeamResource> {
  const { data, error } = await supabase
    .from('team_resources')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(input as any)
    .select('*')
    .single();
  if (error) throw error;
  return data as TeamResource;
}

export async function deleteResource(
  supabase: MetSupabaseClient,
  id: string,
): Promise<void> {
  // 파일도 같이 지워야 하는데 — Storage 객체 삭제는 별도 호출 필요
  const resource = await getResource(supabase, id);
  if (resource?.file_path) {
    await supabase.storage.from('team-resources').remove([resource.file_path]).catch(() => {});
  }
  const { error } = await supabase.from('team_resources').delete().eq('id', id);
  if (error) throw error;
}

export async function incrementResourceView(
  supabase: MetSupabaseClient,
  resourceId: string,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).rpc('increment_resource_view', { p_resource_id: resourceId });
}

// ============================================
// Storage 파일 업로드
// ============================================

export interface UploadFileInput {
  organizationId: string;
  resourceId: string;
  file: Blob;
  fileName: string;
  mimeType: string;
}

/**
 * 자료 파일 업로드 — `{org_id}/{resource_id}/{filename}` 경로.
 * 호출 측에서 createResource → uploadResourceFile 순서로 진행.
 */
export async function uploadResourceFile(
  supabase: MetSupabaseClient,
  input: UploadFileInput,
): Promise<{ path: string }> {
  const safe = input.fileName.replace(/[^\w.\-가-힣]/g, '_');
  const path = `${input.organizationId}/${input.resourceId}/${safe}`;

  const { error } = await supabase.storage
    .from('team-resources')
    .upload(path, input.file, {
      contentType: input.mimeType,
      upsert: true,
    });
  if (error) throw error;
  return { path };
}

/** 다운로드용 임시 서명 URL (1시간) */
export async function getResourceSignedUrl(
  supabase: MetSupabaseClient,
  filePath: string,
  expiresInSec = 3600,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from('team-resources')
    .createSignedUrl(filePath, expiresInSec);
  if (error) throw error;
  return data.signedUrl;
}

// ============================================
// 댓글
// ============================================

export async function listResourceComments(
  supabase: MetSupabaseClient,
  resourceId: string,
): Promise<ResourceComment[]> {
  const { data, error } = await supabase
    .from('resource_comments')
    .select('id, resource_id, user_id, body, created_at, users(name)')
    .eq('resource_id', resourceId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  type Raw = {
    id: string;
    resource_id: string;
    user_id: string;
    body: string;
    created_at: string;
    users: { name: string } | { name: string }[] | null;
  };

  return ((data ?? []) as unknown as Raw[]).map((r) => {
    const user = Array.isArray(r.users) ? r.users[0] : r.users;
    return {
      id: r.id,
      resource_id: r.resource_id,
      user_id: r.user_id,
      body: r.body,
      created_at: r.created_at,
      author_name: user?.name ?? null,
    };
  });
}

export async function addResourceComment(
  supabase: MetSupabaseClient,
  input: { resource_id: string; user_id: string; body: string },
): Promise<ResourceComment> {
  const { data, error } = await supabase
    .from('resource_comments')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(input as any)
    .select('*')
    .single();
  if (error) throw error;
  return data as ResourceComment;
}

export async function deleteResourceComment(
  supabase: MetSupabaseClient,
  commentId: string,
): Promise<void> {
  const { error } = await supabase
    .from('resource_comments')
    .delete()
    .eq('id', commentId);
  if (error) throw error;
}
