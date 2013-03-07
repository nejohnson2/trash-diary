var ejs = require('ejs');

var express = require('express'),
	app = express();
	

// CHANGE THIS TO YOUR BUCKET NAME
var myBucket = 'my-trash-images';


//Module dependencies.

var db = require('./models/images.js')
   , format = require('util').format
   , fs = require('fs');

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
    app.set('view engine','ejs');  // use the EJS node module
    app.set('views',__dirname+ '/views'); // use /views as template directory
    app.set('view options',{layout:true}); // use /views/layout.html to manage your main header/footer wrapping template
    app.engine('html',require('ejs').renderFile); //use .html files in /views

    /******************************************************************
        The /static folder will hold all css, js and image assets.
        These files are static meaning they will not be used by
        NodeJS directly. 
        
        In your html template you will reference these assets
        as yourdomain.heroku.com/img/cats.gif or yourdomain.heroku.com/js/script.js
    ******************************************************************/
    app.use(express.static(__dirname + '/static'));
    //parse any http form post
    app.use(express.bodyParser());
    
    /**** Turn on some debugging tools ****/
    app.use(express.logger());
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
    
    
    /* app.db = mongoose.connect(process.env.MONGOLAB_URI); */

});
/*********** END SERVER CONFIGURATION *****************/	

app.get('/', function(request,response){

	
	response.send('<form method="post" action="/upload" enctype="multipart/form-data">' +
        '<p>Caption: <input type="text" name="caption" /></p>' +
        '<p>Image: <input type="file" name="image" /></p>' +
        '<p><input type="submit" value="Upload" /></p>' +
    '</form>');
});

app.get('/upload', function(request,response) {
	
	reponse.render('/upload');
});


app.post('/upload', function(request, response) {
        
        // 1) Get file information from submitted form
        filename = request.files.image.filename; // actual filename of file
        path = request.files.image.path; //will be put into a temp directory
        type = request.files.image.type; // image/jpeg or actual mime type
        
        caption = request.body.caption;

        
        // 3a) We first need to open and read the file
        fs.readFile(path, function(err, buf){

            // 3b) prepare PUT to Amazon S3
            var req = S3Client.put(filename, {
              'Content-Length': buf.length
            , 'Content-Type': type
            });
            
            // 3c) prepare 'response' callback from S3
            req.on('response', function(res){
                if (200 == res.statusCode) {

                    // create new Image
                    var newImage = new db.Images({
                          caption : caption
                        , filename : filename                       
                    });
                    newImage.save( function(err) {
                        if (err) { 
                            response.send("uhoh, could not save image filename to database.");
                        }
                        
                        request.flash('message','Image uploaded successfully');
                        response.redirect('/account');
                        
                    })
 
                    
                } else {
                    
                    response.send("an error occurred. unable to upload file to S3.");
                    
                }
            });
            
            // 3d) finally send the content of the file and end
            req.end(buf);
        });    

            
});

var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
    