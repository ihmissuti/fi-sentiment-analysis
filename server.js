require('dotenv').config();
const express = require('express');
const app = express();
var Sentiment = require('sentiment');
var sentiment = new Sentiment();
const fs = require('fs');
var mongoose = require('mongoose');
var moment = require('moment');
mongoose.connect(process.env.MONGODB_URI);

// grab the Mixpanel factory
var Mixpanel = require('mixpanel');
 
// create an instance of the mixpanel client
var mixpanel = Mixpanel.init(process.env.MIXPANEL_TOKEN);

var now = moment().format('DD-MM-YYYY');

if (process.env.MONGODB_URI) {
    //connect to Mongo DB
    var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function() {
      // we're connected!
      console.log("connected to Mongo DB")
    });
    
    var sentimentSchema = mongoose.Schema({
      labels: [
        {
          text: String, 
          sentiment: String,
          score: Number,
          processed: Number,
          _id : false
        }
      ],
      id: String,
      sentiment: String,
      score: Number,
      processed: Number
    });
    
    var labelsSchema = mongoose.Schema({
        id: Number,
        labels: Object
    })
    
    var inputStorage = mongoose.model('sentiment', sentimentSchema);
    var labelsStorage = mongoose.model('label', labelsSchema);
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
    
    mixpanel.track('page view', {
        distinct_id: socket.id
    });
    
    socket.on('message', (text) => {
        console.log(text)
        
        if (process.env.MONGODB_URI) {

            labelsStorage.findOne({id: 1}, 'labels', function(err, doc){

                if(err){
                  console.log(err);
                } else{

                    var fiLabels = doc.labels;
                    
                     var fiLanguage = {
                        labels: fiLabels
                    };
                    
                    sentiment.registerLanguage('fi', fiLanguage);
                    
                    var result = sentiment.analyze(text, { language: 'fi' });
                    console.dir(result);
                    
                    var score = result.score
                    
                    if (text == 'Ei hyvä' || text == 'ei hyvä' || text == 'Joo ei' || text == 'joo ei') {
                        var mood = "negatiivinen";
                        var moodEn = "negative";
                        var score = -1;
                    } else if (text == 'ei huono' || text == 'Ei huono') {
                        var mood = "positiivinen";
                        var moodEn = "positive";
                        var score = 1;
                        
                    } else {
                    
                        if (result.score > 0) {
                            var mood = "positiivinen"
                            var moodEn = "positive"
                        } else if  (result.score < 0) {
                            var mood = "negatiivinen"
                            var moodEn = "negative"
                        } else {
                            var mood = "neutraali"
                            var moodEn = "neutral"
                        }
                    }
                    
                    socket.emit('mood', mood);
                    socket.emit('score', score);
                    
                    if (process.env.MONGODB_URI) {
                        var labelsArrays = {"text": text, "sentiment": moodEn, "score": result.score, "processed": 0};
                        inputStorage.findOneAndUpdate({ 'id': now }, {$push: {labels: labelsArrays}},  { upsert: true, new: true }, function(error, res) {
                            if (error) {
                              console.log(error)
                            }
                            
                            console.log("DB unknown update:")
                            console.log(res)
                    
                          })
                        
                    }
                    
                    mixpanel.track('text analysis', {
                        text: text,
                        sentiment: moodEn,
                        score: result.score,
                        distinct_id: socket.id
                    });
                    
                   
                }
            })
        
        } else {

            console.log("No mongo DB url. Use the local storage")
            
            var fiLabels = JSON.parse(fs.readFileSync('fiLabels.json', 'utf8'));
            
            var fiLanguage = {
                labels: fiLabels
           };
            
            sentiment.registerLanguage('fi', fiLanguage);
                    
            var result = sentiment.analyze(text, { language: 'fi' });
            console.dir(result);
                    
            if (result.score > 0) {
                var mood = "positiivinen"
                var moodEn = "positive"
            } else if  (result.score < 0) {
                var mood = "negatiivinen"
                var moodEn = "negative"
            } else {
                var mood = "neutraali"
                var moodEn = "neutral"
            }
                    
            socket.emit('mood', mood);
            socket.emit('score', result.score);
        }


  });
});
