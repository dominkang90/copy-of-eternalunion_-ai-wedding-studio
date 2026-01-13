
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserPhoto } from '../types';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const signInWithGoogle = async () => {
  if (!supabase) throw new Error("Supabase 설정이 누락되었습니다. 환경 변수를 확인하세요.");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const savePhotoToAlbum = async (userId: string, imageUrl: string, scene: string) => {
  if (!supabase) throw new Error("Supabase 설정이 누락되었습니다.");
  const { data, error } = await supabase
    .from('wedding_photos')
    .insert([
      {
        user_id: userId,
        image_url: imageUrl,
        scene_name: scene
      }
    ])
    .select();

  if (error) throw error;
  return data;
};

export const getUserPhotos = async (userId: string): Promise<UserPhoto[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('wedding_photos')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as UserPhoto[];
};

export const deleteUserPhoto = async (photoId: string) => {
  if (!supabase) return;
  const { error } = await supabase
    .from('wedding_photos')
    .delete()
    .eq('id', photoId);

  if (error) throw error;
};

export const getUserApiKey = async (userId: string): Promise<string | null> => {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('gemini_api_key')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No rows found
    console.error("API Key 로드 실패:", error);
    return null;
  }
  return data?.gemini_api_key || null;
};

export const updateUserApiKey = async (userId: string, apiKey: string) => {
  if (!supabase) throw new Error("Supabase 설정이 누락되었습니다.");

  // upsert: insert if not exists, update if exists
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, gemini_api_key: apiKey });

  if (error) throw error;
};
