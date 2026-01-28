import { useState } from 'react';
import { useCloudinaryUpload } from '../hooks/useCloudinaryUpload';

/**
 * Reusable image upload button component using Cloudinary
 *
 * @param {Object} props
 * @param {Function} props.onImageUploaded - Callback when image is uploaded (receives image URL)
 * @param {string} props.buttonText - Text to display on button (default: "Upload Image")
 * @param {string} props.buttonVariant - Button variant (default: "secondary")
 * @param {string} props.folder - Cloudinary folder to upload to
 * @param {boolean} props.multiple - Allow multiple uploads
 * @param {Object} props.transformation - Image transformation options
 * @param {string} props.className - Additional CSS classes
 */
export const ImageUploadButton = ({
  onImageUploaded,
  buttonText = 'Upload Image',
  buttonVariant = 'secondary',
  folder = 'bizscreen',
  multiple = false,
  transformation = null,
  className = ''
}) => {
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const openUploadWidget = useCloudinaryUpload({
    folder,
    multiple,
    transformation,
    onSuccess: (uploadedFile) => {
      setUploading(false);

      // Show success toast
      setToast({
        show: true,
        message: 'Image uploaded successfully!',
        type: 'success'
      });

      // Call parent callback with the optimized URL
      onImageUploaded?.(uploadedFile.optimizedUrl);

      // Hide toast after 3 seconds
      setTimeout(() => {
        setToast({ show: false, message: '', type: 'success' });
      }, 3000);
    },
    onError: (error) => {
      setUploading(false);

      // Show error toast
      setToast({
        show: true,
        message: error.message || 'Failed to upload image',
        type: 'error'
      });

      // Hide toast after 5 seconds
      setTimeout(() => {
        setToast({ show: false, message: '', type: 'error' });
      }, 5000);
    }
  });

  const handleUploadClick = () => {
    setUploading(true);
    openUploadWidget();
  };

  return (
    <>
      <Button
        variant={buttonVariant}
        onClick={handleUploadClick}
        disabled={uploading}
        className={className}
      >
        {uploading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Uploading...
          </>
        ) : (
          <>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            {buttonText}
          </>
        )}
      </Button>

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ show: false, message: '', type: 'success' })}
        />
      )}
    </>
  );
};

export default ImageUploadButton;
