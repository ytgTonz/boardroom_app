// backend/test-nodemailer.js
// NOTE: Development/testing file with console.log statements
const nodemailer = require('nodemailer');

console.log('Testing nodemailer import...');
console.log('nodemailer object:', typeof nodemailer);
console.log('createTransport method:', typeof nodemailer.createTransport);

async function testNodemailer() {
  try {
    // Test creating a transporter
    const testAccount = await nodemailer.createTestAccount();
    console.log('✅ createTestAccount works');
    
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    
    console.log('✅ createTransport works');
    console.log('✅ Nodemailer is working correctly!');
    
  } catch (error) {
    console.error('❌ Nodemailer test failed:', error);
  }
}

testNodemailer();