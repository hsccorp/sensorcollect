simple app to collect trip data. Accelerometer seems much more useful than gyroscope in general.
Gyr is better at detecting turns but as far as driver distraction goes, acc does a good job.

In addition to collecting data, I'm also logging a simple heuristic of tracking acc's Z-axis. Assuming you move the phone forward when peeking, z-axis seems to be the best indication so far.

<img src="https://github.com/hsccorp/sensorcollect/raw/master/screenshots/sample1.PNG" height="600px" />
<img src="https://github.com/hsccorp/sensorcollect/raw/master/screenshots/sample2.PNG" height="600px" />
<img src="https://github.com/hsccorp/sensorcollect/raw/master/screenshots/sample1.PNG" height="600px" />
<img src="https://github.com/hsccorp/sensorcollect/raw/master/screenshots/sample3.PNG" height="600px" />

Known Issues
------------
* GPS speed param doesn't work - need to dive in later

Compilation
-----------
* Needs [ionic 2](https://ionicframework.com/docs/intro/installation/)
* compile with `--prod` for faster speeds


Image credits
-------------
* splash screen & icon: https://openclipart.org/detail/4632/carfront
