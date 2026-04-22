# Enhanced Document Viewer

A comprehensive document viewing component for the eDiscovery platform that supports multiple file types with zoom, rotation, and navigation controls.

## Features

### Current Implementation ✅
- **Text Document Viewing**: Display extracted text with formatting
- **Image Support**: View JPG, PNG, GIF, BMP, WEBP images
- **Zoom Controls**: 25% to 300% zoom levels
- **Rotation**: 90-degree rotation increments
- **Download Integration**: Direct download of original files
- **Responsive Design**: Adapts to different screen sizes
- **Loading States**: Smooth loading indicators
- **Error Handling**: Graceful fallbacks for unsupported formats

### Supported File Types
- **Text**: TXT, LOG, CSV, and any file with extracted text
- **Images**: JPG, JPEG, PNG, GIF, BMP, WEBP
- **PDF**: Placeholder (ready for integration)
- **Unsupported**: Graceful fallback with download option

## Usage

```tsx
import { DocumentViewer } from '@/components/enhanced/document-viewer';

function MyComponent() {
  const handleDownload = async () => {
    // Download logic
  };

  return (
    <DocumentViewer
      documentId="doc-123"
      filename="contract.pdf"
      fileType="pdf"
      extractedText="Document content..."
      onDownload={handleDownload}
      className="h-full"
    />
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `documentId` | string | Yes | Unique identifier for the document |
| `filename` | string | Yes | Display name of the file |
| `fileType` | string | No | File extension (pdf, jpg, txt, etc.) |
| `extractedText` | string | No | Extracted text content for preview |
| `onDownload` | () => void | No | Callback for download button |
| `className` | string | No | Additional CSS classes |

## Toolbar Controls

- **Zoom In/Out**: Adjust view scale from 25% to 300%
- **Rotate**: Rotate document in 90° increments
- **Reset View**: Return to 100% zoom and 0° rotation
- **Download**: Download original file

## Future Enhancements 🚀

### Phase 1: PDF Support
- [ ] Integrate react-pdf or pdf.js
- [ ] Page navigation for multi-page PDFs
- [ ] Thumbnail sidebar
- [ ] Text selection and search within PDF

### Phase 2: Advanced Features
- [ ] Side-by-side document comparison
- [ ] Annotation tools (highlights, notes)
- [ ] Redaction marking interface
- [ ] Full-screen mode
- [ ] Keyboard shortcuts

### Phase 3: Performance
- [ ] Lazy loading for large documents
- [ ] Virtual scrolling for multi-page documents
- [ ] Caching strategy for frequently viewed docs
- [ ] Progressive image loading

## Integration with Review Workflow

The DocumentViewer is integrated into the Review page (`pages/Review.tsx`) and replaces the basic text preview with a full-featured viewer.

### Before
```tsx
<div className="bg-card p-12">
  <pre>{extractedText}</pre>
</div>
```

### After
```tsx
<DocumentViewer
  documentId={currentDocument.id}
  filename={currentDocument.filename}
  fileType={currentDocument.fileType}
  extractedText={currentDocument.extractedText}
  onDownload={handleDownload}
/>
```

## Architecture

```
document-viewer/
├── DocumentViewer.tsx    # Main component with view mode logic
├── PdfViewer.tsx         # PDF-specific viewer (placeholder)
├── index.ts              # Exports
└── README.md             # This file
```

## Styling

The component uses Tailwind CSS and follows the application's design system:
- Card backgrounds for document content
- Muted backgrounds for viewer area
- Consistent border and shadow styles
- Smooth transitions for zoom/rotation

## Accessibility

- Keyboard navigation support
- ARIA labels on all interactive elements
- Focus management
- Screen reader friendly

## Performance Considerations

- Zoom and rotation use CSS transforms (GPU accelerated)
- Image URLs are properly cleaned up with `URL.revokeObjectURL()`
- Loading states prevent layout shift
- Debounced zoom controls prevent excessive re-renders

## Testing

### Manual Testing Checklist
- [ ] Text documents display correctly
- [ ] Zoom in/out works smoothly
- [ ] Rotation cycles through 0°, 90°, 180°, 270°
- [ ] Download button triggers download
- [ ] Unsupported files show fallback message
- [ ] Loading states appear during async operations
- [ ] Error states display helpful messages

### Future Automated Tests
- Unit tests for view mode detection
- Integration tests for toolbar interactions
- E2E tests for document review workflow

## Known Limitations

1. **PDF Rendering**: Currently shows placeholder - requires library integration
2. **Image Loading**: Uses placeholder - needs API endpoint implementation
3. **Large Files**: No pagination or virtual scrolling yet
4. **Annotations**: Not yet implemented
5. **Comparison Mode**: Not yet implemented

## Contributing

When adding new features:
1. Update this README
2. Add TypeScript types
3. Include error handling
4. Add loading states
5. Test with various file types
6. Update integration points

## Related Components

- `CodingPanel`: Document coding interface
- `ReviewContext`: Review workflow state management
- `Review.tsx`: Main review page integration
