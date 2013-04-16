var ejs = require('ejs');
var mongoose = require('mongoose');
var express = require('express');
var flash = require('connect-flash');
var path = require('path');
var	app = express();

// CHANGE THIS TO YOUR BUCKET NAME
var myBucket = 'my-trash-images';

//Module dependencies.
var trashModel = require('./models/images.js')
   , format = require('util').format
   , fs = require('fs');

//Amazon S3 Stuff 
var knox = require('knox');

var S3Client = knox.createClient({
      key: process.env.AWS_KEY
    , secret: process.env.AWS_SECRET
    , bucket: myBucket
});

/*********** SERVER CONFIGURATION *****************/
app.configure(function() {
    
    /*********************************************************************************
        Configure the template engine
        We will use EJS (Embedded JavaScript) https://github.com/visionmedia/ejs
        
        Using templates keeps your logic and code separate from your HTML.
        We will render the html templates as needed by passing in the necessary data.
    *********************************************************************************/
    app.set('port', process.env.PORT || 3000);
/*     app.set('view engine','ejs');  // use the EJS node module */
    app.set('views',__dirname+ '/views'); // use /views as template directory
/*
    app.set('view options',{layout:true}); // use /views/layout.html to manage your main header/footer wrapping template
    app.engine('html',require('ejs').renderFile); //use .html files in /views
*/
    app.set('view engine','html');  // use the EJS node module    
    app.set('layout','layout');
    app.engine('html', require('hogan-express'));

    /******************************************************************
        The /static folder will hold all css, js and image assets.
        These files are static meaning they will not be used by
        NodeJS directly. 
        
        In your html template you will reference these assets
        as yourdomain.heroku.com/img/cats.gif or yourdomain.heroku.com/js/script.js
    ******************************************************************/
/*     app.use(express.static(__dirname + '/static'));    */ 
        
    /**** Turn on some debugging tools ****/
    app.use(express.logger());
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
    
    
    app.use(express.cookieParser('keyboard cat'));
    app.use(express.session({ cookie: { maxAge: 60000 }}));
	app.use(flash());
	
	app.use(express.favicon());
	// app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(app.router);
	app.use(express.static(path.join(__dirname, 'public')));
    
    
    app.db = mongoose.connect(process.env.MONGOLAB_URI);
    console.log("connected to database");


});
/*********** END SERVER CONFIGURATION *****************/	

app.configure('development', function(){
  app.use(express.errorHandler());
});

var routes = require('./routes/index.js');

//view all images
app.get('/', routes.index);

//uplad image
app.get('/upload',routes.uploadForm); //display form
app.post('/upload',routes.uploadImage); //form POST submits here

app.get('/instagram', routes.getInstagram);
app.get('/oauth', routes.oauth);

//view individual image details
app.get('/:filename', routes.detail);

//delete individual file
app.get('/delete/:filename', routes.remove);



var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
    