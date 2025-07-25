// frontend/src/components/EmailTest.tsx (Optional - for development only)
import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const EmailTest: React.FC = () => {
  const [emailData, setEmailData] = useState({
    to: '',
    subject: '',
    message: ''
  });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    try {
      const response = await axios.post('/api/test-email', emailData);
      toast.success('Test email sent successfully!');
      console.log('Email result:', response.data);
      
      // Reset form
      setEmailData({ to: '', subject: '', message: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="card max-w-md mx-auto mt-8">
      <h2 className="text-xl font-bold mb-4">📧 Email Testing</h2>
      <p className="text-sm text-gray-600 mb-4">
        Development tool to test email functionality
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">To Email:</label>
          <input
            type="email"
            value={emailData.to}
            onChange={(e) => setEmailData(prev => ({ ...prev, to: e.target.value }))}
            className="input"
            placeholder="recipient@example.com"
            required
          />
        </div>
        
        <div>
          <label className="label">Subject:</label>
          <input
            type="text"
            value={emailData.subject}
            onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
            className="input"
            placeholder="Test email subject"
            required
          />
        </div>
        
        <div>
          <label className="label">Message:</label>
          <textarea
            value={emailData.message}
            onChange={(e) => setEmailData(prev => ({ ...prev, message: e.target.value }))}
            className="input"
            rows={4}
            placeholder="Test email message..."
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={sending}
          className="btn btn-primary w-full"
        >
          {sending ? 'Sending...' : 'Send Test Email'}
        </button>
      </form>
    </div>
  );
};

export default EmailTest;