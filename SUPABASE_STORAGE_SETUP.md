# Supabase Storage Setup for Image Upload

## Steps to Create the 'images' Storage Bucket

1. **Go to your Supabase Dashboard**
   - Navigate to https://supabase.com/dashboard
   - Select your project

2. **Open Storage Section**
   - Click on "Storage" in the left sidebar
   - Click on "Buckets"

3. **Create New Bucket**
   - Click "New bucket"
   - Name: `images`
   - Public bucket: ✅ **Check this box** (required for public access)
   - Click "Create bucket"

4. **Set Bucket Policies (Important!)**
   - Go to "Policies" tab in Storage
   - Create the following policies for the `images` bucket:

### Policy 1: Allow Public Uploads (for authenticated users)
```sql
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'images' 
  AND auth.role() = 'authenticated'
);
```

### Policy 2: Allow Public Access to Images
```sql
CREATE POLICY "Allow public access" ON storage.objects
FOR SELECT USING (bucket_id = 'images');
```

## Troubleshooting

### If images don't appear:
1. Check browser console for errors
2. Verify the bucket is public
3. Check if the policies are correctly set
4. Ensure the file was uploaded successfully

### Common Issues:
- **403 Forbidden**: Bucket policies not set correctly
- **404 Not Found**: Bucket doesn't exist or wrong bucket name
- **Network Error**: Check your internet connection

## Testing
After setup, you should be able to:
1. Click the "🧪 Test" button to insert a placeholder image
2. Click the "📷 Image" button to upload and insert real images
3. See images render in the editor immediately after upload