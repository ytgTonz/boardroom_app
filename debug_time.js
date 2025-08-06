// Debug script to understand the time issue

console.log("=== DEBUGGING TIME HANDLING ===\n");

// Simulate the current frontend behavior
const selectedDate = "2025-08-07"; // Tomorrow
const timeInput = "10:00"; // User inputs 10:00 AM

// Current frontend logic (from BookingForm.tsx lines 517-518)
const dateTime = `${selectedDate}T${timeInput}:00`;
console.log("1. Constructed datetime string:", dateTime);

const startTimeISO = new Date(dateTime).toISOString();
console.log("2. Converted to ISO (frontend sends):", startTimeISO);

// Backend receives this and creates new Date (from bookingController.js line 104)
const startTimeUTC = new Date(startTimeISO);
console.log("3. Backend creates Date from ISO:", startTimeUTC.toISOString());

// Let's see what the user actually expects
const userExpectedTime = new Date(`${selectedDate}T${timeInput}:00`);
console.log("4. User expected local time:", userExpectedTime.toString());

console.log("\n=== COMPARISON ===");
console.log("User wants:", userExpectedTime.getHours() + ":" + userExpectedTime.getMinutes().toString().padStart(2, '0'));
console.log("Backend stores:", startTimeUTC.getHours() + ":" + startTimeUTC.getMinutes().toString().padStart(2, '0'), "(UTC)");

// Simulate the timezone problem
const now = new Date();
console.log("\n=== CURRENT TIME COMPARISON ===");
console.log("Current time:", now.toString());
console.log("Current time ISO:", now.toISOString());

// What happens if startTime accidentally gets set to creation time?
const creationTime = new Date();
console.log("If startTime was set to creation time:", creationTime.toISOString());