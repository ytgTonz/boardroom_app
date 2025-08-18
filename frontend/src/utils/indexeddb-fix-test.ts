/**
 * Test script to verify IndexedDB fix
 * This can be run in browser console to test the fix
 */

export const testIndexedDBFix = async () => {
  try {
    const { pwaStorage } = await import('./pwaUtils');
    
    console.log('Testing IndexedDB operations...');
    
    // Test 1: Initialize storage
    await pwaStorage.init();
    console.log('✅ Storage initialized');
    
    // Test 2: Save a test booking
    const testBookingId = await pwaStorage.saveOfflineBooking({
      boardroom: 'test-room',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(),
      purpose: 'Test booking',
      attendees: [],
      notes: 'Test notes'
    });
    console.log('✅ Test booking saved:', testBookingId);
    
    // Test 3: Get unsynced bookings (this was causing the error)
    const unsyncedBookings = await pwaStorage.getUnsyncedBookings();
    console.log('✅ Unsynced bookings retrieved:', unsyncedBookings.length);
    
    // Test 4: Get sync queue
    const syncQueue = await pwaStorage.getSyncQueue();
    console.log('✅ Sync queue retrieved:', syncQueue.length);
    
    // Test 5: Mark booking as synced
    if (unsyncedBookings.length > 0) {
      await pwaStorage.markBookingAsSynced(unsyncedBookings[0].id);
      console.log('✅ Booking marked as synced');
    }
    
    console.log('🎉 All IndexedDB operations successful!');
    return true;
    
  } catch (error) {
    console.error('❌ IndexedDB test failed:', error);
    return false;
  }
};

// Auto-run in development
if (import.meta.env.DEV) {
  setTimeout(() => {
    testIndexedDBFix().then(success => {
      if (success) {
        console.log('🔧 IndexedDB fix verified - PWA functionality should work correctly');
      } else {
        console.log('⚠️ IndexedDB issues detected - check error logs above');
      }
    });
  }, 2000); // Wait 2 seconds for app initialization
}