var Twitter = require('twit');
var redis = require('redis');
var twit = new Twitter({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token: process.env.ACCESS_TOKEN,
    access_token_secret: process.env.ACCESS_TOKEN_SECRET
});

var express = require('express');
var app = express();

app.get('/', function(req, res){
  res.send('Express is currently running smooooooothly.');
});

var port = process.env.PORT || 3000;
app.listen(port);
console.log("Express is running on port " + port);


var url = require('url');
var redisURL = url.parse(process.env.REDISCLOUD_URL || 'redis://127.0.0.1:6379');
var client = redis.createClient(redisURL.port, redisURL.hostname, {no_ready_check: true});
if (process.env.REDISCLOUD_URL) {
    client.auth(redisURL.auth.split(":")[1]);
}

var REDIS_KEY = 'screenNameCooldown';
var REDIS_KEY2 = 'screenNameCooldown2';

var tweetStream = twit.stream('statuses/filter', { track: '@ShoutGamers' });
tweetStream.on('tweet', function(tweet) {
  console.log('Possible mention: ' + tweet.user.screen_name);
  var tweep = tweet.user.screen_name;
  var rtCheck = tweet.text.indexOf('RT');
  if ((tweep == 'Captainslays' || tweep == 'F_for_FeLoN' || tweep == 'ebookeroo' || tweep == 'ReaIDirty') && (rtCheck > 0 || rtCheck == -1)) {
    console.log(' - whitelisted user, retweeting now');
    retweetById(tweet.id_str, tweep);
  }
});

//find a tweet to retweet
function findTweet(){
  console.log('retweeting something');
  twit.get('search/tweets', {q: '@ShoutGamers', count: 15, result_type: 'recent'}, function(err, reply){
    if (err){
      console.log(err);
    }
    retweet(reply.statuses[0]);
  });
}

//accepts a tweet json object
var retweet = function(tweet){
  var tweep = tweet.user.screen_name;
  var rtCheck = tweet.text.indexOf('RT');
  console.log(tweet.text);
   if (rtCheck > 0 || rtCheck == -1) {
      twit.get('friendships/show', {source_screen_name: process.env.USERNAME, target_screen_name: tweet.user.screen_name}, function(err, reply) {
        console.log(' - looking up user: ' + tweet.user.screen_name);
        if (err) {
          console.log(err);
        }
        derpCheckFriendship(tweet, reply, tweep);
      });
    }
    else {
      console.log(' - tweet was a retweet');
      findTweet();
    }
};


var derpCheckFriendship = function(tweet, reply, tweep){
	if (tweet.in_reply_to_user_id == null) {
    if (reply.relationship.target.following == true){
      var spamSelling = tweet.text.toLowerCase().indexOf('selling');
      if (spamSelling == -1) {
        retweetById(tweet.id_str, tweet.user.screen_name);
      }
      else {
        console.log(' - selling checkup');
        var spamFortnite = tweet.text.toLowerCase().indexOf('fortnite');
        if (spamFortnite == -1) {
          retweetById(tweet.id_str, tweet.user.screen_name);
        }
        else {
          console.log(' - fortnite/method selling NOPE');
          findTweet();
        }
      }
    }
    else if(reply.relationship.target.following == false)
      {console.log(' - nope. user does not follow');}
      findTweet();
	  }
	else {
	  console.log(' - tweet was a reply');
	  findTweet();
	}
};

var retweetById = function(idStr, screenName) {
      client.sadd(REDIS_KEY, screenName, function(err, reply) {
        if (err) {
            console.log(err);
        } else if (reply == 1 || screenName == process.env.TWITTER_DEBUG_USER) {
            console.log(' - This is a new user OR it is the debug user');
                      
                      twit.post('statuses/retweet/:id', {id: idStr}, function(err, reply) {
                      console.log("1 retweeted id:" + idStr);
                      err;
                      });
                      
        }
        else {
          console.log(' - not retweeted');
        }
      });
};

setInterval(function() {
    client.del(REDIS_KEY);
    console.log("database 1 cleared");
}, (60 * 1000 * process.env.COOLDOWN1));

setInterval(function() {
    client.del(REDIS_KEY2);
    console.log("database 2 cleared");
}, (60 * 1000 * process.env.COOLDOWN2));

var http = require("http");
setInterval(function() {
    http.get("http://shoutg.herokuapp.com");
}, 600000);

findTweet();
setInterval(function(){findTweet()}, 300000);