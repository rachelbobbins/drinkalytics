
/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , path = require('path')
  , olinapps = require('olinapps')
  , mongojs = require('mongojs')
  , MongoStore = require('connect-mongo')(express);

var app = express(), db;

app.configure(function () {
  db = mongojs(process.env.MONGOLAB_URI || 'drinkalytics', ['stats']);
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.set('secret', process.env.SESSION_SECRET || 'terrible, terrible secret')
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser(app.get('secret')));
  app.use(express.session({
    secret: app.get('secret'),
    store: new MongoStore({
      url: process.env.MONGOLAB_URI || 'mongodb://localhost/drinkalytics'
    })
  }));
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function () {
  app.set('host', 'localhost:3000');
  app.use(express.errorHandler());
});

app.configure('production', function () {
  app.set('host', 'drinkalytics.herokuapps.com');
});

/**
 * Authentication
 */

app.post('/login', olinapps.login);
app.all('/logout', olinapps.logout);
app.all('/*', olinapps.middleware);
app.all('/*', olinapps.loginRequired);

app.all('/*', function (req, res, next) {
  if (olinapps.user(req).domain != 'students.olin.edu') {
    return res.send('<h1>Seniors only.</h1> <p>Sorry, this application is closed to non-seniors. Please apply for next candidates\' weekend!</p>');
  }
  next();
})

/**
 * Routes
 */

app.get('/', function (req, res) {
  db.stats.find(function (err, stats) {
    console.log(err, stats);
    res.render('index', {
      title: 'Drinkalytics',
      stats: stats.sort(function (a, b) {
        return b.liquor - a.liquor;
      }),
      totals: stats.reduce(function (last, next) {
        last.liquor += next.liquor;
        return last;
      }, {liquor: 0})
    });
  });
});

app.post('/drinks/liquor', function (req, res) {
  console.log(req.body);
  var inc = parseInt(req.body.inc) || 0;
  db.stats.update({
    student: olinapps.user(req).id,
  }, {
    $inc: {
      liquor: inc
    }
  }, {
    upsert: true
  }, function (err, u) {
    console.log('>>>', err, u);
    res.redirect('/');
  });
})

/**
 * Launch
 */

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on http://" + app.get('host'));
});
