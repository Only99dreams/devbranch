import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid recording ID' });
  }

  // Get the JWT from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Check if user is admin
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (roleError || !roleData) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  // Get the recording URL from live_streams
  const { data: recording, error: recError } = await supabase
    .from('live_streams')
    .select('recording_url')
    .eq('id', id)
    .eq('recording_status', 'saved')
    .single();

  if (recError || !recording?.recording_url) {
    return res.status(404).json({ error: 'Recording not found' });
  }

  // Extract the storage path from the public URL
  const storagePrefix = '/storage/v1/object/public/';
  const idx = recording.recording_url.indexOf(storagePrefix);
  if (idx === -1) {
    return res.status(400).json({ error: 'Invalid recording URL' });
  }

  const path = recording.recording_url.substring(idx + storagePrefix.length);
  const parts = path.split('/');
  const bucket = parts.shift()!;
  const objectPath = parts.join('/');

  // Create signed URL
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(objectPath, 3600); // 1 hour expiry

  if (error || !data?.signedUrl) {
    return res.status(500).json({ error: 'Failed to generate download URL' });
  }

  res.status(200).json({ downloadUrl: data.signedUrl });
}