import React, { useState, useEffect } from 'react';
import { boardroomsAPI } from '../services/api';
import { Boardroom, BoardroomImage } from '../types';

const AdminBoardrooms: React.FC = () => {
  const [boardrooms, setBoardrooms] = useState<Boardroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingBoardroom, setEditingBoardroom] = useState<Boardroom | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    capacity: 1,
    location: '',
    amenities: [] as string[],
    description: '',
    images: [] as BoardroomImage[]
  });
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageAlt, setNewImageAlt] = useState('');
  const [isPrimaryImage, setIsPrimaryImage] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMode, setUploadMode] = useState<'url' | 'file'>('url');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchBoardrooms();
  }, []);

  const fetchBoardrooms = async () => {
    try {
      const data = await boardroomsAPI.getAllAdmin();
      setBoardrooms(data);
    } catch (error) {
      console.error('Error fetching boardrooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingBoardroom) {
        await boardroomsAPI.update(editingBoardroom._id, formData);
        alert('Boardroom updated successfully!');
      } else {
        await boardroomsAPI.create(formData);
        alert('Boardroom created successfully!');
      }
      
      setShowCreateForm(false);
      setEditingBoardroom(null);
      resetForm();
      fetchBoardrooms();
    } catch (error: any) {
      alert(error.message || 'Failed to save boardroom');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this boardroom?')) {
      return;
    }

    try {
      await boardroomsAPI.delete(id);
      alert('Boardroom deactivated successfully!');
      fetchBoardrooms();
    } catch (error: any) {
      alert(error.message || 'Failed to deactivate boardroom');
    }
  };

  const handlePermanentDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to PERMANENTLY DELETE "${name}"? This action cannot be undone and will only work if the boardroom has no bookings.`)) {
      return;
    }

    try {
      await boardroomsAPI.permanentDelete(id);
      alert('Boardroom permanently deleted successfully!');
      fetchBoardrooms();
    } catch (error: any) {
      alert(error.message || 'Failed to permanently delete boardroom');
    }
  };

  const handleEdit = (boardroom: Boardroom) => {
    setEditingBoardroom(boardroom);
    setFormData({
      name: boardroom.name,
      capacity: boardroom.capacity,
      location: boardroom.location,
      amenities: boardroom.amenities,
      description: boardroom.description || '',
      images: boardroom.images
    });
    setShowCreateForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      capacity: 1,
      location: '',
      amenities: [],
      description: '',
      images: []
    });
    setNewImageUrl('');
    setNewImageAlt('');
    setIsPrimaryImage(false);
    setSelectedFile(null);
    setUploadMode('url');
    setUploading(false);
  };

  const addAmenity = () => {
    const amenity = prompt('Enter amenity name:');
    if (amenity && !formData.amenities.includes(amenity)) {
      setFormData(prev => ({
        ...prev,
        amenities: [...prev.amenities, amenity]
      }));
    }
  };

  const removeAmenity = (index: number) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.filter((_, i) => i !== index)
    }));
  };

  const addImage = async () => {
    if (uploadMode === 'url') {
      if (!newImageUrl.trim()) {
        alert('Please enter an image URL');
        return;
      }
    } else {
      if (!selectedFile) {
        alert('Please select an image file');
        return;
      }
    }

    try {
      setUploading(true);

      if (editingBoardroom) {
        if (uploadMode === 'url') {
          await boardroomsAPI.addImage(editingBoardroom._id, {
            imageUrl: newImageUrl,
            alt: newImageAlt || 'Boardroom image',
            isPrimary: isPrimaryImage
          });
        } else {
          await boardroomsAPI.uploadImage(
            editingBoardroom._id,
            selectedFile,
            newImageAlt || 'Boardroom image',
            isPrimaryImage
          );
        }
        fetchBoardrooms();
      } else {
        if (uploadMode === 'url') {
          setFormData(prev => ({
            ...prev,
            images: [...prev.images, {
              url: newImageUrl,
              alt: newImageAlt || 'Boardroom image',
              isPrimary: isPrimaryImage
            }]
          }));
        } else {
          // For new boardrooms, we'll need to create the boardroom first before uploading files
          alert('Please create the boardroom first, then upload images from the edit mode');
          return;
        }
      }
      
      setNewImageUrl('');
      setNewImageAlt('');
      setIsPrimaryImage(false);
      setSelectedFile(null);
    } catch (error: any) {
      alert(error.message || 'Failed to add image');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async (imageIndex: number) => {
    try {
      if (editingBoardroom) {
        await boardroomsAPI.removeImage(editingBoardroom._id, imageIndex);
        fetchBoardrooms();
      } else {
        setFormData(prev => ({
          ...prev,
          images: prev.images.filter((_, i) => i !== imageIndex)
        }));
      }
    } catch (error: any) {
      alert(error.message || 'Failed to remove image');
    }
  };

  const getUnsplashImage = async (query: string) => {
    try {
      const response = await fetch(
        `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&client_id=YOUR_UNSPLASH_ACCESS_KEY`
      );
      const data = await response.json();
      return data.urls.regular;
    } catch (error) {
      console.error('Error fetching Unsplash image:', error);
      return null;
    }
  };

  const addUnsplashImage = async (query: string) => {
    const imageUrl = await getUnsplashImage(query);
    if (imageUrl) {
      setUploadMode('url');
      setNewImageUrl(imageUrl);
      setNewImageAlt(`${query} boardroom`);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image file size must be less than 5MB');
        return;
      }
      
      setSelectedFile(file);
      setUploadMode('file');
      
      // Clear URL if switching to file mode
      setNewImageUrl('');
    }
  };

  const clearFileSelection = () => {
    setSelectedFile(null);
    setUploadMode('url');
  };

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Boardrooms</h1>
            <p className="text-gray-600">Manage boardrooms and their images</p>
          </div>
          <button
            onClick={() => {
              setShowCreateForm(true);
              setEditingBoardroom(null);
              resetForm();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Add New Boardroom
          </button>
        </div>
      </div>

      {/* Boardrooms List */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">All Boardrooms</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {boardrooms.map((boardroom) => (
            <div key={boardroom._id} className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">
                    {boardroom.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {boardroom.location} • Capacity: {boardroom.capacity} people
                  </p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    boardroom.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {boardroom.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEdit(boardroom)}
                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(boardroom._id)}
                    className="px-3 py-1 text-sm text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded-md transition-colors"
                  >
                    Deactivate
                  </button>
                  <button
                    onClick={() => handlePermanentDelete(boardroom._id, boardroom.name)}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                    title="Permanently delete (only if no bookings exist)"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {boardroom.description && (
                <p className="text-gray-600 mb-4 text-sm">{boardroom.description}</p>
              )}

              {boardroom.amenities.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Amenities</h4>
                  <div className="flex flex-wrap gap-2">
                    {boardroom.amenities.map((amenity, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {boardroom.images.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Images ({boardroom.images.length})</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {boardroom.images.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={image.url}
                          alt={image.alt}
                          className="w-full h-24 object-cover rounded-md"
                        />
                        {image.isPrimary && (
                          <span className="absolute top-1 left-1 px-1 py-0.5 bg-blue-600 text-white text-xs rounded">
                            Primary
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Create/Edit Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingBoardroom ? 'Edit Boardroom' : 'Create New Boardroom'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingBoardroom(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Capacity *
                  </label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) }))}
                    min="1"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location *
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amenities
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.amenities.map((amenity, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {amenity}
                      <button
                        type="button"
                        onClick={() => removeAmenity(index)}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addAmenity}
                  className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                >
                  + Add Amenity
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Images
                </label>
                
                {/* Upload Mode Toggle */}
                <div className="mb-4">
                  <div className="flex items-center space-x-4 mb-3">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="uploadMode"
                        value="url"
                        checked={uploadMode === 'url'}
                        onChange={() => {
                          setUploadMode('url');
                          setSelectedFile(null);
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Image URL</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="uploadMode"
                        value="file"
                        checked={uploadMode === 'file'}
                        onChange={() => {
                          setUploadMode('file');
                          setNewImageUrl('');
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Upload File</span>
                    </label>
                  </div>
                </div>

                {/* Quick Unsplash Images - only show in URL mode */}
                {uploadMode === 'url' && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Quick add from Unsplash:</p>
                    <div className="flex flex-wrap gap-2">
                      {['conference room', 'meeting room', 'office space', 'boardroom'].map((query) => (
                        <button
                          key={query}
                          type="button"
                          onClick={() => addUnsplashImage(query)}
                          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          {query}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Image Form */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {uploadMode === 'url' ? (
                    <input
                      type="url"
                      placeholder="Image URL"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                          {selectedFile ? selectedFile.name : 'Choose image file...'}
                        </span>
                        {selectedFile && (
                          <button
                            type="button"
                            onClick={clearFileSelection}
                            className="text-red-500 hover:text-red-700 text-sm ml-2"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <input
                    type="text"
                    placeholder="Alt text"
                    value={newImageAlt}
                    onChange={(e) => setNewImageAlt(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  
                  <div className="flex items-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isPrimaryImage}
                        onChange={(e) => setIsPrimaryImage(e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Primary image</span>
                    </label>
                  </div>
                </div>

                {uploadMode === 'file' && !editingBoardroom && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      File upload is only available when editing existing boardrooms. Create the boardroom first, then edit it to upload images.
                    </p>
                  </div>
                )}
                
                <button
                  type="button"
                  onClick={addImage}
                  disabled={uploading || (uploadMode === 'file' && !editingBoardroom)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading...
                    </span>
                  ) : (
                    `Add Image ${uploadMode === 'file' ? '(Upload)' : '(URL)'}`
                  )}
                </button>

                {/* Current Images */}
                {formData.images.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Current Images</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {formData.images.map((image, index) => (
                        <div key={index} className="relative">
                          <img
                            src={image.url}
                            alt={image.alt}
                            className="w-full h-24 object-cover rounded-md"
                          />
                          {image.isPrimary && (
                            <span className="absolute top-1 left-1 px-1 py-0.5 bg-blue-600 text-white text-xs rounded">
                              Primary
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 px-1 py-0.5 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingBoardroom(null);
                    resetForm();
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  {editingBoardroom ? 'Update Boardroom' : 'Create Boardroom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBoardrooms; 