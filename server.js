require('dotenv').config();
const express = require('express');
const app = express();
var Sentiment = require('sentiment');
var sentiment = new Sentiment();
const fs = require('fs');
var mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI);

if (process.env.MONGODB_URI) {
    //connect to Mongo DB
    var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function() {
      // we're connected!
      console.log("connected to Mongo DB")
    });
}

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
      
        var fiLabels = JSON.parse(fs.readFileSync('fiLabels.json', 'utf8'));

        var fiLanguage = {
            labels: fiLabels
        };
        
        sentiment.registerLanguage('fi', fiLanguage);
        
        var result = sentiment.analyze(text, { language: 'fi' });
        console.dir(result);
        
        if (result.score > 0) {
            var mood = "positiivinen"
        } else if  (result.score < 0) {
            var mood = "negatiivinen"
        } else {
            var mood = "neutraali"
        }
        
        socket.emit('mood', mood);
        socket.emit('score', result.score);
  });
});
