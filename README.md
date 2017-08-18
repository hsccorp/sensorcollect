[**CHANGELOG**](https://github.com/hsccorp/sensorcollect/blob/master/CHANGELOG.md)

What
------
An app to collect sensor data in a mobile app. Meant to be used while in a car. Currently logging accelerometer, gyroscope and GPS data. Includes ability to add markers to help you analyze segments of data.

In addition to collecting data, I'm also logging a simple heuristic of tracking the accelerometer's Z-axis. Assuming you move the phone forward when peeking, z-axis seems to be the best indication so far.


Download
---------
* Download an Android APK from [here](https://github.com/hsccorp/sensorcollect/releases/)
* For iOS at the moment, please build from source

Usage
-----
* "Start Trip" to start logging a trip. During this time, a wakelock will be taken, so good to keep the phone powered
* While a trip is started, tap markers to mark an action for training. Yellow markers are for bad driving, grey for good driving (negative/positive training). You can also tap the "mic" button on the lower right to speak out the marker names (0.0.4+) [requires voice services to be enabled]
* To stop, press "Stop Trip". When you stop, the trip is automatically uploaded to firebase
* To abort a trip, tap the "X" button - this will clear the current trip without uploading to firebase
* If you want to blank out certain parts of the trip, tap pause to toggle pause on/off as you need. Note that creating a marker automatically un-pauses a paused trip
* If upload fails (maybe you are not online), a new "upload" button will show up for deferred upload
* Tap on the "list" icon on top right of navbar to view uploaded trips, slide to share/delete
* "Share" lets you share the latest trip file with others 

Cloud Database
---------------
* At the end of a trip, the app will automatically try to upload the trip to a preconfigured Firebase DB, for which you need credentials, which you don't have unless you are an HSC employee. That is intentional. You can either modify the code to use your own DB (see below), or, just hit cancel when you are prompted for a password, in which case the trip never gets uploaded. You can still download/share it locally using the "Share" button.
* The app currently uses a pre-configured password protected Firebase DB + Storage bucket to upload trips
* If you are modifying the app for your own needs, you'll want to use your own Database. Its easiest if you just set up your own Firebase instance (its free). Modify [these lines of code](https://github.com/hsccorp/sensorcollect/blob/master/src/app/app.module.ts#L38-L46) to use your own

Screenshots
------------
<img src="https://github.com/hsccorp/sensorcollect/raw/master/screenshots/1.PNG" height="600px" /><img src="https://github.com/hsccorp/sensorcollect/raw/master/screenshots/2.PNG" height="600px" /><img src="https://github.com/hsccorp/sensorcollect/raw/master/screenshots/3.PNG" height="600px" /><img src="https://github.com/hsccorp/sensorcollect/raw/master/screenshots/4.PNG" height="600px" />

Compilation
-----------
* Install [ionic 2](https://ionicframework.com/docs/intro/installation/)  
* git clone `https://github.com/hsccorp/sensorcollect && cd sensorcollect`
* `npm install`
* `ionic cordova platform add ios` and/or `ionic cordova platform add android`
* `ionic cordova  build ios --prod` and/or `ionic cordova build android --prod`
*  `--prod` is for faster speeds/ahead of time compiling
* iOS note - if you get build errors at first run, you might just need to associate a signing certificate to the project in XCode (one time only)


Image credits
-------------
* splash screen & icon: https://openclipart.org/detail/116785/yellow-convertible-sports-car
* Dark theme - https://github.com/pliablepixels/ionic-dark-grey-theme
