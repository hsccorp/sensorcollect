an app to collect sensor data in a mobile app. Meant to be used while in a car. I am currently logging accelerometer, gyroscope and GPS data.

In addition to collecting data, I'm also logging a simple heuristic of tracking the accelerometer's Z-axis. Assuming you move the phone forward when peeking, z-axis seems to be the best indication so far.


Download
---------
* Download an Android APK from [here](https://drive.google.com/open?id=0Bx0iW5j5f3AQdzJSNDlRV09UTEE)
* For iOS at the moment, please build from source

Usage
-----
* "Start Trip" to start logging a trip. During this time, a wakelock will be taken, so good to keep the phone powered
* While a trip is started, tap markers to mark an action for training. Yellow markers are for bad driving, grey for good driving (negative/positive training)
* To stop, press "Stop Trip". When you stop, the trip is automatically uploaded to firebase
* "Share" lets you share the latest trip file with others
* Tap on the "list" icon on top left of navbar to view uploaded trips, slide to share


Screenshots
------------
<img src="https://github.com/hsccorp/sensorcollect/raw/master/screenshots/sample1.PNG" height="600px" /><img src="https://github.com/hsccorp/sensorcollect/raw/master/screenshots/sample2.PNG" height="600px" /><img src="https://github.com/hsccorp/sensorcollect/raw/master/screenshots/sample1.PNG" height="600px" /><img src="https://github.com/hsccorp/sensorcollect/raw/master/screenshots/sample4.PNG" height="600px" /><img src="https://github.com/hsccorp/sensorcollect/raw/master/screenshots/sample3.PNG" height="600px" />

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
* splash screen & icon: https://openclipart.org/detail/4632/carfront
