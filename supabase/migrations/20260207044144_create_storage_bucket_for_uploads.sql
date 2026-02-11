/*
  # Create Storage Bucket for File Uploads

  1. Storage Setup
    - Create 'uploads' bucket for client files (logos, designs, documents)
    - Configure public access for uploaded files
    - Set up RLS policies for bucket access

  2. Tables
    - Create 'uploaded_files' table to track all uploads with metadata
    - Link uploads to users and entities (invoices, quotes, clients, etc.)

  3. Security
    - Enable RLS on uploaded_files table
    - Users can only access their own uploaded files
    - Files are accessible via public URLs after upload
*/

-- Create storage bucket for uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads',
  'uploads',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'application/pdf', 'application/postscript', 'application/illustrator']
)
ON CONFLICT (id) DO NOTHING;

-- Create uploaded_files tracking table
CREATE TABLE IF NOT EXISTS uploaded_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  mime_type text,
  entity_type text,
  entity_id uuid,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_id ON uploaded_files(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_entity ON uploaded_files(entity_type, entity_id);

-- Enable RLS
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for uploaded_files
CREATE POLICY "Users can view own uploaded files"
  ON uploaded_files FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own uploaded files"
  ON uploaded_files FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own uploaded files"
  ON uploaded_files FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own uploaded files"
  ON uploaded_files FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Storage policies for uploads bucket
CREATE POLICY "Users can upload files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'uploads' AND (select auth.uid()) IS NOT NULL);

CREATE POLICY "Users can view files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'uploads');

CREATE POLICY "Users can update own files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'uploads' AND owner = (select auth.uid()));

CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'uploads' AND owner = (select auth.uid()));

-- Allow public access to read files (since bucket is public)
CREATE POLICY "Public can view uploaded files"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'uploads');
