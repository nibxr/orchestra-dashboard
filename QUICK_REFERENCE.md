# Design Review System - Quick Reference

## 🚀 Quick Start Commands

```bash
# Already installed dependencies
npm install react-zoom-pan-pinch react-dropzone emoji-picker-react date-fns

# Run database migration (in Supabase Dashboard → SQL Editor)
# Execute: supabase/migrations/001_design_review_system.sql

# Create storage bucket (in Supabase Dashboard → Storage)
# Name: comment-attachments
# Public: Yes
# Size Limit: 10MB
```

---

## 📁 File Structure

```
src/
├── components/
│   ├── DesignReviewPage.jsx         ← Start here!
│   ├── DesignReviewSidebar.jsx      ← Left sidebar
│   ├── DesignCanvas.jsx             ← Canvas area
│   ├── CanvasControls.jsx
│   ├── DevicePreviewToggle.jsx
│   ├── CommentPin.jsx
│   ├── CommentPinsOverlay.jsx
│   ├── CommentThread.jsx
│   ├── CommentReactions.jsx
│   └── AttachmentUploader.jsx
├── utils/
│   ├── versionService.js            ← Version CRUD
│   ├── canvasTransforms.js          ← Coordinates
│   └── fileUploadService.js         ← File upload
└── hooks/
    └── useCanvasComments.js         ← Pin placement

supabase/migrations/
└── 001_design_review_system.sql     ← Database schema
```

---

## 🎯 Common Tasks

### Create a Version
```javascript
import { createVersion } from './utils/versionService';

await createVersion(
  taskId,
  'https://figma.com/file/abc123',
  'Homepage Design v1'
);
```

### Add a Comment
```javascript
await supabase.from('comments').insert({
  task_id: taskId,
  version_id: versionId,
  content: 'Great design!',
  position_x: 45.5,  // percentage
  position_y: 60.2,  // percentage
  is_note: false
});
```

### Add Reaction
```javascript
await supabase.from('comment_reactions').insert({
  comment_id: commentId,
  user_id: currentUserId,
  emoji: '👍'
});
```

### Upload Attachment
```javascript
import { uploadCommentAttachment } from './utils/fileUploadService';

const { data, error } = await uploadCommentAttachment(
  file,
  commentId,
  taskId,
  userId
);
```

---

## 🔑 Key Components API

### DesignReviewPage
```javascript
// Main orchestrator - handles everything
// Props: None (uses route params)
// State: task, versions, comments, canvas mode, etc.
```

### DesignCanvas
```javascript
<DesignCanvas
  version={currentVersion}
  comments={comments}
  canvasMode="view"            // 'view' | 'comment' | 'move'
  onCanvasModeChange={setMode}
  devicePreview="desktop"      // 'desktop' | 'tablet' | 'mobile'
  onDeviceChange={setDevice}
  activeCommentId={commentId}
  highlightedPinId={pinId}
  onCanvasClick={handleClick}
  onPinClick={handlePinClick}
  canvasRef={ref}
/>
```

### DesignReviewSidebar
```javascript
<DesignReviewSidebar
  task={task}
  versions={versions}
  currentVersion={currentVersion}
  onVersionChange={handleChange}
  comments={comments}
  currentUserId={userId}
  activeCommentId={commentId}
  onCommentClick={handleClick}
  onAddComment={handleAdd}
  onDeleteComment={handleDelete}
  onResolveComment={handleResolve}
  onAddReaction={handleReaction}
  onRemoveReaction={handleRemove}
  team={team}
/>
```

---

## 🎨 Canvas Modes

| Mode | Description | Cursor | Action |
|------|-------------|--------|--------|
| View | Default navigation | pointer | Click pins, view content |
| Comment | Place comment pins | crosshair | Click to add comment |
| Move | Pan canvas | move | Drag to pan |

---

## 📊 Database Schema Cheat Sheet

### task_versions
```sql
id, task_id, version_number, version_name,
embed_url, embed_type, created_at, is_current
```

### comments (new columns)
```sql
version_id, parent_comment_id,
position_x, position_y,
is_resolved, resolved_at
```

### comment_reactions
```sql
id, comment_id, user_id, emoji, created_at
```

### comment_attachments
```sql
id, comment_id, file_url, file_name,
file_type, file_size, created_at
```

---

## 🛠️ Utility Functions

### Version Service
```javascript
getTaskVersions(taskId)
getCurrentVersion(taskId)
createVersion(taskId, url, name)
setCurrentVersion(versionId)
migrateTaskToVersioned(taskId, desc, content)
```

### Canvas Transforms
```javascript
clickToPercentage(x, y, width, height)
percentageToPixels(x, y, width, height)
getRelativePosition(event, container)
formatEmbedUrl(url, embedType)
```

### File Upload
```javascript
uploadCommentAttachment(file, commentId, taskId, userId)
deleteAttachment(attachmentId, fileUrl)
validateFile(file, maxSize, allowedTypes)
```

---

## 🔗 Real-time Subscriptions

```javascript
// Subscribe to comment changes
const channel = supabase
  .channel(`task:${taskId}`)
  .on('postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'comments',
      filter: `task_id=eq.${taskId}`
    },
    (payload) => handleNewComment(payload.new)
  )
  .subscribe();

// Cleanup
return () => supabase.removeChannel(channel);
```

---

## 🎛️ Configuration

### Device Sizes
```javascript
// In canvasTransforms.js
export const DEVICE_SIZES = {
  desktop: { width: '100%', height: '100%' },
  tablet: { width: '768px', height: '1024px' },
  mobile: { width: '375px', height: '667px' }
};
```

### Comment Depth Limit
```javascript
// In CommentThread.jsx
{depth < 3 ? renderReplies : showViewMore}
```

### File Size Limit
```javascript
// In fileUploadService.js
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
```

---

## 🐛 Debugging

### Check Canvas Position
```javascript
console.log('Click position:', {
  clickX,
  clickY,
  percentage: clickToPercentage(clickX, clickY, width, height)
});
```

### Check Version State
```javascript
console.log('Current version:', currentVersion);
console.log('All versions:', versions);
```

### Check Comments
```javascript
console.log('All comments:', comments);
console.log('Version comments:', comments.filter(c => c.version_id === versionId));
```

### Check Real-time
```javascript
// In DesignReviewPage.jsx
// Look for console.logs:
// - "New comment:"
// - "Updated comment:"
// - "Deleted comment:"
// - "Version changed:"
```

---

## ⚡ Performance Tips

1. **Memoize expensive calculations**
```javascript
const filteredComments = useMemo(
  () => comments.filter(c => c.version_id === currentVersion?.id),
  [comments, currentVersion]
);
```

2. **Debounce frequent updates**
```javascript
const debouncedUpdate = useMemo(
  () => debounce(updateFunction, 300),
  []
);
```

3. **Use React.memo for static components**
```javascript
export default React.memo(CommentPin);
```

---

## 🚨 Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| Pins not appearing | Check `version_id` matches current version |
| Upload fails | Verify storage bucket exists and is public |
| Real-time not working | Check Supabase Realtime is enabled |
| Pins in wrong position | Ensure using percentages (0-100) not pixels |
| Comments not threading | Check `parent_comment_id` is set correctly |

---

## 📚 Learn More

- **Setup Guide**: `DESIGN_REVIEW_SETUP.md`
- **Implementation Details**: `DESIGN_REVIEW_IMPLEMENTATION.md`
- **Complete Summary**: `IMPLEMENTATION_SUMMARY.md`
- **Architecture Plan**: `.claude/plans/greedy-snacking-wadler.md`

---

## 🎯 Quick Test Script

```javascript
// 1. Create a version
const { data: version } = await createVersion(
  'task-id',
  'https://figma.com/file/abc123',
  'Test Version'
);

// 2. Add a comment
const { data: comment } = await supabase.from('comments').insert({
  task_id: 'task-id',
  version_id: version.id,
  content: 'Test comment',
  position_x: 50,
  position_y: 50
}).select().single();

// 3. Add a reaction
await supabase.from('comment_reactions').insert({
  comment_id: comment.id,
  user_id: 'user-id',
  emoji: '👍'
});

// 4. Navigate to task
window.location.href = `/task/task-id`;
```

---

## ✅ Checklist

Before deploying:
- [ ] Database migration run
- [ ] Storage bucket created
- [ ] RLS policies configured
- [ ] Auth user ID integrated
- [ ] Error handling added
- [ ] Loading states improved
- [ ] Tested on multiple devices
- [ ] Tested with multiple users

---

**That's it! You're ready to go! 🚀**
