
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
    return res.send('<h1>2013 only.</h1> <p>Sorry, this application is closed to non-students. Please apply for next candidates\' weekend!</p>');
  }
  next();
})

/**
 * Routes
 */

function getRankings (next) {
  db.stats.find(function (err, drinks) {
    var list = {};
    (drinks || []).forEach(function (drink) {
      list[drink.student] || (list[drink.student] = 0);
      list[drink.student]++;
    });
    var rank = Object.keys(list).sort(function (a, b) {
      return list[b] - list[a];
    }).map(function (a, i) {
      return {
        id: a,
        drinks: list[a],
        rank: i + 1
      };
    })
    next(err, rank);
  });
}

app.get('/', function (req, res) {
  getRankings(function (err, stats) {
    res.render('index', {
      title: 'Drinkalytics',
      stats: stats,
      totals: stats.reduce(function (last, next) {
        last.drinks += next.drinks;
        return last;
      }, {drinks: 0})
    });
  });
});

app.get('/api', function (req, res) {
  res.render('api', {
    title: 'API Reference'
  });
})

app.get('/api/drinks', function (req, res) {
  db.stats.find('student' in req.query ? {
    student: req.query.student
  } : {}, function (err, drinks) {
    res.json(drinks.map(function (d) {
      delete d._id;
      return d;
    }));
  });
});

app.post('/api/drinks', function (req, res) {
  db.stats.save({
    student: olinapps.user(req).id,
    drink: req.body.drink || 'Vodka',
    date: Date.now()
  }, function (err, u) {
    console.log('>>>', err, u);
    res.json({
      error: err,
      drink: u
    })
  });
})

app.get('/api/rankings', function (req, res) {
  getRankings(function (err, rank) {
    res.json(rank);
  });
});

app.get('/api/users', function (req, res) {
  getRankings(function (err, rank) {
    var list = {};
    rank.forEach(function (a) {
      list[a.id] = a;
    })
    res.json(list);
  });
});

/**
 * Launch
 */

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on http://" + app.get('host'));
});
