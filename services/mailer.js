require('dotenv').config();

exports.sendEmail = async (args) =>{
  const response = await fetch(process.env.EMAIL_SERVICE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: args.to,
      subject: args.subject,
      html: args.html,
    }),
  });

  const data = await response.json();
  console.log(data); // { success: true, message: 'Email sent successfully.', id: '...' }
};