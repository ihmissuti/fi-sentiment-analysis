require('dotenv').config();
const express = require('express');
const app = express();
var Sentiment = require('sentiment');
var sentiment = new Sentiment();
const fs = require('fs');

app.use(express.static(__dirname + '/public'));

const server = app.listen(process.env.PORT || 8080, () => {
    console.log('Express server listening on port %d', server.address().port);
});

const io = require('socket.io')(server);
io.on('connection', function(socket){
    console.log('a user connected');
});

app.get('/', (req, res) => {
    res.sendFile('index.html');
});

io.on('connection', function(socket) {

    socket.on('message', (text) => {
        console.log(text)

            
            // var fiLabels = JSON.parse(fs.readFileSync('fiLabels.json', 'utf8'));
            var fiLabels = require('./fiLabels');
            var fiLanguage = {
                labels: fiLabels
           };
            
            sentiment.registerLanguage('fi', fiLanguage);
                    
            var result = sentiment.analyze(text, { language: 'fi' });
                    
            if (result.score > 0) {
                var mood = "positive"
                var moodEn = "positive"
            } else if  (result.score < 0) {
                var mood = "negative"
                var moodEn = "negative"
            } else {
                var mood = "neutral"
                var moodEn = "neutral"
            }
            
            console.log(result)
            socket.emit('tokens', result.tokens);     
            socket.emit('mood', mood);
            socket.emit('score', result.score);
            socket.emit('positive', result.score);
            socket.emit('negative', result.score);

  });
});
