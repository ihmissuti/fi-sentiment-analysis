var Sentiment = require('sentiment');
var sentiment = new Sentiment();
const fs = require('fs');

var fiLabels = JSON.parse(fs.readFileSync('fiLabels.json', 'utf8'));

var fiLanguage = {
    labels: fiLabels
};

sentiment.registerLanguage('fi', fiLanguage);

var input = 'Olen iloinen testilause.';
var result = sentiment.analyze(input, { language: 'fi' });
console.dir(result);
