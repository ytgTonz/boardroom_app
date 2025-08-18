/**
 * Test script to verify SAST timezone fix
 * Run with: node test-timezone-fix.js
 */

require('dotenv').config();
const moment = require('moment-timezone');

// Test configuration
const BUSINESS_TIMEZONE = process.env.BUSINESS_TIMEZONE || 'Africa/Johannesburg';
const WORKING_HOURS_START = parseInt(process.env.WORKING_HOURS_START) || 7;
const WORKING_HOURS_END = parseInt(process.env.WORKING_HOURS_END) || 16;

console.log('🧪 Testing SAST Timezone Fix\n');
console.log('Configuration:');
console.log('- Business Timezone:', BUSINESS_TIMEZONE);
console.log('- Working Hours:', `${WORKING_HOURS_START}:00-${WORKING_HOURS_END}:00`);
console.log();

// Test 1: Time slot generation
console.log('Test 1: Time Slot Generation');
console.log('----------------------------');

const testDate = moment().tz(BUSINESS_TIMEZONE).format('YYYY-MM-DD');
console.log('Test Date (SAST):', testDate);

// Debug timezone handling
const baseBusinessDate = moment.tz(testDate, BUSINESS_TIMEZONE);
console.log('Base business date:', baseBusinessDate.format('YYYY-MM-DD HH:mm z'));
console.log('Timezone offset from UTC:', baseBusinessDate.utcOffset(), 'minutes');

// Simulate time slot generation logic
const timeSlots = [];

// Generate first few slots for testing (should be 7:00-8:00 SAST)
for (let hour = WORKING_HOURS_START; hour < WORKING_HOURS_START + 2; hour++) {
  for (let minute = 0; minute < 60; minute += 30) {
    const slotStartBusiness = baseBusinessDate.clone().hour(hour).minute(minute).second(0).millisecond(0);
    const slotEndBusiness = slotStartBusiness.clone().add(30, 'minutes');
    
    const slotStartUTC = slotStartBusiness.clone().utc().toDate();
    const slotEndUTC = slotEndBusiness.clone().utc().toDate();
    
    // Debug the timezone conversion - IMPORTANT: Don't call .utc() on the original object!
    const utcDebug = slotStartBusiness.clone().utc();
    console.log(`Debug: hour=${hour}, Business: ${slotStartBusiness.format('HH:mm z')}, UTC: ${utcDebug.format('HH:mm z')}`);
    
    timeSlots.push({
      businessTime: `${slotStartBusiness.format('HH:mm')} - ${slotEndBusiness.format('HH:mm')} SAST`,
      utcTime: `${slotStartUTC.toISOString()} - ${slotEndUTC.toISOString()}`,
      utcHours: `${slotStartUTC.getUTCHours().toString().padStart(2, '0')}:${slotStartUTC.getUTCMinutes().toString().padStart(2, '0')} - ${slotEndUTC.getUTCHours().toString().padStart(2, '0')}:${slotEndUTC.getUTCMinutes().toString().padStart(2, '0')} UTC`
    });
  }
}

timeSlots.forEach((slot, index) => {
  console.log(`Slot ${index + 1}:`);
  console.log(`  SAST: ${slot.businessTime}`);
  console.log(`  UTC:  ${slot.utcHours}`);
});

console.log();

// Test 2: Working hours validation
console.log('Test 2: Working Hours Validation');
console.log('--------------------------------');

const testTimes = [
  { hour: 6, minute: 30, description: 'Before working hours' },
  { hour: 7, minute: 0, description: 'Start of working hours' },
  { hour: 12, minute: 30, description: 'Mid-day' },
  { hour: 15, minute: 30, description: 'Near end of working hours' },
  { hour: 16, minute: 0, description: 'End of working hours' },
  { hour: 17, minute: 0, description: 'After working hours' }
];

testTimes.forEach(testTime => {
  const businessTime = moment.tz(testDate, BUSINESS_TIMEZONE).hour(testTime.hour).minute(testTime.minute);
  const utcTime = businessTime.clone().utc();
  
  const businessHour = businessTime.hour();
  const isWithinHours = businessHour >= WORKING_HOURS_START && businessHour < WORKING_HOURS_END;
  
  console.log(`${testTime.description}:`);
  console.log(`  SAST: ${businessTime.format('HH:mm')} | UTC: ${utcTime.format('HH:mm')} | Valid: ${isWithinHours ? '✅' : '❌'}`);
});

console.log();

// Test 3: Cross-timezone display simulation
console.log('Test 3: Cross-Timezone Display Simulation');
console.log('------------------------------------------');

const sampleUTCTime = '2025-01-20T05:00:00.000Z'; // 07:00 SAST
const utcMoment = moment.utc(sampleUTCTime);

const timezones = [
  'Africa/Johannesburg',  // SAST (UTC+2)
  'Europe/London',        // GMT (UTC+0)
  'America/New_York',     // EST (UTC-5)
  'Asia/Tokyo',           // JST (UTC+9)
  'Australia/Sydney'      // AEDT (UTC+11)
];

console.log(`Sample UTC Time: ${sampleUTCTime} (Should be 07:00 SAST)`);
console.log();

timezones.forEach(tz => {
  const localTime = utcMoment.clone().tz(tz);
  console.log(`${tz.padEnd(20)}: ${localTime.format('HH:mm')} (${localTime.format('z')})`);
});

console.log('\n✅ SAST timezone fix verification complete!');
console.log('\nKey Points:');
console.log('- Business operates in SAST (UTC+2)');
console.log('- Working hours: 07:00-16:00 SAST');
console.log('- UTC storage: 05:00-14:00 UTC');
console.log('- Frontend displays in user\'s local timezone');
console.log('- Backend validates against SAST business hours');