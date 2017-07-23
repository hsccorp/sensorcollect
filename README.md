simple app to collect trip data. Accelerometer seems much more useful than gyroscope in general.
Gyr is better at detecting turns but as far as driver distraction goes, acc does a good job.

In addition to collecting data, I'm also logging a simple heuristic of tracking acc's Z-axis. Assuming you move the phone forward when peeking, z-axis seems to be the best indication so far.


Download
---------
* Download an Android APK from [here](https://drive.google.com/open?id=0Bx0iW5j5f3AQdzJSNDlRV09UTEE)
* For iOS at the moment, please build from source

Usage
-----
* "Start Trip" to start logging a trip. During this time, a wakelock will be taken, so good to keep the phone powered
* While a trip is started, tap one of the markers "left", "right" etc. to mark a time when you are about to perform an action to help train scenarios
* To stop, press "Stop Trip"
* "Share" lets you share the log file with others
* "Upload" uploads all your trips to firebase cloud 
* NOTE: Logs are cumulative. Please tap the "delete" icon on top right to clear logs before you start a trip if you don't want old trips uploaded


Screenshots
------------
<img src="https://github.com/hsccorp/sensorcollect/raw/master/screenshots/sample1.PNG" height="600px" /><img src="https://github.com/hsccorp/sensorcollect/raw/master/screenshots/sample2.PNG" height="600px" /><img src="https://github.com/hsccorp/sensorcollect/raw/master/screenshots/sample1.PNG" height="600px" /><img src="https://github.com/hsccorp/sensorcollect/raw/master/screenshots/sample4.PNG" height="600px" /><img src="https://github.com/hsccorp/sensorcollect/raw/master/screenshots/sample3.PNG" height="600px" />

Compilation
-----------
* Needs [ionic 2](https://ionicframework.com/docs/intro/installation/)
* compile with `--prod` for faster speeds


Image credits
-------------
* splash screen & icon: https://openclipart.org/detail/4632/carfront
