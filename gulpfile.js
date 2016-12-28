var gulp = require('gulp'),
	ts = require("gulp-typescript"),
	es = require('event-stream'),
	cordovaBuild = require("taco-team-build");
var gutil = require('gulp-util');
var bower = require('bower');
var concat = require('gulp-concat');
var sass = require('gulp-sass');
var minifyCss = require('gulp-minify-css');
var rename = require('gulp-rename');
var sh = require('shelljs');
var inquirer = require("inquirer");
var change = require('gulp-change');
var q = require('q');
var fs = require('fs');
var CodeGen = require('swagger-js-codegen').CodeGen;
var glob = require('glob');
var zip = require('gulp-zip');
var unzip = require('gulp-unzip');
var request = require('request');
var open = require('gulp-open');
var gcallback = require('gulp-callback');
var runSequence = require('run-sequence');
var plist = require('plist');
var xml2js = require('xml2js');
var parseString = require('xml2js').parseString;
var clean = require('gulp-rimraf');
var replace = require('gulp-string-replace');

var appIds = {
    'moodimodo': 'homaagppbekhjkalcndpojiagijaiefm',
    'mindfirst': 'jeadacoeabffebaeikfdpjgpjbjinobl',
    'energymodo': 'aibgaobhplpnjmcnnmdamabfjnbgflob'
};

var paths = {
	sass: ['./scss/**/*.scss']
};

if(!process.env.OLD_IONIC_IOS_APP_VERSION_NUMBER){
    process.env.OLD_IONIC_IOS_APP_VERSION_NUMBER = '2.2.7.0';
    console.log('Falling back to OLD_IONIC_IOS_APP_VERSION_NUMBER ' + process.env.OLD_IONIC_IOS_APP_VERSION_NUMBER);
    process.env.OLD_IONIC_APP_VERSION_NUMBER = process.env.OLD_IONIC_IOS_APP_VERSION_NUMBER.substring(0, 5);
}

if(!process.env.IONIC_IOS_APP_VERSION_NUMBER){
    process.env.IONIC_IOS_APP_VERSION_NUMBER = '2.2.8.0';
    process.env.IONIC_APP_VERSION_NUMBER = process.env.IONIC_IOS_APP_VERSION_NUMBER.substring(0, 5);
    console.log("Falling back to IONIC_IOS_APP_VERSION_NUMBER " + process.env.IONIC_IOS_APP_VERSION_NUMBER);
}

if(!process.env.LOWERCASE_APP_NAME){
    console.warn('No LOWERCASE_APP_NAME set.  Falling back to default QuantiModo configuration variables');
    process.env.LOWERCASE_APP_NAME = 'quantimodo';
}

var exec = require('child_process').exec;
function execute(command, callback){
    var my_child_process = exec(command, function(error, stdout, stderr){
        if (error !== null) {
            console.error('ERROR: exec ' + error);
        }
        callback(error, stdout);
    });

    my_child_process.stdout.pipe(process.stdout);
    my_child_process.stderr.pipe(process.stderr);
}

function generatePrivateConfigFromEnvs(callback) {

    if(!process.env.QUANTIMODO_CLIENT_ID){
        console.warn('Not going to generatePrivateConfigFromEnvs because QUANTIMODO_CLIENT_ID env is not set');
        if(callback){
            callback();
        }
        return;
    }

    if(!process.env.QUANTIMODO_CLIENT_SECRET){
        console.error('ERROR: Please set QUANTIMODO_CLIENT_SECRET environmental variable!');
        if(callback){
            callback();
        }
        return;
    }

    var privateConfigKeys = {
        client_ids : {},
        client_secrets : {}
    };

    privateConfigKeys.client_ids.Web = process.env.QUANTIMODO_CLIENT_ID;
    console.log('Detected ' + process.env.QUANTIMODO_CLIENT_ID + ' QUANTIMODO_CLIENT_ID');
    privateConfigKeys.client_secrets.Web = process.env.QUANTIMODO_CLIENT_SECRET;

    if(typeof process.env.IONIC_BUGSNAG_KEY !== "undefined"){
        privateConfigKeys.bugsnag_key = process.env.IONIC_BUGSNAG_KEY;
        console.log('IONIC_BUGSNAG_KEY' +' Detected');
    }

    var privateConfigContent = 'private_keys = '+ JSON.stringify(privateConfigKeys, 0, 2);
    fs.writeFileSync("./www/private_configs/default.config.js", privateConfigContent);
    fs.writeFileSync("./www/private_configs/" + process.env.LOWERCASE_APP_NAME + ".config.js", privateConfigContent);
    console.log('Created '+ './www/private_configs/default.config.js');
    if(callback){
        callback();
    }
}


var decryptFile = function (fileToDecryptPath, decryptedFilePath, callback) {
    console.log("Make sure openssl works on your command line and the bin folder is in your PATH env: " +
        "https://code.google.com/archive/p/openssl-for-windows/downloads");

    if(!process.env.ENCRYPTION_SECRET){
        console.error('ERROR: Please set ENCRYPTION_SECRET environmental variable!');
        if(callback){
            callback();
        }
        return;
    }

    console.log("DECRYPTING " + fileToDecryptPath);
    var cmd = 'openssl aes-256-cbc -k "' + process.env.ENCRYPTION_SECRET + '" -in "' + fileToDecryptPath +
        '" -d -a -out "' + decryptedFilePath + '"';

    //console.log('executing ' + cmd);
    execute(cmd, function(error){
        if(error !== null){
            console.error("ERROR: DECRYPTING: " + error);
            if(callback){
                callback();
            }
        } else {
            console.log("DECRYPTED to " + decryptedFilePath);
            if(callback){
                callback();
            }
        }
    });
};

function decryptPrivateConfig(callback) {
	if(process.env.QUANTIMODO_CLIENT_SECRET){
		console.log("Not decrypting private config because we should generate it from envs instead");
        generatePrivateConfigFromEnvs(callback);
        return;
	}
    var fileToDecryptPath = './scripts/private_configs/' + process.env.LOWERCASE_APP_NAME + '.config.js.enc';
    var decryptedFilePath = './www/private_configs/' + process.env.LOWERCASE_APP_NAME + '.config.js';
    decryptFile(fileToDecryptPath, decryptedFilePath, callback);
}

function loadConfigs(callback) {
    var pathToConfig = './www/configs/'+ process.env.LOWERCASE_APP_NAME + '.js';
    var pathToPrivateConfig = './www/private_configs/'+ process.env.LOWERCASE_APP_NAME + '.config.js';
    fs.stat(pathToConfig, function(err, stat) {
        if(err === null) {
            console.log("Using this config file: " + pathToConfig);
/*            fs.readFile(pathToConfig, function (err, data) {
                config = JSON.parse(data);
                fs.readFile(pathToPrivateConfig, function (err, data) {
                    privateConfig = JSON.parse(data);
                    if(callback){
                        callback();
					}
                });
            });*/

			var appSettings = require(pathToConfig);
            process.env.APPLE_ID = appSettings.appleId;
            process.env.APP_DISPLAY_NAME = appSettings.appDisplayName;
            process.env.APP_IDENTIFIER = appSettings.appIdentifier;
            process.env.APP_DESCRIPTION = appSettings.appDescription;
            process.env.IONIC_APP_ID = appSettings.ionicAppId;

            //process.env.privateConfig = require(pathToPrivateConfig);

            if(callback){
                callback();
            }
        } else {
            throw("ERROR: " + pathToConfig + ' not found! Please create it or use a different LOWERCASE_APP_NAME env. Error Code: ' + err.code);
        }
    });
}

//loadConfigs();

gulp.task('default', ['sass']);

gulp.task('unzipChromeExtension', function() {
    var minimatch = require('minimatch');
    gulp.src('./build/' + process.env.LOWERCASE_APP_NAME + '-Chrome-Extension.zip')
        .pipe(unzip())
        .pipe(gulp.dest('./build/' + process.env.LOWERCASE_APP_NAME + '-Chrome-Extension'));
});


gulp.task('sass', function(done) {
	gulp.src('./scss/ionic.app.scss')
		.pipe(sass({
			errLogToConsole: true
		}))
		.pipe(gulp.dest('./www/css/'))
		.pipe(minifyCss({
			keepSpecialComments: 0
		}))
		.pipe(rename({ extname: '.min.css' }))
		.pipe(gulp.dest('./www/css/'))
		.on('end', done);
});

gulp.task('watch', function() {
	gulp.watch(paths.sass, ['sass']);
});

gulp.task('install', ['git-check'], function() {
	return bower.commands.install()
		.on('log', function(data) {
			gutil.log('bower', gutil.colors.cyan(data.id), data.message);
		});
});

gulp.task('deleteNodeModules', function(){
	console.log('If file is locked in Windows, open Resource Monitor as Administrator.  Then go to CPU -> Associated ' +
		'Handles and search for the locked file.  Then right click to kill all the processes using it.  Then try this ' +
		'task again.');
	return gulp.src("node_modules/*", { read: false }).pipe(clean());
});

gulp.task('swagger', function(){
	var deferred = q.defer();
	var file = '../../api/docs/swagger.json';
	var swagger = JSON.parse(fs.readFileSync(file, 'UTF-8'));

	var angularjsSourceCode = CodeGen.getAngularCode({ className: 'Test', swagger: swagger });
	console.log(angularjsSourceCode);

	fs.writeFile('./www/js/services/swaggerjs.js', angularjsSourceCode , function (err) {
			if (err) {
                return console.log(err);
            }
        console.log('Swagger code > /www/js/services/swaggerjs.js');
			deferred.resolve();
	});
	return deferred.promise;
});



gulp.task('generatePrivateConfigFromEnvs', function(callback){
	generatePrivateConfigFromEnvs(callback);
});

var answer = '';
gulp.task('getAppName', function(){
	var deferred = q.defer();

	inquirer.prompt([{
		type: 'input',
		name: 'app',
		message: 'Please enter the app name (moodimodo/energymodo/etc..)'
	}], function( answers ) {
		answer = answers.app;
		answer = answer.trim();
		deferred.resolve();
	});

	return deferred.promise;
});

var updatedVersion = '';
gulp.task('getUpdatedVersion', ['getAppName'], function(){
	var deferred = q.defer();
	inquirer.prompt([{
		type : 'confirm',
		name : 'updatedVersion',
		'default' : false,
		message : 'Have you updated the app\'s version number in chromeApps/'+answer+'/manifest.json ?'
	}], function(answers){
		if (answers.updatedVersion){
			updatedVersion = answers.updatedVersion;
			deferred.resolve();
		} else {
			console.log("PLEASE UPDATE IT BEFORE UPLOADING");
			deferred.reject();
		}
	});
	return deferred.promise;
});

gulp.task('copyWwwFolderToChromeApp', ['getUpdatedVersion'], function(){
	return gulp.src(['www/**/*'])
	.pipe(gulp.dest('chromeApps/'+answer+'/www'));
});

gulp.task('zipChromeApp', ['copyWwwFolderToChromeApp'], function(){
	return gulp.src(['chromeApps/'+answer+'/**/*'])
	.pipe(zip(answer+'.zip'))
	.pipe(gulp.dest('chromeApps/zips'));
});

gulp.task('openChromeAuthorizationPage', ['zipChromeApp'], function(){
	 var deferred = q.defer();

	 gulp.src(__filename)
	.pipe(open({uri: 'https://accounts.google.com/o/oauth2/auth?response_type=code&scope=https://www.googleapis.com/auth/chromewebstore&client_id=1052648855194-h7mj5q7mmc31k0g3b9rj65ctk0uejo9p.apps.googleusercontent.com&redirect_uri=urn:ietf:wg:oauth:2.0:oob'}));


	deferred.resolve();

});

var code = '';
gulp.task('getChromeAuthorizationCode', ['openChromeAuthorizationPage'], function(){
	var deferred = q.defer();
	setTimeout(function(){
		console.log("Starting getChromeAuthorizationCode");
		inquirer.prompt([{
			type : 'input',
			name : 'code',
			message : 'Please Enter the Code Generated from the opened website'
		}], function(answers){
			code = answers.code;
			code = code.trim();
			console.log("code: ", code);
			deferred.resolve();
		});
	}, 2000);

	return deferred.promise;
});

var access_token = '';
gulp.task('getAccessTokenFromGoogle', ['getChromeAuthorizationCode'], function(){
	var deferred = q.defer();

	var options = {
		method : "POST",
		url : "https://accounts.google.com/o/oauth2/token",
		form : {
			client_id : '1052648855194-h7mj5q7mmc31k0g3b9rj65ctk0uejo9p.apps.googleusercontent.com',
			client_secret : 'gXbySqbFgRcg_RM9bIiXUmIS',
			code : code,
			grant_type : 'authorization_code',
			redirect_uri : 'urn:ietf:wg:oauth:2.0:oob'
		}
	};

	request(options, function(error, message, response){
		if(error){
			console.error('ERROR: Failed to generate the access code', error);
			defer.reject();
		} else {
			response = JSON.parse(response);
			access_token = response.access_token;
			deferred.resolve();
		}
	});

	return deferred.promise;
});

var getAppIds = function(){
	return appIds;
};

gulp.task('uploadChromeApp', ['getAccessTokenFromGoogle'], function(){
	var deferred = q.defer();
	var appIds = getAppIds();

	var source = fs.createReadStream('./chromeApps/zips/'+answer+'.zip');

	// upload the package
	var options = {
		url : "https://www.googleapis.com/upload/chromewebstore/v1.1/items/"+appIds[answer],
		method : "PUT",
		headers : {
			'Authorization': 'Bearer '+ access_token,
			'x-goog-api-version' : '2'
		}
	};

	console.log('Generated URL for upload operation: ', options.url);
	console.log('The Access Token: Bearer '+access_token);
	console.log("UPLOADING. .. .. Please Wait! .. .");

	source.pipe(request(options, function(error, message, data){
		if(error){
			console.error("ERROR: Error in Uploading Data", error);
			deferred.reject();
		} else {
			console.log('Upload Response Received');
			data = JSON.parse(data);

			if(data.uploadState === "SUCCESS"){
				console.log('Uploaded successfully!');
				deferred.resolve();
			} else {
				console.log('Failed to upload the zip file');
				console.log(JSON.stringify(data, 0 , 2));
				deferred.reject();
			}
		}
	}));

	return deferred.promise;
});

var shouldPublish = true;
gulp.task('shouldPublish', ['uploadChromeApp'], function(){
	var deferred = q.defer();
	inquirer.prompt([{
		type : 'confirm',
		name : 'shouldPublish',
		message : 'Should we publish this version?',
		default : true
	}], function(answers){

		if (answers.shouldPublish){
			shouldPublish = answers.shouldPublish;
			deferred.resolve();
		} else {
			console.log("Ended without publishing!");
			deferred.reject();
		}
	});
	return deferred.promise;
});

gulp.task('publishToGoogleAppStore', ['shouldPublish'], function(){
	var deferred = q.defer();

	// upload the package
	var options = {
		url : "https://www.googleapis.com/chromewebstore/v1.1/items/"+appIds[answer]+'/publish?publishTarget=trustedTesters',
		method : "POST",
		headers : {
			'Authorization': 'Bearer '+ access_token,
			'x-goog-api-version' : '2',
			'publishTarget' : 'trustedTesters',
			'Content-Length': '0'
		}
	};

	request(options, function(error, message, publishResult){
		if(error) {
			console.error("ERROR: error in publishing to trusted Users", error);
			deferred.reject();
		} else {
			publishResult = JSON.parse(publishResult);
			if(publishResult.status.indexOf("OK")>-1){
				console.log("published successfully");
				deferred.resolve();
			} else {
				console.log('not published');
				console.log(publishResult);
				deferred.reject();
			}
		}
	});

	return deferred.promise;
});

gulp.task('chrome', ['publishToGoogleAppStore'], function () {
	console.log('Enjoy your day!');
});

gulp.task('git-check', function(done) {
	if (!sh.which('git')) {
		console.log(
			'  ' + gutil.colors.red('Git is not installed.'),
			'\n  Git, the version control system, is required to download Ionic.',
			'\n  Download git here:', gutil.colors.cyan('http://git-scm.com/downloads') + '.',
			'\n  Once git is installed, run \'' + gutil.colors.cyan('gulp install') + '\' again.'
		);
		process.exit(1);
	}
	done();
});


gulp.task('deleteIOSApp', function () {
	var deferred = q.defer();

	execute("ionic platform rm ios", function(error){
		if(error !== null){
			console.error("ERROR: REMOVING IOS APP: " + error);
			deferred.reject();
		} else {
			console.log("\n***PLATFORM REMOVED****");
			deferred.resolve();
		}
	});

	return deferred.promise;
});

var encryptFile = function (fileToEncryptPath, encryptedFilePath, callback) {
    console.log("Make sure openssl works on your command line and the bin folder is in your PATH env: " +
        "https://code.google.com/archive/p/openssl-for-windows/downloads");

    if(!process.env.ENCRYPTION_SECRET){
        console.error('ERROR: Please set ENCRYPTION_SECRET environmental variable!');
        return;
    }

    var cmd = 'openssl aes-256-cbc -k "' + process.env.ENCRYPTION_SECRET + '" -in "' + fileToEncryptPath +
        '" -e -a -out "' + encryptedFilePath + '"';

    //console.log('executing ' + cmd);
    execute(cmd, function(error){
        if(error !== null){
            console.error("ERROR: ENCRYPTING: " + error);
        } else {
            console.log("Encrypted " + encryptedFilePath);
            if(callback){
                callback();
            }
        }
    });
};

gulp.task('encryptAndroidKeystore', [], function(callback){
    var fileToEncryptPath = 'quantimodo.keystore';
    var encryptedFilePath = 'quantimodo.keystore.enc';
    encryptFile(fileToEncryptPath, encryptedFilePath, callback);
});

gulp.task('decryptAndroidKeystore', [], function(callback){
    var fileToDecryptPath = 'quantimodo.keystore.enc';
    var decryptedFilePath = 'quantimodo.keystore';
    decryptFile(fileToDecryptPath, decryptedFilePath, callback);
});

gulp.task('encryptSupplyJsonKeyForGooglePlay', [], function(callback){
    var fileToEncryptPath = 'supply_json_key_for_google_play.json';
    var encryptedFilePath = 'supply_json_key_for_google_play.json.enc';
    encryptFile(fileToEncryptPath, encryptedFilePath, callback);
});

gulp.task('decryptSupplyJsonKeyForGooglePlay', [], function(callback){
    var fileToDecryptPath = 'supply_json_key_for_google_play.json.enc';
    var decryptedFilePath = 'supply_json_key_for_google_play.json';
    decryptFile(fileToDecryptPath, decryptedFilePath, callback);
});

gulp.task('encryptBuildJson', [], function(callback){
    var fileToEncryptPath = 'build.json';
    var encryptedFilePath = 'build.json.enc';
    encryptFile(fileToEncryptPath, encryptedFilePath, callback);
});

gulp.task('decryptBuildJson', [], function(callback){
    var fileToDecryptPath = 'build.json.enc';
    var decryptedFilePath = 'build.json';
    decryptFile(fileToDecryptPath, decryptedFilePath, callback);
});

function encryptPrivateConfig(callback) {
    var encryptedFilePath = './scripts/private_configs/' + process.env.LOWERCASE_APP_NAME + '.config.js.enc';
    var fileToEncryptPath = './www/private_configs/' + process.env.LOWERCASE_APP_NAME + '.config.js';
    encryptFile(fileToEncryptPath, encryptedFilePath, callback);
}

gulp.task('encryptPrivateConfig', [], function(){
    encryptPrivateConfig();
});

gulp.task('encryptAllPrivateConfigs', [], function(callback){
	process.env.LOWERCASE_APP_NAME = 'energymodo';
    encryptPrivateConfig();
    process.env.LOWERCASE_APP_NAME = 'medtlc';
    encryptPrivateConfig();
    process.env.LOWERCASE_APP_NAME = 'mindfirst';
    encryptPrivateConfig();
    process.env.LOWERCASE_APP_NAME = 'moodimodo';
    encryptPrivateConfig();
    process.env.LOWERCASE_APP_NAME = 'quantimodo';
    encryptPrivateConfig();
});

gulp.task('decryptPrivateConfig', [], function(callback){
	decryptPrivateConfig(callback);
});

gulp.task('decryptPrivateConfigToDefault', [], function(callback){
    var fileToDecryptPath = './scripts/private_configs/' + process.env.LOWERCASE_APP_NAME + '.config.js.enc';
    var decryptedFilePath = './www/private_configs/default.config.js';
    decryptFile(fileToDecryptPath, decryptedFilePath, callback);
});

gulp.task('deleteFacebookPlugin', function(callback){
    console.log("If this doesn't work, just use gulp cleanPlugins");
    executeCommand("cordova plugin rm phonegap-facebook-plugin", callback);
});

gulp.task('deleteGooglePlusPlugin', function(callback){
	console.log("If this doesn't work, just use gulp cleanPlugins");
    execute("cordova plugin rm cordova-plugin-googleplus", callback);
});

gulp.task('ionicPlatformAddIOS', function(callback){
    executeCommand("ionic platform add ios", callback);
});

var executeCommand = function(command, callback){
    exec(command, function (err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
        callback(err);
    });
};

gulp.task('ionicStateReset', function(callback){
	executeCommand('ionic state reset', callback);
});

var fastlaneSupply = function(track, callback){
	var pathToApks = 'dropbox/' + process.env.LOWERCASE_APP_NAME;
    executeCommand('supply' +
		' --apk_paths ' + pathToApks + '/android-armv7-release.apk,' + pathToApks +  '/android-x86-release.apk' +
        ' --track ' + track +
        ' --json_key supply_json_key_for_google_play.json',
		callback);
};

gulp.task('fastlaneSupplyBeta', function(callback){
    fastlaneSupply('beta', callback);
});

gulp.task('fastlaneSupplyProduction', function(callback){
    fastlaneSupply('production', callback);
});

gulp.task('ionicResources', function(callback){
	executeCommand("ionic resources", callback);
});

var LOWERCASE_APP_NAME = false;

gulp.task('getAppName', function(){
	var deferred = q.defer();
  gutil.log('process.env.LOWERCASE_APP_NAME is ' + process.env.LOWERCASE_APP_NAME);
  LOWERCASE_APP_NAME = process.env.LOWERCASE_APP_NAME;
  if(LOWERCASE_APP_NAME) {
      deferred.resolve();
  }
  if(!LOWERCASE_APP_NAME){
    throw new Error('ERROR: Please set LOWERCASE_APP_NAME env!');
  }
	return deferred.promise;
});

gulp.task('getAppNameFromUserInput', function(){
  var inquireAboutAppName = function(){
    inquirer.prompt([{
      type: 'input',
      name: 'app',
      message: 'Please enter the app name (moodimodo/energymodo/etc..)'
    }], function( answers ) {
      LOWERCASE_APP_NAME = answers.app;
      deferred.resolve();
    });
  };
});

gulp.task('getAppNameFromGitBranchName', function(){
	var inquireAboutAppName = function(){
		inquirer.prompt([{
			type: 'input',
			name: 'app',
			message: 'Please enter the app name (moodimodo/energymodo/etc..)'
		}], function( answers ) {
			LOWERCASE_APP_NAME = answers.app;
			deferred.resolve();
		});
	};
  var commandForGit = 'git rev-parse --abbrev-ref HEAD';
  execute(commandForGit, function(error, output){
    output = output.trim();
    if(error || output.indexOf('app/') < 0 || !output.split("/")[1] || output.split("/")[1].length === 0){
      console.error("ERROR: Failed to get App name automatically.", error);
      inquireAboutAppName();
    } else {
      LOWERCASE_APP_NAME = output.split("/")[1];
      console.log("the app name from git branch is", JSON.stringify(LOWERCASE_APP_NAME));
      deferred.resolve();
    }
  });
});

gulp.task('gitPull', function(){
	var commandForGit = 'git pull';
	execute(commandForGit, function(error, output){
		output = output.trim();
		if(error){
			console.error("ERROR: Failed to pull: " + output, error);
		} else {
			console.log("Pulled changes " + output);
		}
	});
});

gulp.task('gitCheckoutAppJs', function(){
	var commandForGit = 'git checkout -- www/js/app.js';
	execute(commandForGit, function(error, output){
		output = output.trim();
		if(error){
			console.error("ERROR: Failed to gitCheckoutAppJs: " + output, error);
		} else {
			console.log("gitCheckoutAppJs " + output);
		}
	});
});

var ionicUpload = function(callback){
    var commandForGit = 'git log -1 HEAD --pretty=format:%s';
    execute(commandForGit, function(error, output){
        var commitMessage = output.trim();
        var uploadCommand = 'ionic upload --email m@thinkbnumbers.org --password ' + process.env.IONIC_PASSWORD +
            ' --note "' + commitMessage + '" --deploy ' + process.env.RELEASE_STAGE;
        console.log('ionic upload --note "' + commitMessage + '" --deploy ' + process.env.RELEASE_STAGE);
        //console.log('\n' + uploadCommand);
        execute(uploadCommand, function(error, uploadOutput){
            uploadOutput = uploadOutput.trim();
            if(error){
                console.error("ERROR: Failed to ionicUpload: " + uploadOutput + error);
            }

            if(callback){
                callback();
            }
        });
    });
};

gulp.task('ionicUploadStaging', function(callback){
    process.env.RELEASE_STAGE = 'staging';
	ionicUpload(callback);
});

gulp.task('ionicUploadProduction', function(callback){
    process.env.RELEASE_STAGE = 'production';
    ionicUpload(callback);
});

gulp.task('ionicUpload', function(callback){
    ionicUpload(callback);
});

gulp.task('ionicUploadProductionForAllApps', function(callback){
    process.env.RELEASE_STAGE = 'production';
    runSequence(
        'ionicUploadAllApps',
        callback);
});

gulp.task('fastlaneSupplyBetaQuantiModo', function(callback){
    runSequence(
    	'setQuantiModoEnvs',
		'configureApp',
        'fastlaneSupplyBeta',
        callback);
});

gulp.task('ionicUploadStagingForAllApps', function(callback){
    process.env.RELEASE_STAGE = 'production';
    runSequence(
        'ionicUploadAllApps',
        callback);
});


gulp.task('ionicUploadAllApps', function(callback){
    runSequence(
        'setEnergyModoEnvs',
        'configureApp',
        'ionicUploadProduction',
        'setMedTlcEnvs',
        'configureApp',
        'ionicUploadProduction',
        'setMindFirstEnvs',
        'configureApp',
        'ionicUploadProduction',
        'setMoodiModoEnvs',
        'configureApp',
        'ionicUploadProduction',
        'setQuantiModoEnvs',
        'configureApp',
        'ionicUploadProduction',
        callback);
});

gulp.task('ionicAddCrosswalk', function(callback){
    var command = 'ionic plugin add cordova-plugin-crosswalk-webview';
    executeCommand(command, callback);
});

gulp.task('ionicInfo', function(callback){
    var command = 'ionic info';
    executeCommand(command, callback);
});

gulp.task('cordovaPlatformVersionAndroid', function(callback){
    var command = 'cordova platform version android';
    executeCommand(command, callback);
});

gulp.task('downloadGradle', function(){
    return request('https://services.gradle.org/distributions/gradle-2.14.1-bin.zip')
		.pipe(fs.createWriteStream('gradle-2.14.1-bin.zip'));
});

var FACEBOOK_APP_ID = false;
var FACEBOOK_APP_NAME = false;
var REVERSED_CLIENT_ID = false;

gulp.task('readKeysForCurrentApp', ['getAppName'] ,function(){
	var deferred = q.defer();

	fs.stat('./www/private_configs/' + LOWERCASE_APP_NAME + '.config.js', function(err, stat) {
		if(!err) {
			console.log('./www/private_configs/' + LOWERCASE_APP_NAME + '.config.js exists');
		} else {
			console.log(JSON.stringify(err));
		}
	});

	fs.readFile('./www/private_configs/' + LOWERCASE_APP_NAME + '.config.js', function (err, data) {
		if (err) {
			throw err;
		}

		var exr = false;

		if(data.indexOf('FACEBOOK_APP_ID') < 0){
			exr = true;
			console.error("ERROR: NO FACEBOOK_APP_ID found in ./www/private_configs/" + LOWERCASE_APP_NAME + '.config.js');
			deferred.reject();
		}

		if(data.indexOf('FACEBOOK_APP_NAME') < 0){
			exr = true;
			console.error("ERROR: NO FACEBOOK_APP_NAME found in ./www/private_configs/" + LOWERCASE_APP_NAME + '.config.js');
			deferred.reject();
		}

		if(data.indexOf('REVERSED_CLIENT_ID') < 0){
			exr = true;
			console.error("ERROR: NO REVERSED_CLIENT_ID found in ./www/private_configs/" + LOWERCASE_APP_NAME + '.config.js');
			deferred.reject();
		}

		if(!exr){
			var rx =  /("|')FACEBOOK_APP_ID("|')(\s)?:(\s)?("|')(\w*|\.*|\-*)*("|')/g;
			var arr = rx.exec(data);
			FACEBOOK_APP_ID = JSON.parse("{"+arr[0]+"}").FACEBOOK_APP_ID;

			rx =  /("|')FACEBOOK_APP_NAME("|')(\s)?:(\s)?("|')(\w*|\.*|\-*)*("|')/g;
			arr = rx.exec(data);
			FACEBOOK_APP_NAME = JSON.parse("{"+arr[0]+"}").FACEBOOK_APP_NAME;

			rx =  /("|')REVERSED_CLIENT_ID("|')(\s)?:(\s)?("|')(\w*|\.*|\-*)*("|')/g;
			arr = rx.exec(data);
			REVERSED_CLIENT_ID = JSON.parse("{"+arr[0]+"}").REVERSED_CLIENT_ID;

			console.log(FACEBOOK_APP_ID, FACEBOOK_APP_NAME, REVERSED_CLIENT_ID);
			deferred.resolve();
		} else {
            deferred.reject();
        }
	});

	return deferred.promise;
});

gulp.task('addFacebookPlugin', ['readKeysForCurrentApp'] , function(){
	var deferred = q.defer();

	var addFacebookPlugin = function(){
		var commands = [
			'cordova -d plugin add ../fbplugin/phonegap-facebook-plugin',
			'APP_ID="'+ FACEBOOK_APP_ID +'"',
			'APP_NAME="'+ FACEBOOK_APP_NAME +'"'
		].join(' --variable ');

		execute(commands, function(error){
			if(error !== null){
				console.error("ERROR: THERE WAS AN ERROR:ADDING THE FACEBOOK PLUGIN***", error);
				deferred.reject();
			} else {
				console.log("\n***FACEBOOK PLUGIN SUCCESSFULLY ADDED***");
				deferred.resolve();
			}
		});
	};

	fs.exists('../fbplugin', function(exists) {
	    if (exists) {
	    	console.log("FACEBOOK REPO ALREADY CLONED");
	        addFacebookPlugin();
	    } else {
			console.log("FACEBOOK REPO NOT FOUND, CLONING https://github.com/Wizcorp/phonegap-facebook-plugin.git NOW");
	    	var commands = [
	    		"cd ../",
	    		"mkdir fbplugin",
	    		"cd fbplugin",
	    		"GIT_CURL_VERBOSE=1 GIT_TRACE=1 git clone https://github.com/Wizcorp/phonegap-facebook-plugin.git"
	    	].join(' && ');


/*			//Try this if you get the muliple dex file error still
      console.log("FACEBOOK REPO NOT FOUND, CLONING https://github.com/Telerik-Verified-Plugins/Facebook.git NOW");
			var commands = [
				"cd ../",
				"mkdir fbplugin",
				"cd fbplugin",
				"GIT_CURL_VERBOSE=1 GIT_TRACE=1 git clone https://github.com/Telerik-Verified-Plugins/Facebook.git"
        ].join(' && ');
*/
	    	execute(commands, function(error){
	    		if(error !== null){
	    			console.error("ERROR: THERE WAS AN ERROR:DOWNLOADING THE FACEBOOK PLUGIN***", error);
	    			deferred.reject();
	    		} else {
	    			console.log("\n***FACEBOOK PLUGIN DOWNLOADED, NOW ADDING IT TO IONIC PROJECT***");
	    			addFacebookPlugin();
	    		}
	    	});
	    }
	});

	return deferred.promise;
});

//gulp.task('addGooglePlusPlugin', ['deleteGooglePlusPlugin'] , function(){
// Can't do this because failure of deleteGooglePlusPlugin prevents next task.  Use runSequence instead
gulp.task('addGooglePlusPlugin', [] , function(){
	var deferred = q.defer();

	if(!process.env.REVERSED_CLIENT_ID){
        process.env.REVERSED_CLIENT_ID = 'com.googleusercontent.apps.1052648855194-djmit92q5bbglkontak0vdc7lafupt0d';
	    console.log('No REVERSED_CLIENT_ID env specified. Falling back to ' + process.env.REVERSED_CLIENT_ID);
    }

	var commands = [
		'cordova -d plugin add https://github.com/mikepsinn/cordova-plugin-googleplus.git#89ac9f2e8d521bacaaf3989a22b50e4d0b5d6d09',
		'REVERSED_CLIENT_ID="'+ REVERSED_CLIENT_ID +'"'
	].join(' --variable ');

	execute(commands, function(error){
		if(error !== null){
			console.error("ERROR: ADDING THE GOOGLE PLUS PLUGIN***", error);
			deferred.reject();
		} else {
			console.log("\n***GOOGLE PLUS PLUGIN ADDED****");
			deferred.resolve();
		}
	});

	return deferred.promise;
});

gulp.task('fixResourcesPlist', function(){
	var deferred = q.defer();
	if(!process.env.APP_DISPLAY_NAME){
		deferred.reject('Please export process.env.APP_DISPLAY_NAME');
	}

	var myPlist = plist.parse(fs.readFileSync('platforms/ios/'+process.env.APP_DISPLAY_NAME+'/'+process.env.APP_DISPLAY_NAME+'-Info.plist', 'utf8'));

	var LSApplicationQueriesSchemes = [
		"fbapi",
		"fbapi20130214",
		"fbapi20130410",
		"fbapi20130702",
		"fbapi20131010",
		"fbapi20131219",
		"fbapi20140410",
		"fbapi20140116",
		"fbapi20150313",
		"fbapi20150629",
		"fbauth",
		"fbauth2",
		"fb-messenger-api20140430"
	];

	myPlist.LSApplicationQueriesSchemes = LSApplicationQueriesSchemes.concat(myPlist.LSApplicationQueriesSchemes);

	if(myPlist.NSAppTransportSecurity && myPlist.NSAppTransportSecurity.NSExceptionDomains){

		// facebook.com
		var facebookDotCom = {};

		if(myPlist.NSAppTransportSecurity.NSExceptionDomains["facebook.com"]){
			facebookDotCom = myPlist.NSAppTransportSecurity.NSExceptionDomains["facebook.com"];
		}

		if(!facebookDotCom.NSIncludesSubdomains){
			facebookDotCom.NSIncludesSubdomains = true;
		}

		if(!facebookDotCom.NSThirdPartyExceptionRequiresForwardSecrecy){
			facebookDotCom.NSThirdPartyExceptionRequiresForwardSecrecy = false;
		}

		myPlist.NSAppTransportSecurity.NSExceptionDomains["facebook.com"] = facebookDotCom;

		console.log("Updated facebook.com");

		// fbcdn.net
		var fbcdnDotNet = {};

		if(myPlist.NSAppTransportSecurity.NSExceptionDomains["fbcdn.net"]){
			fbcdnDotNet = myPlist.NSAppTransportSecurity.NSExceptionDomains["fbcdn.net"];
		}

		if(!fbcdnDotNet.NSIncludesSubdomains){
			fbcdnDotNet.NSIncludesSubdomains = true;
		}

		if(!fbcdnDotNet.NSThirdPartyExceptionRequiresForwardSecrecy){
			fbcdnDotNet.NSThirdPartyExceptionRequiresForwardSecrecy = false;
		}

		myPlist.NSAppTransportSecurity.NSExceptionDomains["fbcdn.net"] = fbcdnDotNet;

		console.log("Updated fbcdn.net");

		// akamaihd.net
		var akamaihdDotNet = {};

		if(myPlist.NSAppTransportSecurity.NSExceptionDomains["akamaihd.net"]){
			akamaihdDotNet = myPlist.NSAppTransportSecurity.NSExceptionDomains["akamaihd.net"];
		}

		if(!akamaihdDotNet.NSIncludesSubdomains){
			akamaihdDotNet.NSIncludesSubdomains = true;
		}

		if(!akamaihdDotNet.NSThirdPartyExceptionRequiresForwardSecrecy){
			akamaihdDotNet.NSThirdPartyExceptionRequiresForwardSecrecy = false;
		}

		myPlist.NSAppTransportSecurity.NSExceptionDomains["akamaihd.net"] = akamaihdDotNet;

		console.log("Updated akamaihd.net");
	}

	fs.writeFile('platforms/ios/'+process.env.APP_DISPLAY_NAME+'/'+process.env.APP_DISPLAY_NAME+'-Info.plist', plist.build(myPlist), 'utf8', function (err) {
		if (err) {
			console.error("ERROR: error writing to plist", err);
			deferred.reject();
		} else {
			console.log("successfully updated plist");
			deferred.resolve();
		}
	});

	return deferred.promise;
});

gulp.task('addPodfile', function(){
	var deferred = q.defer();

	if(!process.env.APP_DISPLAY_NAME){
		deferred.reject('Please export process.env.APP_DISPLAY_NAME');
	}

	var addBugsnagToPodfile = function(){
		fs.readFile('./platforms/ios/Podfile', function (err, data) {
			if (err) {
				throw err;
			}

			//if(data.indexOf('pod \'Bugsnag\', :git => "https://github.com/bugsnag/bugsnag-cocoa.git"') < 0){

			if(data.indexOf('Bugsnag') < 0){
				console.log("no Bugsnag detected");

				gulp.src('./platforms/ios/Podfile')
				.pipe(change(function(content){
					var bugsnag_str = 'target \''+process.env.APP_DISPLAY_NAME+'\' do \npod \'Bugsnag\', :git => "https://github.com/bugsnag/bugsnag-cocoa.git"';
					console.log("Bugsnag Added to Podfile");
					deferred.resolve();
					return content.replace(/target.*/g, bugsnag_str);
				}))
				.pipe(gulp.dest('./platforms/ios/'));

			} else {
				console.log("Bugsnag already present in Podfile");
				deferred.resolve();
			}
		});
	};

	fs.exists('./platforms/ios/Podfile', function(exists) {
	    if (exists) {
	    	console.log("Podfile");
	        addBugsnagToPodfile();
	    } else {
	    	console.log("PODFILE REPO NOT FOUND, Installing it First");

	    	var commands = [
	    		'cd ./platforms/ios',
	    		'pod init'
	    	].join(' && ');

	    	execute(commands, function(error){
	    		if(error !== null){
	    			console.error("ERROR: There was an error detected", error);
	    			deferred.reject();
	    		} else {
	    			console.log("\n***Podfile Added****");
	    			addBugsnagToPodfile();
	    		}
	    	});
	    }
	});

	return deferred.promise;
});

gulp.task('addInheritedToOtherLinkerFlags', function(){
	if(!process.env.APP_DISPLAY_NAME){
		console.log('Please export process.env.APP_DISPLAY_NAME');
	}

	return gulp.src('./platforms/ios/'+process.env.APP_DISPLAY_NAME+'.xcodeproj/project.pbxproj')
	.pipe(change(function(content){
		return content.replace(/OTHER_LDFLAGS(\s+)?=(\s+)?(\s+)\(/g, "OTHER_LDFLAGS = (\n\t\t\t\t\t\"$(inherited)\",");
	}))
	.pipe(gulp.dest('./platforms/ios/'+process.env.APP_DISPLAY_NAME+'.xcodeproj/'));
});

gulp.task('addDeploymentTarget', function(){

	if(!process.env.APP_DISPLAY_NAME){
		console.log('Please export process.env.APP_DISPLAY_NAME');
	}

	return gulp.src('./platforms/ios/'+process.env.APP_DISPLAY_NAME+'.xcodeproj/project.pbxproj')
		.pipe(change(function(content){
			if(content.indexOf('IPHONEOS_DEPLOYMENT_TARGET') === -1) {
                return content.replace(/ENABLE_BITCODE(\s+)?=(\s+)?(\s+)NO\;/g, "IPHONEOS_DEPLOYMENT_TARGET = 6.0;\ENABLE_BITCODE = NO;");
            }
            return content;
		}))
		.pipe(change(function(content){
			console.log("*****************\n\n\n",content,"\n\n\n*****************");
		}))
		.pipe(gulp.dest('./platforms/ios/'+process.env.APP_DISPLAY_NAME+'.xcodeproj/'));
});

gulp.task('installPods', [ 'addPodfile' ] , function(){
	var deferred = q.defer();

	var commands = [
		'cd platforms/ios',
		'pod install'
	].join(' && ');

	execute(commands, function(error){
		if(error !== null){
			console.error("ERROR: There was an error detected", error);
			deferred.reject();
		} else {
			console.log("\n***Pods Installed****");
			deferred.resolve();
		}
	});

	return deferred.promise;
});

gulp.task('addBugsnagInObjC', function(){
	if(!process.env.APP_DISPLAY_NAME){
		console.log('Please export process.env.APP_DISPLAY_NAME');
	}

	return gulp.src('./platforms/ios/'+process.env.APP_DISPLAY_NAME+'/Classes/AppDelegate.m')
	.pipe(change(function(content){
		if(content.indexOf('Bugsnag') !== -1){
			console.log("Bugsnag Already Present");
			return content;
		} else {
			content = content.replace(/#import "MainViewController.h"/g, "#import \"MainViewController.h\"\n#import \"Bugsnag.h\"");
			content = content.replace(/self\.window\.rootViewController(\s)?=(\s)?self\.viewController\;/g, "[Bugsnag startBugsnagWithApiKey:@\"ae7bc49d1285848342342bb5c321a2cf\"];\n\tself.window.rootViewController = self.viewController;");
			console.log("Bugsnag Added");
		}
		return content;
	}))
	.pipe(gulp.dest('./platforms/ios/'+process.env.APP_DISPLAY_NAME+'/Classes/'));

});

gulp.task('enableBitCode', function(){
	if(!process.env.APP_DISPLAY_NAME){
		console.log('Please export process.env.APP_DISPLAY_NAME');
	}

	return gulp.src('./platforms/ios/'+process.env.APP_DISPLAY_NAME+'.xcodeproj/project.pbxproj')
	.pipe(change(function(content){
		return content.replace(/FRAMEWORK_SEARCH_PATHS(\s*)?=(\s*)?\(/g, "ENABLE_BITCODE = NO;\n\t\t\t\tFRAMEWORK_SEARCH_PATHS = (");
	}))
	.pipe(gulp.dest('./platforms/ios/'+process.env.APP_DISPLAY_NAME+'.xcodeproj/'));
});

gulp.task('makeIosApp', function(callback){
	runSequence(
		'deleteIOSApp',
		'deleteFacebookPlugin',
		'ionicPlatformAddIOS',
		'ionicResources',
		'readKeysForCurrentApp',
		'addFacebookPlugin',
		'addGooglePlusPlugin',
		'fixResourcesPlist',
		'addBugsnagInObjC',
		'enableBitCode',
		'addInheritedToOtherLinkerFlags',
		'addDeploymentTarget',
		'addPodfile',
		'installPods',
		callback);
});

gulp.task('makeIosAppSimplified', function(callback){
	runSequence(
		'readKeysForCurrentApp',
		'fixResourcesPlist',
		'enableBitCode',
		'addInheritedToOtherLinkerFlags',
		'addDeploymentTarget',
		callback);
});

var setVersionNumberInConfigXml = function(configFilePath, callback){
	var xml = fs.readFileSync(configFilePath, 'utf8');
	parseString(xml, function (err, parsedXmlFile) {
		if(err || !parsedXmlFile){
			console.log("failed to read xml file or it is empty", err);
		} else {
			parsedXmlFile.widget.$["version"] = process.env.IONIC_APP_VERSION_NUMBER;
			parsedXmlFile.widget.$["ios-CFBundleVersion"] = process.env.IONIC_IOS_APP_VERSION_NUMBER;
            parsedXmlFile.widget.$["ios-CFBundleVersion"] = getIsoString();
			var builder = new xml2js.Builder();
			var updatedXml = builder.buildObject(parsedXmlFile);
			fs.writeFile(configFilePath, updatedXml, 'utf8', function (error) {
				if (error) {
					console.error("ERROR: error writing to xml file", error);
				} else {
					console.log("successfully updated the version number xml file");
					callback();
				}
			});
		}
	});
};

gulp.task('bumpVersionNumberEnvs', ['setVersionNumberEnvsFromIosConfig'], function(callback){
	process.env.OLD_IONIC_IOS_APP_VERSION_NUMBER = process.env.IONIC_IOS_APP_VERSION_NUMBER;
	var numberToBumpArr = process.env.IONIC_APP_VERSION_NUMBER.split('.');
	numberToBumpArr[2] = (parseInt(numberToBumpArr[2]) + 1).toString();
	if(parseInt(numberToBumpArr[2]) === 10){
		numberToBumpArr[2] = "0";
		numberToBumpArr[1] = (parseInt(numberToBumpArr[1]) + 1).toString();
	}
	if(parseInt(numberToBumpArr[1]) === 10){
		numberToBumpArr[1] = "0";
		numberToBumpArr[0] = (parseInt(numberToBumpArr[1]) + 1).toString();
	}
	process.env.IONIC_APP_VERSION_NUMBER = numberToBumpArr.join('.');
	process.env.IONIC_IOS_APP_VERSION_NUMBER = process.env.IONIC_APP_VERSION_NUMBER + '.0';
	callback();
});

gulp.task('bumpVersionNumbersInFiles', function(callback){
	runSequence(
		'bumpVersionNumberEnvs',
		'setVersionNumberInConfigXml',
		'setVersionNumberInIosConfigXml',
		'setVersionNumberInFiles',
		callback);
});

gulp.task('replaceVersionNumbersInFiles', function(callback){
	runSequence(
		//'setVersionNumberInConfigXml',  Messes it up, I think. Replacing with shell script for now.
		'setVersionNumberInFiles',
        //'setVersionNumberInIosConfigXml',
		callback);
});

gulp.task('setVersionNumberInConfigXml', [], function(callback){
	var configFilePath = './config-template.xml';
	setVersionNumberInConfigXml(configFilePath, callback);
});

gulp.task('setVersionNumberInIosConfigXml', [], function(callback){
	var configFilePath = './config-template-ios.xml';
	setVersionNumberInConfigXml(configFilePath, callback);
});

gulp.task('setVersionNumberInFiles', function(callback){

	if(process.env.OLD_IONIC_IOS_APP_VERSION_NUMBER === process.env.IONIC_IOS_APP_VERSION_NUMBER){
		throw 'process.env.OLD_IONIC_IOS_APP_VERSION_NUMBER should be less than process.env.IONIC_IOS_APP_VERSION_NUMBER';
	}

	if(process.env.OLD_IONIC_APP_VERSION_NUMBER === process.env.IONIC_APP_VERSION_NUMBER){
		throw 'process.env.OLD_IONIC_APP_VERSION_NUMBER should be less than process.env.IONIC_APP_VERSION_NUMBER';
	}

	if(!process.env.IONIC_IOS_APP_VERSION_NUMBER){
		throw 'Please set process.env.IONIC_IOS_APP_VERSION_NUMBER';
	}

	if(!process.env.OLD_IONIC_IOS_APP_VERSION_NUMBER){
		throw 'Please set process.env.OLD_IONIC_IOS_APP_VERSION_NUMBER';
	}

	if(!process.env.OLD_IONIC_APP_VERSION_NUMBER){
		throw 'Please set process.env.OLD_IONIC_APP_VERSION_NUMBER';
	}

	if(!process.env.IONIC_APP_VERSION_NUMBER){
		throw 'Please set process.env.IONIC_APP_VERSION_NUMBER';
	}

	var filesToUpdate = [
		'www/js/controllers/appCtrl.js',
		'www/js/app.js',
		'gulp.js',
		'.travis.yml',
		//'config.xml',  // This should be done with setVersionNumberInConfigXml to avoid plugin version replacements
		//'config-template.xml',  // This should be done with setVersionNumberInConfigXml to avoid plugin version replacements
		//'config-template-ios.xml',  // This should be done with setVersionNumberInIosConfigXml to avoid plugin version replacements
		'resources/chrome_extension/manifest.json',
        'build/chrome_extension/manifest.json',
		'resources/chrome_app/manifest.json'
	];
	
	return gulp.src(filesToUpdate, {base: "."}) // Every file allown.
		.pipe(replace(process.env.OLD_IONIC_IOS_APP_VERSION_NUMBER, process.env.IONIC_IOS_APP_VERSION_NUMBER))
		.pipe(replace('IONIC_IOS_APP_VERSION_NUMBER_PLACEHOLDER', process.env.IONIC_IOS_APP_VERSION_NUMBER))
		.pipe(replace(process.env.OLD_IONIC_APP_VERSION_NUMBER, process.env.IONIC_APP_VERSION_NUMBER))
		.pipe(replace('IONIC_APP_VERSION_NUMBER_PLACEHOLDER', process.env.IONIC_APP_VERSION_NUMBER))
		.pipe(gulp.dest('./'));
	// Using callback results in the next task starting before this on is completed
	//callback();

});

gulp.task('setIonicAppId', function(callback){

	if(!process.env.IONIC_APP_ID){
		console.error('ERROR: Cannot execute setIonicAppId because process.env.IONIC_APP_ID is not set');
		return;
	}

	var filesToUpdate = [
		'www/js/app.js'
	];

	return gulp.src(filesToUpdate, {base: "."}) // Every file allown.
		.pipe(replace('__IONIC_APP_ID__', process.env.IONIC_APP_ID))
		.pipe(gulp.dest('./'));

	// Returning instead of callback makes it complete before next task
	//callback();

});

gulp.task('ic_notification', function() {
	gulp.src('./resources/android/res/**')
		.pipe(gulp.dest('./platforms/android/res'));
});

// Setup platforms to build that are supported on current hardware
//var winPlatforms = ["android", "windows"], //Android is having problems so I'm only building windows for now
var winPlatforms = ["windows"],
	linuxPlatforms = ["android"],
	osxPlatforms = ["ios"],
	platformsToBuild = process.platform === "darwin" ? osxPlatforms :
		(process.platform === "linux" ? linuxPlatforms : winPlatforms),

	// Build config to use for build - Use Pascal case to match paths set by VS
	buildConfig = "Release",

	// Arguments for build by platform. Warning: Omit the extra "--" when referencing platform
	// specific options (Ex:"-- --gradleArg" is "--gradleArg").
	buildArgs = {
		android: ["--" + buildConfig.toLocaleLowerCase(),"--device","--gradleArg=--no-daemon"],
		ios: ["--" + buildConfig.toLocaleLowerCase(), "--device"],
		windows: ["--" + buildConfig.toLocaleLowerCase(), "--device"]
	},

	// Paths used by build
	paths = {
		tsconfig: "scripts/tsconfig.json",
		ts: "./scripts/**/*.ts",
		sass: "./scss/**/*.scss",
		sassCssTarget: "./www/css/",
		apk:["./platforms/android/ant-build/*.apk",
			"./platforms/android/bin/*.apk",
			"./platforms/android/build/outputs/apk/*.apk"],
		binApk: "./bin/Android/" + buildConfig,
		ipa: ["./platforms/ios/build/device/*.ipa",
			"./platforms/ios/build/device/*.app.dSYM"],
		binIpa: "./bin/iOS/" + buildConfig,
		appx: "./platforms/windows/AppPackages/**/*",
		binAppx: "./bin/Windows/" + buildConfig
	};

// Set the default to the build task
gulp.task("default", ["build"]);

// Executes taks specified in winPlatforms, linuxPlatforms, or osxPlatforms based on
// the hardware Gulp is running on which are then placed in platformsToBuild
gulp.task("build",  ["scripts", "sass"], function() {
	return cordovaBuild.buildProject(platformsToBuild, buildArgs)
		.then(function() {
			// ** NOTE: Package not required in recent versions of Cordova
			return cordovaBuild.packageProject(platformsToBuild)
				.then(function() {
					return es.concat(
						gulp.src(paths.apk).pipe(gulp.dest(paths.binApk)),
						gulp.src(paths.ipa).pipe(gulp.dest(paths.binIpa)),
						gulp.src(paths.appx).pipe(gulp.dest(paths.binAppx)));
				});
		});
});

// Build Android, copy the results back to bin folder
gulp.task("build-android", ["scripts", "sass"], function() {
	return cordovaBuild.buildProject("android", buildArgs)
		.then(function() {
			return gulp.src(paths.apk).pipe(gulp.dest(paths.binApk));
		});
});

// Build iOS, copy the results back to bin folder
gulp.task("build-ios", ["scripts", "sass"], function() {
	return cordovaBuild.buildProject("ios", buildArgs)
		.then(function() {
			// ** NOTE: Package not required in recent versions of Cordova
			return cordovaBuild.packageProject(platformsToBuild)
				.then(function() {
					return gulp.src(paths.ipa).pipe(gulp.dest(paths.binIpa));
				});
		});
});

// Build Windows, copy the results back to bin folder
gulp.task("build-win", ["scripts", "sass"], function() {
	return cordovaBuild.buildProject("windows", buildArgs)
		.then(function() {
			return gulp.src(paths.appx).pipe(gulp.dest(paths.binAppx));
		});
});

// Typescript compile - Can add other things like minification here
gulp.task("scripts", function () {
	// Compile TypeScript code - This sample is designed to compile anything under the "scripts" folder using settings
	// in tsconfig.json if present or this gulpfile if not.  Adjust as appropriate for your use case.
	if (fs.existsSync(paths.tsconfig)) {
		// Use settings from scripts/tsconfig.json
		gulp.src(paths.ts)
			.pipe(ts(ts.createProject(paths.tsconfig)))
			.pipe(gulp.dest("."));
	} else {
		// Otherwise use these default settings
		gulp.src(paths.ts)
			.pipe(ts({
				noImplicitAny: false,
				noEmitOnError: true,
				removeComments: false,
				sourceMap: true,
				out: "appBundle.js",
				target: "es5"
			}))
			.pipe(gulp.dest("www/scripts"));
	}
});

// SASS compile (ex in Ionic)
gulp.task("sass", function () {
	return gulp.src(paths.sass)
		.pipe(sass().on("error", sass.logError))
		.pipe(gulp.dest(paths.sassCssTarget));
});

var templateCache = require('gulp-angular-templatecache');
gulp.task('template', function(done){
	gulp.src('./www/templates/**/*.html')
		.pipe(templateCache({
			standalone:true,
			root: 'templates'}))
		.pipe(gulp.dest('./public'))
		.on('end', done);
});

gulp.task('loadConfigs', [], function(callback){
    loadConfigs(callback);
});

gulp.task('setEnergyModoEnvs', [], function(callback){
    process.env.LOWERCASE_APP_NAME = "energymodo";
    runSequence(
        'decryptPrivateConfig',
        'loadConfigs',
        callback);
});

gulp.task('setMedTlcEnvs', [], function(callback){
    process.env.LOWERCASE_APP_NAME = "medtlc";
    runSequence(
        'decryptPrivateConfig',
        'loadConfigs',
        callback);
});

gulp.task('setMindFirstEnvs', [], function(callback){
    process.env.LOWERCASE_APP_NAME = "mindfirst";
    runSequence(
        'decryptPrivateConfig',
        'loadConfigs',
        callback);
});

gulp.task('setMoodiModoEnvs', [], function(callback){
	process.env.LOWERCASE_APP_NAME = "moodimodo";
    runSequence(
        'decryptPrivateConfig',
        'loadConfigs',
        callback);
});

gulp.task('setQuantiModoEnvs', [], function(callback){
    process.env.LOWERCASE_APP_NAME = "quantimodo";
    runSequence(
        'decryptPrivateConfig',
        'loadConfigs',
        callback);
});

gulp.task('setMindFirstEnvs', [], function(callback){
	process.env.LOWERCASE_APP_NAME = "mindfirst";
    runSequence(
        'decryptPrivateConfig',
        'loadConfigs',
        callback);
});

gulp.task('setAndroidEnvs', [], function(callback){
	process.env.CONFIG_XML_TEMPLATE_PATH = "./config-template.xml";
	callback();
});

gulp.task('setIosEnvs', [], function(callback){
	process.env.CONFIG_XML_TEMPLATE_PATH = "./config-template-ios.xml";
	callback();
});

gulp.task('cleanResources', [], function(){
	return gulp.src("resources/*", { read: false }).pipe(clean());
});

gulp.task('cleanPlugins', [], function(){
    return gulp.src("plugins", { read: false }).pipe(clean());
});

gulp.task('cleanPlatformsAndroid', [], function(){
    return gulp.src("platforms/android", { read: false }).pipe(clean());
});

gulp.task('cleanPlatforms', [], function(){
    return gulp.src("platforms", { read: false }).pipe(clean());
});

gulp.task('cleanChromeBuildFolder', [], function(){
    return gulp.src("build/chrome_extension/*", { read: false }).pipe(clean());
});

gulp.task('cleanBuildFolder', [], function(){
    return gulp.src("build/*", { read: false }).pipe(clean());
});

gulp.task('copyAppResources', ['cleanResources'], function () {
	console.log("If this doesn't work, make sure there are no symlinks in the apps folder!");
	return gulp.src(['apps/' + process.env.LOWERCASE_APP_NAME + '/**/*'], {
		base: 'apps/' + process.env.LOWERCASE_APP_NAME
	}).pipe(gulp.dest('.'));
});

gulp.task('copyIconsToWwwImg', [], function(){
    return gulp.src(['apps/' + process.env.LOWERCASE_APP_NAME + '/resources/icon*.png'])
        .pipe(gulp.dest('www/img/icons'));
});

gulp.task('copyAppConfigToDefault', [], function () {
    return gulp.src('./www/configs/' + process.env.LOWERCASE_APP_NAME + '.js')
        .pipe(rename('default.js'))
        .pipe(gulp.dest('www/configs'));
});

gulp.task('copyPrivateConfigToDefault', [], function () {
	console.log('Copying ./www/private_configs/' + process.env.LOWERCASE_APP_NAME + '.config.js to ' +
		'www/private_configs/default.config.js');
    return gulp.src('./www/private_configs/' + process.env.LOWERCASE_APP_NAME + '.config.js')
        .pipe(rename('default.config.js'))
        .pipe(gulp.dest('www/private_configs'));
});

gulp.task('copyIonicCloudLibrary', [], function () {
	return gulp.src(['node_modules/@ionic/cloud/dist/bundle/ionic.cloud.min.js']).pipe(gulp.dest('www/lib'));
});

gulp.task('removeTransparentPng', [], function () {
	return gulp.src("resources/icon.png", { read: false }).pipe(clean());
});

gulp.task('removeTransparentPsd', [], function () {
	return gulp.src("resources/icon.psd", { read: false }).pipe(clean());
});

gulp.task('useWhiteIcon', [], function () {
	return gulp.src('./resources/icon_white.png')
		.pipe(rename('icon.png'))
		.pipe(gulp.dest('resources'));
});

gulp.task('ionicResourcesIos', [], function(callback){
	return execute("ionic resources ios", function(error){
		if(error !== null){
			console.error("ERROR:GENERATING iOS RESOURCES for " + process.env.LOWERCASE_APP_NAME + ": " + error);
		} else {
			console.log("\n***iOS RESOURCES GENERATED for " + process.env.LOWERCASE_APP_NAME);
			callback();
		}
	});
});

var getIsoString = function () {
    var rightNow = new Date();
    var nowString = rightNow.toISOString();
    nowString = nowString.replace(/-/g,"");
    nowString = nowString.replace(/T/g,"");
    nowString = nowString.replace(/:/g,"");
    nowString = nowString.slice(0,14);
    return nowString;
};

gulp.task('generateConfigXmlFromTemplate', [], function(callback){
	//console.log('gulp generateConfigXmlFromTemplate was called');
	if(!process.env.CONFIG_XML_TEMPLATE_PATH){
        process.env.CONFIG_XML_TEMPLATE_PATH = "./config-template.xml";
		console.warn("CONFIG_XML_TEMPLATE_PATH not set!  Falling back to " + process.env.CONFIG_XML_TEMPLATE_PATH);
	} else {
        console.log("generateConfigXmlFromTemplate using " + process.env.CONFIG_XML_TEMPLATE_PATH);
	}
	
	var xml = fs.readFileSync(process.env.CONFIG_XML_TEMPLATE_PATH, 'utf8');

	if(!xml){
        console.log("Could not find template at CONFIG_XML_TEMPLATE_PATH " + process.env.CONFIG_XML_TEMPLATE_PATH);
        return;
	}
	parseString(xml, function (err, parsedXmlFile) {
		if(err){
			throw new Error("ERROR: failed to read xml file", err);
		} else {
			if(process.env.APP_DISPLAY_NAME) {
				parsedXmlFile.widget.name[0] = process.env.APP_DISPLAY_NAME;
				console.log("Setting config.xml name to " + parsedXmlFile.widget.name[0]);
			} else {
                throw("APP_DISPLAY_NAME env not set! Falling back to default QuantiModo APP_DISPLAY_NAME");
			}

			if(process.env.APP_DESCRIPTION) {
				parsedXmlFile.widget.description[0] = process.env.APP_DESCRIPTION;
                console.log("Setting config.xml description to " + parsedXmlFile.widget.description[0]);
			} else {
                throw("APP_DESCRIPTION env not set! Falling back to default QuantiModo APP_DESCRIPTION");
            }

			if(process.env.APP_IDENTIFIER) {
				parsedXmlFile.widget.$["id"] = process.env.APP_IDENTIFIER;
                console.log("Setting config.xml id to " + parsedXmlFile.widget.$["id"]);
			} else {
                throw("APP_IDENTIFIER env not set! Falling back to default QuantiModo APP_IDENTIFIER");
            }

            if(process.env.IONIC_APP_VERSION_NUMBER) {
                parsedXmlFile.widget.$["version"] = process.env.IONIC_APP_VERSION_NUMBER;
                console.log("Setting config.xml version to " + parsedXmlFile.widget.$["version"]);
            }

            if(process.env.IONIC_IOS_APP_VERSION_NUMBER) {
                parsedXmlFile.widget.$["ios-CFBundleVersion"] = process.env.IONIC_IOS_APP_VERSION_NUMBER;
                parsedXmlFile.widget.$["ios-CFBundleVersion"] = getIsoString();
                console.log("Setting config.xml version to " + parsedXmlFile.widget.$["ios-CFBundleVersion"]);
            }

            var builder = new xml2js.Builder();
			var updatedXmlFile = builder.buildObject(parsedXmlFile);

			fs.writeFile('./config.xml', updatedXmlFile, 'utf8', function (error) {
				if (error) {
					console.error("ERROR: Error updating version number in config.xml", error);
				} else {
					console.log("Successfully updated config.xml file");
					callback();
				}
			});
		}
	});
});

gulp.task('bumpIosVersion', function(callback){
	var xml = fs.readFileSync('./config-template-ios.xml', 'utf8');
	parseString(xml, function (err, parsedXmlFile) {
		if(err){
			console.log("failed to read xml file", err);
		} else {
			var numberToBumpArr = parsedXmlFile.widget.$["ios-CFBundleVersion"].split('.');
			var numberToBump = numberToBumpArr[numberToBumpArr.length-1];
			numberToBumpArr[numberToBumpArr.length-1] = (parseInt(numberToBump)+1).toString();
			// Lets just use the timestamp to simplify matters
            numberToBumpArr[numberToBumpArr.length-1] = Math.floor(Date.now() / 1000);
			parsedXmlFile.widget.$["ios-CFBundleVersion"] = numberToBumpArr.join('.');
            parsedXmlFile.widget.$["ios-CFBundleVersion"] = getIsoString();
			var builder = new xml2js.Builder();
			var updatedXml = builder.buildObject(parsedXmlFile);
			fs.writeFile('./config.xml', updatedXml, 'utf8', function (error) {
				if (error) {
					console.error("ERROR: error writing to xml file", error);
				} else {
					console.log("successfully updated the version number xml file");
				}
			});
			fs.writeFile('./config-template-ios.xml', updatedXml, 'utf8', function (err) {
				if (err) {
					console.log("error writing to config-template-ios.xml file", err);
				} else {
					console.log("successfully updated the version number config-template-ios.xml file");
					callback();
				}
			});
		}
	});
});

gulp.task('prepareIosAppIfEnvIsSet', function(callback){
	if(!process.env.PREPARE_IOS_APP){
		console.log("process.env.PREPARE_IOS_APP not true, so not preparing iOS app");
		callback();
		return;
	}
    console.log("process.env.PREPARE_IOS_APP is true, so going to prepareIosApp");
    runSequence(
        'prepareIosApp',
        callback);
});

gulp.task('prepareIosApp', function(callback){
	runSequence(
        'setIosEnvs',
		//'gitPull',  Not sure why we needed this
		'cleanPlugins',
        'configureApp',
        'bumpIosVersion',
        'generateConfigXmlFromTemplate', // Needs to happen before resource generation so icon paths are not overwritten
        'removeTransparentPng',
        'removeTransparentPsd',
        'useWhiteIcon',
		'ionicResourcesIos',
		callback);
});

gulp.task('copyWwwFolderToChromeExtension', [], function(){
	return gulp.src(['www/**/*'])
		.pipe(gulp.dest('build/chrome_extension/www'));
});

gulp.task('symlinkWwwFolderInChromeExtension', ['copyPrivateConfig'], function(){
    return gulp.src(['www/**/*'])
        .pipe(gulp.dest('build/chrome_extension/www'));
});

gulp.task('copyManifestToChromeExtension', [], function(){
	return gulp.src(['resources/chrome_extension/manifest.json'])
		.pipe(gulp.dest('build/chrome_extension'));
});

gulp.task('removeFacebookFromChromeExtension', [], function(){
	return gulp.src("build/chrome_extension/www/lib/phonegap-facebook-plugin/*",
		{ read: false })
		.pipe(clean());
});

gulp.task('zipChromeExtension', [], function(){
	console.log('If this fails, make sure there are no symlinks.');
	return gulp.src(['build/chrome_extension/**/*'])
		.pipe(zip(process.env.LOWERCASE_APP_NAME + '-Chrome-Extension.zip'))
		.pipe(gulp.dest('build'));
});

gulp.task('configureApp', [], function(callback){

    // if(false && process.env.PREPARE_IOS_APP){  // Results in infinite loop
    // 	console.log("process.env.PREPARE_IOS_APP is true so going to prepareIosApp");
    //     runSequence(
    //         'prepareIosApp',
    //         callback);
    // }

	runSequence(
		'copyAppResources',
		'generatePrivateConfigFromEnvs',
		'decryptPrivateConfig', // Need this because defaultApp is mysteriously getting changed to quantimodo on staging
		'decryptPrivateConfigToDefault',
        'loadConfigs',
		//'replaceVersionNumbersInFiles',  It's better to just leave the version numbers hard-coded in the files and
		// templates because of the git changes and weird stuff replacement does to config-template.xml
		'copyAppConfigToDefault',
		'setIonicAppId',
		//'copyIonicCloudLibrary', I think we just keep it in custom-lib now
		//'resizeIcons',  I don't want to run this here because I think it breaks BuddyBuild and Bitrise iOS builds
		'copyIconsToWwwImg',
		//'generateConfigXmlFromTemplate',  Can't do this here because it will overwrite iOS config on BuildBuddy
		'setVersionNumberInFiles',
		//'prepareIosAppIfEnvIsSet',  Can't run this here because prepareIosApp calls configureApp
		callback);

});

gulp.task('buildChromeExtension', [], function(callback){
	runSequence(
        'cleanChromeBuildFolder',
	    'configureApp',
        'resizeIcons',
        'copyIconsToWwwImg',
        'copyWwwFolderToChromeExtension',  //Can't use symlinks
		'copyManifestToChromeExtension',
		'removeFacebookFromChromeExtension',
		'zipChromeExtension',
		'unzipChromeExtension',
		callback);
});

gulp.task('prepareQuantiModoChromeExtension', function(callback){
    runSequence(
        'setQuantiModoEnvs',
        'buildChromeExtension',
        callback);
});

gulp.task('prepareMoodiModoIos', function(callback){
	runSequence(
		'setMoodiModoEnvs',
		'prepareIosApp',
		callback);
});

gulp.task('buildQuantiModo', function(callback){
	runSequence(
		'setQuantiModoEnvs',
        'buildChromeExtension',
		'buildAndroidApp',
		'prepareIosApp',
		callback);
});

gulp.task('buildMoodiModo', function(callback){
    runSequence(
        'setMoodiModoEnvs',
        'buildChromeExtension',
        //'buildAndroidApp',
        'prepareIosApp',
        callback);
});

gulp.task('buildMindFirst', function(callback){
    runSequence(
        'setMindFirstEnvs',
        'buildChromeExtension',
        'buildAndroidApp',
        'prepareIosApp',
        callback);
});

gulp.task('buildMedTlc', function(callback){
    runSequence(
        'setMedTlcEnvs',
        'buildChromeExtension',
        'buildAndroidApp',
        'prepareIosApp',
        callback);
});


gulp.task('buildQuantiModoAndroid', function(callback){
    runSequence(
        'setQuantiModoEnvs',
        'prepareRepositoryForAndroid',
        'buildAndroidApp',
        callback);
});


gulp.task('buildEnergyModoAndroid', function(callback){
    runSequence(
        'setEnergyModoEnvs',
		'prepareRepositoryForAndroid',
        'buildAndroidApp',
        callback);
});

gulp.task('buildAllChromeExtensions', function(callback){
    runSequence(
    	'cleanBuildFolder',
        'setEnergyModoEnvs',
        'buildChromeExtension',
        'setMedTlcEnvs',
        'buildChromeExtension',
        'setMindFirstEnvs',
        'buildChromeExtension',
        'setMoodiModoEnvs',
        'buildChromeExtension',
        'setQuantiModoEnvs',
        'buildChromeExtension',
        callback);
});

gulp.task('buildAllChromeExtensionsAndAndroidApps', function(callback){
    runSequence(
        'cleanBuildFolder',
		'prepareRepositoryForAndroid',
        'setEnergyModoEnvs',
        'buildChromeExtension',
		'buildAndroidApp',
        'setMedTlcEnvs',
        'buildChromeExtension',
        'buildAndroidApp',
        'setMindFirstEnvs',
        'buildChromeExtension',
        'buildAndroidApp',
        'setMoodiModoEnvs',
        'buildChromeExtension',
        'buildAndroidApp',
        'setQuantiModoEnvs',
        'buildChromeExtension',
        'buildAndroidApp',
        callback);
});

gulp.task('buildQuantiModoChromeExtension', function(callback){
    runSequence(
        'setQuantiModoEnvs',
        'buildChromeExtension',
        callback);
});

// This is a hook so we really shouldn't need it
gulp.task('buildAndReleaseIosApp', function(callback){
    runSequence(
        'xcodeProjectFix',
        'fastlaneBetaIos',
        callback);
});

gulp.task('fastlaneBetaIos', function(callback){
	var command = "fastlane beta";
    return execute(command, function(error){
        if(error !== null){
            console.error("ERROR: for " + command + 'for ' + process.env.LOWERCASE_APP_NAME + ": " + error);
        } else {
            console.log("\n***" + command + ' for ' + process.env.LOWERCASE_APP_NAME);
            callback();
        }
    });
});

gulp.task('xcodeProjectFix', function(callback){
    var command = "ruby hooks/after_platform_add.bak/xcodeprojectfix.rb";
    return execute(command, function(error){
        if(error !== null){
            console.error("ERROR: for " + command + 'for ' + process.env.LOWERCASE_APP_NAME + ": " + error);
        } else {
            console.log("\n***" + command + ' for ' + process.env.LOWERCASE_APP_NAME);
            callback();
        }
    });
});

gulp.task('ionicPlatformAddAndroid', function(callback){
	return execute("ionic platform add android@6.1.0", function(error){
			if(error !== null){
				console.error("ERROR: for " + process.env.LOWERCASE_APP_NAME + ": " + error);
			} else {
				console.log("\n***Android for " + process.env.LOWERCASE_APP_NAME);
				callback();
			}
		});
});

gulp.task('ionicPlatformRemoveAndroid', function(callback){
    return execute("ionic platform remove android", function(error){
        if(error !== null){
            console.error("ERROR: for " + process.env.LOWERCASE_APP_NAME + ": " + error);
        } else {
            console.log("\n***Android for " + process.env.LOWERCASE_APP_NAME);
            callback();
        }
    });
});

gulp.task('cordovaBuildAndroidDebug', function(callback){
	return execute("cordova build --debug android", function(error){
		if(error !== null){
			console.error("ERROR: for " + process.env.LOWERCASE_APP_NAME + ": " + error);
		} else {
			console.log("\n***Android for " + process.env.LOWERCASE_APP_NAME);
			callback();
		}
	});
});

gulp.task('cordovaBuildAndroidRelease', function(callback){
	return execute("cordova build --release android", function(error){
		if(error !== null){
			console.error("ERROR: for " + process.env.LOWERCASE_APP_NAME + ": " + error);
		} else {
			console.log("\n***Android for " + process.env.LOWERCASE_APP_NAME);
			callback();
		}
	});
});

gulp.task('copyAndroidResources', [], function(){
	return gulp.src(['resources/android/**/*'])
		.pipe(gulp.dest('platforms/android'));
});


gulp.task('copyAndroidBuild', [], function(){
    var copyApksToDropbox = gulp.src(['platforms/android/build/outputs/apk/*e.apk'])
        .pipe(gulp.dest('dropbox/' + process.env.LOWERCASE_APP_NAME));

    // Non-symlinked apk build folder accessible by Jenkins within Vagrant box
    var copyApksToBuildFolder = gulp.src(['platforms/android/build/outputs/apk/*e.apk'])
        .pipe(gulp.dest('build/apks/' + process.env.LOWERCASE_APP_NAME));
    return es.concat(copyApksToDropbox, copyApksToBuildFolder);
});

gulp.task('prepareQuantiModoIos', function(callback){
	runSequence(
		'setQuantiModoEnvs',
		'prepareIosApp',
		callback);
});

gulp.task('prepareMindFirstIos', function(callback){
	runSequence(
		'setMindFirstEnvs',
		'prepareIosApp',
		callback);
});

gulp.task('generateAndroidResources', [], function(callback){
	return execute("ionic resources android", function(error){
		if(error !== null){
			console.error("ERROR: GENERATING Android RESOURCES for " + process.env.LOWERCASE_APP_NAME + ": " + error);
		} else {
			console.log("\n***Android RESOURCES GENERATED for " + process.env.LOWERCASE_APP_NAME);
			callback();
		}
	});
});

gulp.task('ionicRunAndroid', [], function(callback){
	return execute("ionic run android", function(error){
		if(error !== null){
			console.error("ERROR: GENERATING Android RESOURCES for " + process.env.LOWERCASE_APP_NAME + ": " + error);
		} else {
			console.log("\n***Android RESOURCES GENERATED for " + process.env.LOWERCASE_APP_NAME);
			callback();
		}
	});
});

function resizeIcon(callback, resolution) {
	var command  = 'convert resources/icon.png -resize ' + resolution + 'x' + resolution +
        ' www/img/icons/icon_' + resolution + '.png';
	console.log('Executing command: ' + command);
    return execute(command, function (error) {
    	if(error){
    		console.error("ERROR: " + JSON.stringify(error));
		}
        callback();
    });
}

gulp.task('resizeIcon700', [], function(callback){ return resizeIcon(callback, 700); });
gulp.task('resizeIcon16', [], function(callback){ return resizeIcon(callback, 16); });
gulp.task('resizeIcon48', [], function(callback){ return resizeIcon(callback, 48); });
gulp.task('resizeIcon128', [], function(callback){ return resizeIcon(callback, 128); });

gulp.task('resizeIcons', function(callback){
    runSequence('resizeIcon700',
        'resizeIcon16',
        'resizeIcon48',
        'resizeIcon128',
        callback);
});

gulp.task('prepareRepositoryForAndroid', function(callback){
    runSequence(
    	'setQuantiModoEnvs',
        'setAndroidEnvs',
        'generateConfigXmlFromTemplate',  // Must be run before addGooglePlusPlugin or running any other cordova commands
        'cleanPlatforms',
        'cleanPlugins',
        //'ionicPlatformRemoveAndroid',
        //'ionicStateReset',  // Need this to install plugins from package.json
		'ionicPlatformAddAndroid',
        'decryptBuildJson',
        'decryptAndroidKeystore',
		//'deleteGooglePlusPlugin',  This breaks flow if plugin is not present.  Can't get it to continue on error.  However, cleanPlugins should already do this
        'addGooglePlusPlugin',
		//'ionicPlatformRemoveAndroid', // This is necessary because the platform version will not necessarily be set to 6.1.0 otherwise (it will just follow platforms.json
        //'ionicPlatformAddAndroid',
        'ionicAddCrosswalk',
		'ionicInfo',
        callback);
});

gulp.task('prepareAndroidApp', function(callback){
	runSequence(
		'configureApp',
        'setAndroidEnvs',
        'generateConfigXmlFromTemplate',
        'cordovaPlatformVersionAndroid',
        'decryptBuildJson',
        'decryptAndroidKeystore',
        'generateAndroidResources',
		'copyAndroidResources',
		callback);
});

gulp.task('buildAndroidApp', function(callback){
	runSequence(
		'prepareAndroidApp',
		'cordovaBuildAndroidRelease',
        'copyAndroidBuild',
		//'cordovaBuildAndroidDebug',
		callback);
});

gulp.task('prepareMindFirstAndroid', function(callback){
	runSequence(
		'setMindFirstEnvs',
		'prepareAndroidApp',
		callback);
});

gulp.task('prepareQuantiModoAndroid', function(callback){
    runSequence(
        'setQuantiModoEnvs',
        'prepareAndroidApp',
        callback);
});

gulp.task('setVersionNumberEnvsFromIosConfig', [], function(callback){
	var configFilePath = './config-template-ios.xml';
	var xml = fs.readFileSync(configFilePath, 'utf8');
	parseString(xml, function (error, parsedXmlFile) {
		if(error || !parsedXmlFile){
			console.error("ERROR: failed to read xml file or it is empty", error);
		} else {
			process.env.IONIC_IOS_APP_VERSION_NUMBER = parsedXmlFile.widget.$["ios-CFBundleVersion"];
			process.env.IONIC_APP_VERSION_NUMBER = process.env.IONIC_IOS_APP_VERSION_NUMBER.substring(0, 5);
			callback();
		}
	});
});
