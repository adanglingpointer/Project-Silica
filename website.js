const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = process.env.PORT || 3200;

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.post('/register', (req, res) => {
    const email = req.body.email;
    const captcha = parseInt(req.body.captcha);
    const num1 = parseInt(req.body.num1);
    const num2 = parseInt(req.body.num2);

    // Validate the CAPTCHA
    if (captcha !== num1 + num2) {
        res.status(400).send('Invalid CAPTCHA.');
        return;
    }

  fs.readFile('emails.txt', 'utf8', (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // If the file does not exist, create it and save the email
        fs.writeFile('emails.txt', `${email}\n`, (err) => {
          if (err) {
            console.error(err);
            res.status(500).send('Failed to save email.');
          } else {
            res.status(200).send('Email saved.');
          }
        });
      } else {
        console.error(err);
        res.status(500).send('Failed to read emails file.');
      }
    } else {
      // Check if the email already exists in the file
      const emailList = data.split('\n');
      if (emailList.includes(email)) {
        res.status(409).send('Email already exists.');
      } else {
        // Save the email if it does not exist
        fs.appendFile('emails.txt', `${email}\n`, (err) => {
          if (err) {
            console.error(err);
            res.status(500).send('Failed to save email.');
          } else {
            res.status(200).send('Email saved.');
          }
        });
      }
    }
  });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
