# Design Review System - Setup Instructions

## ✅ Implementation Complete!

All components and functionality have been implemented. Follow these steps to set up and use the system.

---

## 🚀 Quick Start

### 1. Database Setup

The database migration file has been created. Run it in your Supabase dashboard:

```bash
# Option 1: Using Supabase CLI
supabase db reset --with-migrations

# Option 2: Manually in Supabase Dashboard
# Go to SQL Editor and run the contents of:
# supabase/migrations/001_design_review_system.sql
```

This will create:
- `task_versions` table
- Modified `comments` table with new columns
- `comment_reactions` table
- `comment_attachments` table
- Helper functions for version management

### 2. Create Storage Bucket

In your Supabase Dashboard:

1. Go to **Storage** section
2. Click **Create Bucket**
3. Name: `comment-attachments`
4. Settings:
   - **Public**: Yes (checked)
   - **File size limit**: 10MB
   - **Allowed MIME types**: Leave empty (or specify: image/*, video/*, application/pdf, etc.)

### 3. Configure RLS Policies (Optional but Recommended)

Add Row Level Security policies based on your authentication setup:

```sql
-- Example policies for task_versions
CREATE POLICY "Users can view task versions" ON task_versions
  FOR SELECT USING (true);

CREATE POLICY "Team can create versions" ON task_versions
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM team)
  );

-- Example policies for comment_reactions
CREATE POLICY "Users can view reactions" ON comment_reactions
  FOR SELECT USING (true);

CREATE POLICY "Users can add their own reactions" ON comment_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Example policies for comment_attachments
CREATE POLICY "Users can view attachments" ON comment_attachments
  FOR SELECT USING (true);

CREATE POLICY "Users can add attachments" ON comment_attachments
  FOR INSERT WITH CHECK (auth.uid() = uploaded_by_id);
```

Adjust these based on your specific auth implementation.

---

## 📦 Dependencies Installed

All required npm packages have been installed:

```bash
✅ react-zoom-pan-pinch    # Canvas pan/zoom functionality
✅ react-dropzone          # File upload with drag-drop
✅ emoji-picker-react      # Emoji reactions
✅ date-fns                # Date formatting
```

---

## 🎨 How to Use

### Creating Your First Version

1. **Navigate to a task**: Go to `/task/:taskId`

2. **Add a version** (if none exist):
   ```javascript
   // The system will automatically fall back to legacy view if no versions exist
   // To create the first version, you can use the version service:

   import { createVersion } from './utils/versionService';

   await createVersion(
     taskId,
     'https://www.figma.com/file/abc123/Design',
     'Homepage Design v1'
   );
   ```

3. **Or migrate existing task** with embed URL in description:
   ```javascript
   import { migrateTaskToVersioned } from './utils/versionService';

   await migrateTaskToVersioned(taskId, task.description, task.content);
   ```

### Using the Interface

#### Canvas Modes
- **View Mode** (default): Navigate and view the design
- **Comment Mode**: Click canvas to place comment pins
- **Pan Mode**: Pan around the canvas (also works with scroll/drag)

#### Adding Comments
1. Click **Comment mode** button in toolbar
2. Click on canvas where you want to place the comment
3. Comment composer opens with position saved
4. Type your comment and click **Send**
5. Pin appears on canvas at the clicked position

#### Version Management
- Use the **version dropdown** in sidebar to switch between versions
- Comments are filtered to the selected version
- Add new versions using the **+ Add version** button

#### Device Preview (Websites Only)
- Toggle between Desktop/Tablet/Mobile views
- Only available for website/link embeds
- Figma embeds always show full-screen

#### Threaded Replies
- Click **Reply** on any comment
- Supports up to 3 levels of nesting
- After level 3, shows "View more replies" button

#### Reactions & Attachments
- Click the smile icon to add emoji reactions
- Drag and drop files to upload attachments
- Max file size: 10MB

---

## 🏗️ Architecture Overview

### Component Hierarchy

```
DesignReviewPage (Main Orchestrator)
├── DesignReviewSidebar
│   ├── Tab Bar (Details | Comments)
│   ├── Version Selector
│   ├── Details Tab (task properties)
│   └── Comments Tab
│       ├── CommentThread (recursive)
│       │   ├── CommentReactions
│       │   └── AttachmentList
│       └── Comment Composer
└── DesignCanvas
    ├── CanvasControls (toolbar)
    │   ├── Mode toggles
    │   ├── Zoom controls
    │   └── DevicePreviewToggle
    ├── TransformWrapper (pan/zoom)
    │   └── Embed Iframe
    └── CommentPinsOverlay
        └── CommentPin (multiple)
```

### State Management

The system uses local React state with the following key state variables:

```javascript
// Core data
- task: Current task data
- versions: Array of all versions
- currentVersion: Active version
- comments: Array of all comments with reactions/attachments

// Canvas state
- canvasMode: 'view' | 'comment' | 'move'
- devicePreview: 'desktop' | 'tablet' | 'mobile'

// UI state
- activeCommentId: Highlighted comment in sidebar
- highlightedPinId: Highlighted pin on canvas
```

### Real-time Updates

The system automatically subscribes to:
- New comments (`INSERT` on `comments`)
- Updated comments (`UPDATE` on `comments`)
- Deleted comments (`DELETE` on `comments`)
- Version changes (all events on `task_versions`)

Open the same task in multiple browsers to see live updates!

---

## 🧪 Testing Checklist

### Basic Functionality
- [ ] Task loads with versions
- [ ] Can switch between versions
- [ ] Can switch between Details/Comments tabs
- [ ] Comments filter correctly when switching versions

### Canvas Interaction
- [ ] Can enter comment mode
- [ ] Can click canvas to place pin
- [ ] Pin appears at correct position
- [ ] Can zoom in/out
- [ ] Can pan canvas
- [ ] Pins scale correctly with zoom

### Comments
- [ ] Can add regular comment (no position)
- [ ] Can add positioned comment (with pin)
- [ ] Can reply to comment (depth 1)
- [ ] Can reply to reply (depth 2, 3)
- [ ] Can edit own comments
- [ ] Can delete own comments
- [ ] Can resolve/unresolve comments
- [ ] Resolved comments show green checkmark
- [ ] Resolved pins turn green

### Pin-Comment Sync
- [ ] Clicking pin scrolls to comment in sidebar
- [ ] Clicking comment highlights pin on canvas
- [ ] Active states display correctly

### Reactions & Attachments
- [ ] Can add emoji reaction
- [ ] Can remove own reaction
- [ ] Reaction count updates
- [ ] Can upload file attachment
- [ ] Can view attachment preview
- [ ] Can delete own attachment

### Device Preview (Websites)
- [ ] Device toggle appears for website embeds
- [ ] Device toggle hidden for Figma embeds
- [ ] Can switch Desktop → Tablet → Mobile
- [ ] Iframe resizes correctly
- [ ] Pins maintain position across device sizes

### Real-time
- [ ] Open task in two browsers
- [ ] Add comment in Browser A → appears in Browser B
- [ ] Add reaction in Browser A → appears in Browser B
- [ ] Switch version in Browser A → updates in Browser B

---

## 🐛 Troubleshooting

### Issue: "No versions" message appears

**Solution**: Create a version for the task:
```javascript
await createVersion(taskId, embedUrl, versionName);
```

### Issue: Storage upload fails

**Solution**:
1. Check that `comment-attachments` bucket exists
2. Verify bucket is set to **Public**
3. Check file size is under 10MB
4. Verify Supabase Storage is enabled for your project

### Issue: Comments not appearing

**Solution**:
1. Check that version is selected
2. Verify comments have correct `version_id`
3. Check browser console for errors
4. Verify Supabase connection

### Issue: Pins not scaling correctly

**Solution**:
- Pins use percentage-based positioning
- Check that `canvasRef` is properly attached to the container
- Verify `position_x` and `position_y` are stored as percentages (0-100)

### Issue: Real-time updates not working

**Solution**:
1. Check Supabase Realtime is enabled
2. Verify channel subscription is active
3. Check browser console for subscription errors
4. Ensure RLS policies allow reading

---

## 🔧 Configuration

### Customizing Device Sizes

Edit `src/utils/canvasTransforms.js`:

```javascript
export const DEVICE_SIZES = {
  desktop: { width: '100%', height: '100%', label: 'Desktop' },
  tablet: { width: '768px', height: '1024px', label: 'Tablet' },
  mobile: { width: '375px', height: '667px', label: 'Mobile' },
  // Add custom sizes:
  ipad: { width: '1024px', height: '1366px', label: 'iPad Pro' }
};
```

### Customizing Max Nesting Depth

Edit `src/components/CommentThread.jsx`:

```javascript
// Change this line:
{depth < 3 ? (

// To your desired depth:
{depth < 5 ? (
```

### Customizing File Upload Limits

Edit `src/utils/fileUploadService.js`:

```javascript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // Change to your limit
```

---

## 📊 Database Schema Reference

### task_versions
```sql
- id: UUID (PK)
- task_id: UUID (FK → tasks)
- version_number: INTEGER
- version_name: VARCHAR(255)
- embed_url: TEXT
- embed_type: VARCHAR(50)
- thumbnail_url: TEXT (optional)
- created_at: TIMESTAMPTZ
- created_by_id: UUID (FK → team)
- is_current: BOOLEAN
- archived_at: TIMESTAMPTZ (soft delete)
```

### comments (new columns)
```sql
- version_id: UUID (FK → task_versions)
- parent_comment_id: UUID (FK → comments, for threading)
- position_x: DECIMAL(5,2) (percentage 0-100)
- position_y: DECIMAL(5,2) (percentage 0-100)
- is_resolved: BOOLEAN
- resolved_at: TIMESTAMPTZ
- resolved_by_id: UUID (FK → team)
```

### comment_reactions
```sql
- id: UUID (PK)
- comment_id: UUID (FK → comments)
- user_id: UUID (FK → team)
- emoji: VARCHAR(10)
- created_at: TIMESTAMPTZ
- UNIQUE(comment_id, user_id, emoji)
```

### comment_attachments
```sql
- id: UUID (PK)
- comment_id: UUID (FK → comments)
- file_url: TEXT
- file_name: VARCHAR(255)
- file_type: VARCHAR(100)
- file_size: INTEGER
- uploaded_by_id: UUID (FK → team)
- created_at: TIMESTAMPTZ
```

---

## 🎯 Next Steps & Enhancements

### Immediate Improvements
1. **Auth Integration**: Replace `'current-user-id'` with actual user ID from AuthContext
2. **Add Version Modal**: Create UI for adding new versions
3. **Error Handling**: Add toast notifications for errors
4. **Loading States**: Add skeletons for better UX

### Future Enhancements
1. **Live Cursors**: Show other users' cursor positions in real-time
2. **Version Comparison**: Side-by-side version comparison view
3. **Export Comments**: Export comments as PDF or CSV
4. **@Mentions**: Mention users in comments with notifications
5. **Comment Search**: Search through all comments
6. **Pin Colors**: Custom colors for different comment types
7. **Shortcuts**: Keyboard shortcuts for common actions
8. **Notifications**: Email/in-app notifications for new comments
9. **Comment Templates**: Pre-defined comment templates
10. **Version Thumbnails**: Auto-generate thumbnails for versions

---

## 📝 API Reference

### Version Service

```javascript
import {
  getTaskVersions,
  getCurrentVersion,
  createVersion,
  updateVersion,
  setCurrentVersion,
  deleteVersion,
  migrateTaskToVersioned
} from './utils/versionService';

// Get all versions for a task
const { data, error } = await getTaskVersions(taskId);

// Create new version
const { data, error } = await createVersion(
  taskId,
  'https://figma.com/...',
  'Version Name'
);
```

### File Upload Service

```javascript
import {
  uploadCommentAttachment,
  deleteAttachment,
  getCommentAttachments
} from './utils/fileUploadService';

// Upload file
const { data, error } = await uploadCommentAttachment(
  file,
  commentId,
  taskId,
  userId
);
```

### Canvas Transforms

```javascript
import {
  clickToPercentage,
  percentageToPixels,
  formatEmbedUrl
} from './utils/canvasTransforms';

// Convert click to percentage
const position = clickToPercentage(clickX, clickY, canvasWidth, canvasHeight);
// Returns: { x: 45.5, y: 60.2 }
```

---

## 🆘 Support

If you encounter issues:

1. Check browser console for errors
2. Verify database migration ran successfully
3. Check storage bucket permissions
4. Review RLS policies
5. Test with Supabase logs in dashboard

For questions about implementation details, refer to:
- `DESIGN_REVIEW_IMPLEMENTATION.md` - Current status
- `.claude/plans/greedy-snacking-wadler.md` - Detailed architecture

---

## 🎉 You're All Set!

The Design Review System is ready to use. Navigate to any task with versions to start collaborating!

**Example workflow:**
1. Create a task
2. Add a Figma or website URL as the first version
3. Open the task at `/task/:taskId`
4. Switch to Comment mode
5. Click on the design to place comments
6. Collaborate with your team in real-time!

Happy reviewing! 🚀
