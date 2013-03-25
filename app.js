
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
  db = mongojs(process.env.MONGOLAB_URI || 'olinapps-voting', ['elections']);
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

/*
app.get('/', function (req, res) {
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

app.post('/', function (req, res) {
  if (req.body.name && req.body.quote) {
    db.elections.save({
      name: req.body.name,
      quote: req.body.quote,
      submitter: olinapps.user(req).username,
      date: Date.now(),
      published: true
    }, res.redirect.bind(res, '/'));
  } else {
    res.json({error: true, message: 'Invalid quote'}, 500);
  }
})

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
