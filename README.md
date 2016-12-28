# 5-Minute Quick Start
1. Contact mike@quantimo.do for a private configuration file with client id and secret to access the API. Never commit this file to the public repository!
1. Install [Node.js](http://nodejs.org/).  (Windows Developers: I recommend [Visual Studio Community]
(https://www.visualstudio.com/cordova-vs?wt.mc_id=o~display~ionic~dn948185), which comes with everything you need!)
1. Install the latest Cordova and Ionic command-line tools in your terminal with `npm install -g cordova ionic`.  
(Mac Users:  Avoid using `sudo` with your npm commands if possible as it tends to cause problems.)
1. Install Bower (to auto-download all the libraries listed in bower.json) globally with `npm install -g bower`.  
1. Run `npm install` in the root of this repository.
1. Run `ionic serve` in the root of this repository and you should see your app at 
[http://localhost:8100/#/](http://localhost:8100/#/).
1. Great job!  :D  Now you can start configuring your app by changing settings in 
`www/configs/yourlowercaseappnamehere.js` and modifying the code as needed!
1. Need help?  Please [create an issue](https://github.com/QuantiModo/quantimodo-android-chrome-ios-web-app/issues) 
or [contact me](http://help.quantimo.do). 

## [Interactive API Explorer](https://app.quantimo.do/api/v2/account/api-explorer)

## One Click Deploy
When you're ready to share your app with the world, you can deploy your app to Heroku. 

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/QuantiModo/quantimodo-android-chrome-ios-web-app/)

After creating your Heroku app with the above button, go to the "Deploy" section for your app in the Heroku dashboard.
There, you can link the Heroku app to your Github repository.  Then, it will automatically update when you push changes
to Github.

## Chrome Development Tips
1. Install [Chrome Apps & Extensions Developer Tool](https://Chrome.google.com/webstore/detail/Chrome-apps-extensions-de/ohmmkhmmmpcnpikjeljgnaoabkaalbgc?utm_source=Chrome-ntp-icon)
1. You can load the whole repo as an unpacked extension
1. [Add the www folder to your workspace](https://developer.Chrome.com/devtools/docs/workspaces)
1. To be able to edit and save files within the Chrome dev console, map the browser's index.html file to the workspace www/index.html
1. To avoid debugging libraries, go to Chrome Dev Console -> Settings -> Blackboxing and add `\.min\.js$`, `/backbone\.js$`, `jquery.js` and `/angular\.js$`

## File Structure
The main contents of the App are in the `www` folder. The structure is:
```
|---platforms
|---plugins
|---resources
|---www
     |----callback
            |---index.html
     |----css
     |----customlib
     |----img
     |----js
           |---controllers
           |---services
           |---filters
           |---app.js
           |---config.js
     |----lib
     |----templates
     |----index.html
```

## Controllers
  Controllers are located in `www/js/controllers` directory. Each View has a separate controller or some views share 
  the same controller if the functionality is same.
  The main controller for the app is `appCtrl.js` whereas all the other controllers run when their views come to focus.
  
## Services
  Services are the data layer, which store and obtain data from the `QuantiModo API`.  Services are also used to provide chart configurations and utility functions. 

## [Contribute](docs/contributing.md)

## Screenshots 

<p align="center">
<img src="https://raw.githubusercontent.com/QuantiModo/quantimodo-android-chrome-ios-web-app/develop/resources-shared/screenshots/5.5-inch%20(iPhone%206%2B)%20-%20History%20Screenshot%201.jpg" width="300">
&nbsp
<img src="https://raw.githubusercontent.com/QuantiModo/quantimodo-android-chrome-ios-web-app/develop/resources-shared/screenshots/5.5-inch%20(iPhone%206+)%20-%20import%20data%20Screenshot%201.jpg" width="300">
<br><br>
<img src="https://raw.githubusercontent.com/QuantiModo/quantimodo-android-chrome-ios-web-app/develop/resources-shared/screenshots/5.5-inch%20(iPhone%206+)%20-%20bar%20chart%20Screenshot%201.jpg" width="300">
&nbsp
<img src="https://raw.githubusercontent.com/QuantiModo/quantimodo-android-chrome-ios-web-app/develop/resources-shared/screenshots/5.5-inch%20(iPhone%206+)%20-%20predictors%20Screenshot%201.jpg" width="300">
<br><br>
<img src="https://raw.githubusercontent.com/QuantiModo/quantimodo-android-chrome-ios-web-app/develop/resources-shared/screenshots/5.5-inch%20(iPhone%206+)%20-%20reminder%20inbox%20Screenshot%201.jpg?" width="300">
</p>