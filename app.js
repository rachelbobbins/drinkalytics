
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
  db = mongojs(process.env.MONGOLAB_URI || 'olinapps-voting', ['votes']);
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
      url: process.env.MONGOLAB_URI || 'mongodb://localhost/olinapps-voting'
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
  app.set('host', 'voting.olinapps.com');
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
    return res.send('<h1>Students only.</h1> <p>Sorry, this application is closed to non-students. Please apply for next candidates\' weekend!</p>');
  }
  next();
})

/**
 * Routes
 */

app.get('/', function (req, res) {
  db.votes.findOne({
    student: olinapps.user(req).id,
    year: 2013
  }, function (err, vote) {
    console.log(err, vote);
    res.render('index', {
      title: 'Olin Voting App',
      answers: vote ? vote.answers : {},
      user: olinapps.user(req)
    });
  })
});

app.post('/', function (req, res) {
  console.log(req.body);
  db.votes.update({
    student: olinapps.user(req).id,
    year: 2013
  }, {
    $set: {
      date: Date.now(),
      answers: req.body
    }
  }, {
    upsert: true
  }, function (err, u) {
    console.log('>>>', err, u);
    db.votes.find(function () { console.log(arguments); });
    res.redirect('/');
  });
})

/*
app.get('/:id', function (req, res) {
  db.elections.find({
    published: true
  }).sort({date: -1}, function (err, docs) {
    console.log(docs);
    res.render('index', {
      title: 'Olin Voting App',
      quotes: docs,
      user: olinapps.user(req)
    });
  })
});

app.del('/:id', function (req, res) {
  db.elections.update({
    _id: db.ObjectId(req.body.id),
    submitter: olinapps.user(req).username
  }, {
    $set: {
      published: false
    }
  }, function () {
    res.redirect('/');
  })
})

app.get('/names', function (req, res) {
  db.elections.distinct('name', function (err, names) {
    res.json(names);
  });
})
*/

/**
 * Launch
 */

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on http://" + app.get('host'));
});
