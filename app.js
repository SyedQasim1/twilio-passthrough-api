const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const csv = require('csv-parser');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
require('dotenv').config();

const Twilio = require('twilio');
const client = new Twilio(process.env.ACCOUNT_SID, process.env.AUTH_TOKEN);

var app = express();
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.get('/', function (req, res) {
    res.send('server is working')
});

app.post('/twilio/sms/bulk', upload.single('myCsv'), function (req, res) {
    var csvData=[];
    const toBindingObject = [];
    fs.createReadStream(`uploads/${req.file.filename}`)
        .pipe(csv())
        .on('data', (row) => {
            csvData.push(row);
        })
        .on('end', () => {
            csvData.forEach(data => {
                toBindingObject.push(JSON.stringify({ binding_type: 'sms', address: data['35']}))
            });

            client.notify.services(process.env.NOTIFY_SERVICE_ID).notifications
                .create({
                    toBinding: toBindingObject,
                    body: req.body.textBody,
                }).then(notification => {
                console.log(notification);
                res.send(notification);
            }).catch(error => { res.status(error.status).send(error) });

        });

});

app.listen(3001, function () {
    console.log('Example app listening on port 3001!');
});
