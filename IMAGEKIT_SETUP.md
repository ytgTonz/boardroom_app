# ImageKit.io Setup Guide

This application uses ImageKit.io for image storage and optimization. Follow these steps to configure ImageKit.io integration.

## 1. ImageKit.io Account Setup

1. Sign up for a free account at [ImageKit.io](https://imagekit.io/)
2. Go to your dashboard and note down your:
   - **URL Endpoint** (e.g., `https://ik.imagekit.io/your_imagekit_id`)
   - **Public Key**
   - **Private Key**

## 2. Backend Configuration

Add the following environment variables to your backend `.env` file:

```env
# ImageKit.io Configuration
IMAGEKIT_PUBLIC_KEY=your_public_key_here
IMAGEKIT_PRIVATE_KEY=your_private_key_here
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_imagekit_id
```

## 3. Features

The admin boardroom management now supports:

- **Local File Upload**: Upload images directly from your computer
- **URL-based Images**: Add images via URL (existing functionality)
- **Unsplash Integration**: Quick add images from Unsplash
- **File Validation**: 
  - Only image files allowed
  - Maximum file size: 5MB
  - Automatic file type checking

## 4. Image Management

- Images are stored in ImageKit.io under `/boardrooms/` folder
- Each image has a unique filename with timestamp
- Images include metadata (alt text, primary flag)
- File IDs are stored for efficient deletion

## 5. File Upload Process

1. **Create Boardroom**: First create the boardroom with basic details
2. **Edit Mode**: Enter edit mode to access file upload functionality
3. **Choose Upload Type**: Select between URL or file upload
4. **Upload**: Select local file and add alt text
5. **Set Primary**: Mark as primary image if needed

## 6. Security Features

- Admin-only access to upload endpoints
- File type validation (images only)
- File size limits (5MB max)
- Secure authentication with ImageKit.io

## 7. Usage Tips

- For new boardrooms: Create the boardroom first, then edit to upload files
- File uploads are only available in edit mode for existing boardrooms
- URL-based images work for both new and existing boardrooms
- Primary images are automatically managed (only one primary per boardroom)

## 8. Error Handling

The system includes comprehensive error handling for:
- Invalid file types
- File size exceeded
- Network upload failures
- ImageKit.io API errors
- Missing authentication

## 9. Development vs Production

- **Development**: Uses test credentials if not configured
- **Production**: Requires proper ImageKit.io credentials
- Environment variables are loaded from `.env` file