require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const redis = require('redis');
const {   v1: uuidv1,  v4: uuidv4,} = require('uuid');


const redisChannel =process.env.redisCH;
const redisIP =process.env.redisIP;
const subscriber = redis.createClient({url: 'redis://192.168.3.88:6379'});
const publisher = redis.createClient({url: redisIP});

const app = express();
app.use(bodyParser.json());

// Middleware function to log incoming JSON requests
app.use(async(req, res, next) => {

    const data = JSON.stringify(req.body, null, 2);
    //file write section
    if (req.is('json')) {
        const endpoint = req.path.replace(/\//g, '');
        const date = new Date();
        const dirPath = path.join(__dirname, 'logs', `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        const filename = `${endpoint}-${uuidv1()}-${date.getHours()+1}_${date.getMinutes()}_${date.getSeconds()}.json`;
        const filepath = path.join(dirPath, filename);

        fs.promises.open(filepath, 'wx')
            .then((fd) => {

                console.log(endpoint);
                return fd.writeFile(data)
                    .then(() => fd.close())
                    .catch((err) => {
                        fd.close();
                        throw err;
                    });
            })
            .then(() => console.log('File written successfully') )
            .catch((err) => console.error(err));
    }

    //redis publish
    if(req.is('json')){
        publisher.connect();
        publisher.publish(redisChannel, JSON.stringify(req.body, null, 2), (err) => {
            if (err) {
                console.error('Error:', err);
                next(err);
            } else {
                console.log('USRacing published');
                next();
            }
        }).then(() => publisher.quit() );
    }

    next();
});


// Endpoint for receiving full meeting information
app.post('/meetings', (req, res) => {
    res.sendStatus(200); // Return HTTP 200 OK status
});


// Start the server
const port = process.env.PORT;
app.listen(port, async(req, res) => {console.log(`Server listening on port ${port}...`);});

