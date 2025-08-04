import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { boardroomsAPI } from '../services/api';
import { Boardroom } from '../types';

const BoardroomList: React.FC = () => {
  const navigate = useNavigate();
  const [boardrooms, setBoardrooms] = useState<Boardroom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBoardrooms = async () => {
      try {
        const data = await boardroomsAPI.getAll();
        setBoardrooms(data);
      } catch (error) {
        console.error('Error fetching boardrooms:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBoardrooms();
  }, []);

  const getCapacityColor = (capacity: number) => {
    if (capacity >= 15) return 'bg-red-100 text-red-800';
    if (capacity >= 10) return 'bg-orange-100 text-orange-800';
    if (capacity >= 5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getAmenityIcon = (amenity: string) => {
    switch (amenity.toLowerCase()) {
      case 'projector':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      case 'whiteboard':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        );
      case 'video conference':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Available Boardrooms</h1>
        <p className="text-gray-600">
          Browse and book from our selection of professional meeting spaces.
        </p>
      </div>

      {/* Boardrooms */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {filteredBoardrooms.length} Room{filteredBoardrooms.length !== 1 ? 's' : ''} Available
          </h2>
        </div>

        {filteredBoardrooms.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No rooms found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search criteria.' : 'No boardrooms are currently available.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredBoardrooms.map((boardroom) => (
              <div key={boardroom._id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                {/* Boardroom Image */}
                {boardroom.images && boardroom.images.length > 0 && (
                  <div className="mb-4">
                    <img
                      src={boardroom.images.find(img => img.isPrimary)?.url || boardroom.images[0].url}
                      alt={boardroom.images.find(img => img.isPrimary)?.alt || boardroom.images[0].alt}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>
                )}
                
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">
                      {boardroom.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {boardroom.location}
                    </p>
                  </div>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getCapacityColor(boardroom.capacity)}`}>
                    {boardroom.capacity} people
                  </span>
                </div>

                {boardroom.description && (
                  <p className="text-gray-600 mb-4 text-sm">
                    {boardroom.description}
                  </p>
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
                          {getAmenityIcon(amenity)}
                          <span className="ml-1">{amenity}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      boardroom.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {boardroom.isActive ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                  
                  <button 
                    onClick={() => navigate('/book', { state: { selectedBoardroom: boardroom._id } })}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    Book Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BoardroomList; 