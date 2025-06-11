const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const templateMap = {
  erp: 'erp_template.html',
  cmc: 'cmc_template.html',
  parish: 'parish_template.html',
};

exports.sendBulkEmail = async (req, res) => {
  const {
    senderEmail,
    senderAppPassword,
    recipients, // array or single email
    templateName, // 'erp' | 'cmc' | 'parish'
    htmlTemplate, // optional raw HTML template string
    placeholderName = '[Client\'s Name]', // optional override
    clientNames = [], // optional, same length as recipients
  } = req.body;

  if (!senderEmail || !senderAppPassword || !recipients) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  const emails = Array.isArray(recipients) ? recipients : [recipients];

  // Use default or override template
  let baseTemplate;
  if (htmlTemplate) {
    baseTemplate = htmlTemplate;
  } else if (templateMap[templateName]) {
    const templatePath = path.join(__dirname, '../templates', templateMap[templateName]);
    baseTemplate = fs.readFileSync(templatePath, 'utf-8');
  } else {
    return res.status(400).json({ message: 'No valid template found.' });
  }

  // Transporter
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: senderEmail,
      pass: senderAppPassword,
    },
  });

  try {
    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      const name = clientNames[i] || 'Client';
      const personalizedHtml = baseTemplate.replace(new RegExp(placeholderName, 'g'), name);

      const mailOptions = {
        // Corrected: Use template literals for the 'from' field
        from: `"Data Valley Bot" <${senderEmail}>`,
        to: email,
        subject: 'Discover Smart ERP Tools for Your Business',
        html: personalizedHtml,
      };

      await transporter.sendMail(mailOptions);
      // Corrected: Use template literals for console.log
      console.log(`✅ Email sent to ${email}`);
    }

    res.status(200).json({ message: 'Emails sent successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Email sending failed.', error: err.message });
  }
};