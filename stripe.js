const express = require('express');
const app = express();
const stripe = require('stripe')('your-stripe-license')
// Import the crypto module
const crypto = require('crypto');

// Define the function
function generateUUID() {
  // Generate 16 random bytes
  const bytes = crypto.randomBytes(16);

  // Set the version bits to 0100
  bytes[6] = (bytes[6] & 0x0f) | 0x40;

  // Set the variant bits to 10
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  // Convert the bytes to hexadecimal strings
  const hex = bytes.toString('hex');

  // Insert hyphens to form the uuid
  const uuid = `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;

  // Return the uuid
  return uuid;
}

app.use(express.static('public'));

app.get('/', (req, res) => {
//  res.sendFile(__dirname + '/public/index.html');
  res.redirect('https://projectsilica.com');
});

app.get('/cancel', (req, res) => {
  res.sendFile('cancel.html');
});

app.get('/success', (req, res) => {
//  res.sendFile(__dirname + '/public/success.html');
  res.send(generateUUID());
});

/*
https://stripe.com/docs/payments/accept-a-payment
*/

app.post('/purchase-license', async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Project Silica',
          },
          unit_amount: 2000,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: 'http://localhost:4242/success',
    cancel_url: 'http://localhost:4242/cancel',
  });

  res.redirect(303, session.url);
});

app.listen(4242, () => console.log(`Listening on port ${4242}!`));