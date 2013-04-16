var trashModel = require("../models/images.js")
   , format = require('util').format
   , fs = require('fs');; //db model
var moment = require("moment");
// CHANGE THIS TO YOUR BUCKET NAME
var myBucket = 'my-trash-images';
var knox = require('knox');
	

var S3Client = knox.createClient({
      key: process.env.AWS_KEY
    , secret: process.env.AWS_SECRET
    , bucket: myBucket
});

Instagram = require('instagram-node-lib');

Instagram.set('client_id', 'aee1ef05f261441db8c6b92c3d74a1e2');
Instagram.set('client_secret', '86f15bb5ca394bd28684dd0ea2905e87');
Instagram.set('redirect_uri', 'http://trash-diary.herokuapp.com');



exports.index = function(req, res) {
	console.log("main page requested");

	var filter = {};
	var fields = 'caption filename timestamp'
   //Get images for user
   trashModel.find(filter, fields, function(err, allImages){
   		if (err) {
   			
	   		console.error('oops');
	   		console.error(err);
   		} else {
	   		console.log(allImages);
	   		
/* 	   		console.log(allImages.timestamp); */
	   		
       var templateData = {
           s3bucket : S3Client.bucket, // the name of your Bucket
           images : allImages,
           message : req.flash('message')[0] 
       }


       res.render('images.html', templateData);
       }
   });
}
/*
	GET /create
*/
exports.uploadForm = function(req, res){

	var templateData = {
		page_title : 'Upload more trash!'
	};

	res.render('upload_form.html', templateData);
}
exports.uploadImage = function(request, response) {
        
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
            , 'x-amz-acl': 'public-read'
            });
            
            // 3c) prepare 'response' callback from S3
            req.on('response', function(res){
                if (200 == res.statusCode) {
                console.log('saved to %s', req.url);

                    // create new Image
                    var newImage = new trashModel({
                          caption : caption
                        , filename : filename                       
                    });
                    newImage.save( function(err) {
                        if (err) { 
                            response.send("uhoh, could not save image filename to database.");
                        }
                        console.log('im here ');
                        request.flash('message','Image uploaded successfully');
                        response.redirect('/');
                        
                    })
 
                    
                } else {
                    
                    response.send("an error occurred. unable to upload file to S3.");
                    
                }
            });
            
            // 3d) finally send the content of the file and end
            req.end(buf);
        });
}	

//Single Image info
exports.detail = function(req, res) {

	console.log("detail page requested for " + req.params.filename);

	//get the requested astronaut by the param on the url :astro_id
	var filename = req.params.filename;

	// query the database for astronaut
	trashModel.findOne({filename:filename}, function(err, currentImage){

		if (err) {
			return res.status(500).send("There was an error on the astronaut query");
		}

		if (currentImage == null) {
			return res.status(404).render('404.html');
		}

		console.log("Found image");
		console.log(currentImage.filename);
		console.log(currentImage);

		//prepare template data for view
		var templateData = {
		   s3bucket : S3Client.bucket, // the name of your Bucket
		   images : currentImage,
		   message : req.flash('message')[0] 
		}

		// render and return the template
		res.render('detail.html', templateData);


	}); // end of .findOne query

}          
exports.remove = function(req, res) {
	
	console.log("delete request")
	
	var filename = req.params.filename;
	
	trashModel.remove({ filename:filename }, function (err) {
		console.log("deleting file")
		res.redirect('/');
	});
	
}
exports.getInstagram = function(req, res) {
	
	console.log("called /instagram");
	
	url = Instagram.oauth.authorization_url({
	  scope: 'comments likes', // use a space when specifying a scope; it will be encoded into a plus
	  display: 'touch'
	});	


	Instagram.users.search({ 
/* 		user_id: 321281563, */
		q: 'nyc_trash',
		complete: function(data){
			
			Instagram.media.info({ username: 'nyc_trash' });	 	
			console.log(data);



		res.send(data);

		},
		error: function(errorMessage, errorObject, caller){
			console.log("error message: " + errorMessage);
			console.log("error object: " + errorObject);
			console.log("caller: " + caller);			
		}		 
		
	});
/*
	Instagram.media.info({ 
		user_id: 321281563,
		media_id: 3,
		complete: function(data){
			console.log(data);
			res.send(data);	
		},
		error: function(errorMessage, errorObject, caller){
			console.log(errorMessage);
		}
		
	 });
*/
	Instagram.users.self();
	
	
}
exports.oauth = function(req, res){
	console.log('whats up yo');

	Instagram.oauth.ask_for_access_token({
    request: request,
    response: response,
    redirect: 'http://trash-diary.herokuapp.com',

    complete: function(params, response){
      // params['access_token']
      // params['user']
      response.writeHead(200, {'Content-Type': 'text/plain'});
      // or some other response ended with
      response.end();
    },
    error: function(errorMessage, errorObject, caller, response){
      // errorMessage is the raised error message
      // errorObject is either the object that caused the issue, or the nearest neighbor
      // caller is the method in which the error occurred
      response.writeHead(406, {'Content-Type': 'text/plain'});
      // or some other response ended with
      response.end();
    }
  });
	
}