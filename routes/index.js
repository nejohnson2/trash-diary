var trashModel = require("../models/images.js")
   , format = require('util').format
   , fs = require('fs');; //db model

// CHANGE THIS TO YOUR BUCKET NAME
var myBucket = 'my-trash-images';
var knox = require('knox');
	

var S3Client = knox.createClient({
      key: process.env.AWS_KEY
    , secret: process.env.AWS_SECRET
    , bucket: myBucket
});

exports.index = function(req, res) {
	console.log("main page requested");

	var filter = {};
	var fields = 'caption filename'
   //Get images for user
   trashModel.find(filter, fields, function(err, allImages){
   		if (err) {
   			
	   		console.error('oops');
	   		console.error(err);
   		} else {
	   		console.log(allImages);
	   		
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