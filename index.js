const express = require('express');
const { Resend } = require('resend');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();
const resend = new Resend(process.env.RESEND_API_KEY);

// Configure CORS for production
const corsOptions = {
  origin: 'https://portfolio-dev-frontend-dvr0.onrender.com' | 'http://localhost:3000',
  methods: ['GET,HEAD,PUT,PATCH,POST,DELETE'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Simple Request Logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per window
  message: { error: 'Too many requests, please try again later.' }
});

app.use('/api/', limiter);

// Unified Contact Endpoint (Production Ready for Render)
app.post('/api/contact', async (req, res) => {
  const { name, email, message, website } = req.body;

  // 1. Honeypot check (website is a hidden field for bots)
  if (website) {
    console.log('Bot detected via honeypot');
    return res.status(200).json({ message: 'Message sent successfully!' }); // Fake success for bots
  }

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${name} via Portfolio <${process.env.SENDER_EMAIL || 'onboarding@resend.dev'}>`,
      to: [process.env.OWNER_EMAIL],
      reply_to: email,
      subject: `New Portfolio Message from ${name}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #BC13FE;">New Message Received</h2>
          <p><strong>From:</strong> ${name} (<a href="mailto:${email}">${email}</a>)</p>
          <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; border-left: 5px solid #BC13FE; margin-top: 20px;">
            <p style="white-space: pre-wrap;">${message}</p>
          </div>
          <p style="font-size: 12px; color: #777; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px;">
            Sent from your Portfolio Website.
          </p>
        </div>
      `,
    });

    if (data) console.log('Resend Success:', data);
    if (error) {
      console.error('Resend Error Payload:', error);
      return res.status(400).json({ error: error.message });
    }

    res.status(200).json({ message: 'Message sent successfully!' });
  } catch (err) {
    console.error('Server Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
