# Document Upload Feature Implementation

## Summary
Added comprehensive PDF/Document upload functionality to InnovaX posts system. Users can now attach documents (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT) when creating posts. Documents are visible to students, experts, and logged-out users with download capability.

## Changes Made

### Backend Changes

#### 1. **api/bootstrap.php**
- Added `parse_document_data_url()` function to validate and parse document data URLs
- Added `upload_document_locally()` function to:
  - Accept base64-encoded document data URLs
  - Validate document MIME types (PDF, Office documents, TXT)
  - Enforce 50MB file size limit
  - Store documents in `assets/documents/` directory
  - Generate unique filenames with timestamps and random hex
  - Return relative file path for database storage

**Supported Document Types:**
- PDF (application/pdf)
- Microsoft Word (.doc, .docx)
- Microsoft Excel (.xls, .xlsx)
- Microsoft PowerPoint (.ppt, .pptx)
- Plain Text (.txt)

#### 2. **api/posts/create.php**
- Updated to accept `document_data_url` parameter in JSON payload
- Modified `allowedMediaTypes` to include "pdf" (in addition to existing "image")
- Added document upload handling using new `upload_document_locally()` function
- Document stored in same media fields as images (media_type, media_url, media_label)
- Updated response payload to include document media

#### 3. **Database**
- No schema changes needed - existing posts table already supports media_type enum with 'pdf' value
- media_url and media_label store document paths and labels

#### 4. **api/posts/list.php & api/posts/view.php**
- No changes needed - already handle all media types generically
- Automatically support documents in media objects

#### 5. **api/admin/posts.php**
- Already returns mediaType and mediaUrl in admin posts list
- No backend changes required

### Frontend Changes

#### 1. **components/create-post.html**
- Added Document upload button (PDF file icon, accepts .pdf, .doc, .docx files in input)
- Updated preview section to show both image and document previews
  - Image: shows thumbnail image
  - Document: shows PDF icon in a styled container

#### 2. **assets/js/app.js** (3 major updates)

**Update 1: Upload Handler (initCreatePostUploads)**
- Enhanced renderPreview() to handle document media
  - Shows document icon for PDFs
  - Shows image thumbnail for images
- Extended file input change handler to process documents
  - Validates MIME types for documents
  - Enforces 50MB size limit for documents
  - Uses fileToDataUrl() to convert document to base64

**Update 2: Post Publishing (publishFromComposer)**
- Added documentDataUrl parameter to payload
- Passes document or image media based on user selection
- Sends appropriate media_type ("pdf" or "image") to API

**Update 3: Post Display (buildPostCard)**
- Enhanced media rendering to show download button for documents
  - Images display as before
  - Documents show red PDF icon, filename, and download button
  - Styled document container with gradient background

**Update 4: Post View Page (renderPostViewPage)**
- Added document media handling in post view
  - Shows download button with icon for document posts
  - Images continue to display as image thumbnails

#### 3. **assets/css/style.css**
Added styles for new document UI elements:
- `.document-download-container`: Styled container for document display on posts (flex column, centered, gradient background)
- `.document-icon`: Large red PDF/document icon (font-size: 3.5rem, #d32f2f red color)
- `.document-label`: Styled filename label (bold, word-break handling)
- `.create-upload-preview [data-create-preview-document]`: Document preview icon in create form (110x90px, red icon, gray background)
- `.upload-preview-content`: Wrapper for preview content

### Admin Panel Changes

#### 1. **admin/posts.html**
- Added "Document" column to posts table header (between "Avg Score" and "Action")
- Updated colspan in empty state from 7 to 8

#### 2. **admin/app.js (renderPostsTable)**
- Added document download link generation
- Shows download button for posts with PDF media
- Shows "—" for posts without documents
- Links to document file for direct download

## File Structure

```
assets/documents/          ← New folder for storing uploaded documents
  └── (files stored here with pattern: post_UUID_YYYYMMDD_HHMMSS_HEXRANDOM.ext)

components/
  └── create-post.html    ← Updated with document upload button

api/
  ├── bootstrap.php        ← Added document upload functions
  └── posts/
      └── create.php       ← Updated to handle document uploads

assets/
  ├── js/
  │   └── app.js          ← Updated upload handling and display logic
  └── css/
      └── style.css       ← Added document styling

admin/
  ├── app.js              ← Updated posts table rendering
  └── posts.html          ← Added document column to table
```

## User Flow

1. **Post Creation**
   - User clicks "Document" button in post editor
   - Selects PDF or document file
   - Preview shows document icon and filename
   - User publishes post
   - Document uploaded to `assets/documents/`
   - Post created with media_type="pdf" and media_url pointing to document

2. **Post Viewing (Public/Students/Experts)**
   - Post displays media section
   - If document: Shows red PDF icon + filename + download button
   - If image: Shows image thumbnail (unchanged)
   - User can click download button to download document

3. **Admin Panel**
   - Posts table shows "Document" column
   - If post has document: Shows download button (blue, with icon)
   - If post has no document: Shows "—" (dash)
   - Admin can download document directly from table

## Security Considerations

- File size limited to 50MB (enforced in upload_document_locally)
- MIME type validation for allowed document types
- Files stored with random hex suffix in filename to prevent collision
- Files stored in assets/documents (web accessible) - consider moving to protected directory in production
- Downloaded files use browser's default filename preservation

## Testing Checklist

- [ ] Upload PDF with post creation
- [ ] Upload Office document (DOCX, XLSX, PPTX) with post
- [ ] Verify document appears on feed posts
- [ ] Verify document appears on post-view page
- [ ] Click download button on post card - should download file
- [ ] Click download button on post view - should download file
- [ ] Verify document appears in admin posts table
- [ ] Click download button in admin table - should download file
- [ ] Test with file larger than 50MB - should reject
- [ ] Test with non-document file type - should reject
- [ ] Verify old posts without documents still work

## Performance Notes

- Documents stored locally (no external API call like ImgBB for images)
- File uploads use base64 encoding (same as images)
- Document display uses same lazy rendering pattern as images
- No additional database queries for document handling

## Future Improvements

- Move documents to protected directory outside web root (security)
- Implement document preview/thumbnail generation
- Add file size indicator in post display
- Implement document versioning
- Add document metadata (file size, type icons)
- Implement file type-specific icons
- Add drag-and-drop document upload support
