import { Injectable } from '@angular/core';
import { CommonUtilsProvider } from '../common-utils/common-utils';
import 'rxjs/add/operator/map';
import { DeviceMotion, DeviceMotionAccelerationData } from '@ionic-native/device-motion';
import { Gyroscope, GyroscopeOrientation } from '@ionic-native/gyroscope';
import { Geolocation, Geoposition } from '@ionic-native/geolocation';
import { AndroidPermissions } from '@ionic-native/android-permissions';
import { Observable } from 'rxjs/Observable';
import {GyroNorm} from 'gyronorm';
import {Platform} from 'ionic-angular';
import {mat3} from 'gl-matrix';
//import * as math from 'mathjs';


// Service to start/listen/unsubscribe sensors

@Injectable()
export class SensorsProvider {

  // will hold subscriptions to sensors


  accSub: any;
  gyrSub: any;
  gpsSub: any;
  gn: any;


  freq: number = 500; // sampling freq for gps/gyr

  constructor(public deviceMotion: DeviceMotion, public gyroscope: Gyroscope, public perm: AndroidPermissions, public geo: Geolocation, public utils: CommonUtilsProvider, public plt:Platform) {
    console.log('Hello SensorsProvider Provider');

    this.plt.ready().then ( () => {
      this.gn = new GyroNorm();
    });

    //
  }

  // unsubscribe from varios sensors
  stopAllSensors() {
    try {
      this.gn.stop();
      //this.accSub.unsubscribe();
     // this.gyrSub.unsubscribe();
      //navigator.geolocation.clearWatch(this.sensorHandles.gpsSub); // not sure why this is needed
      this.gpsSub.unsubscribe();
    }
    catch (e) {
      console.log("stop sensor error: " + e);
    }

  }

   transpose(a)
  {
    return a[0].map(function (_, c) { return a.map(function (r) { return r[c]; }); });
    // or in more modern dialect
    // return a[0].map((_, c) => a.map(r => r[c]));
  }

  


// credit:https://stackoverflow.com/a/36662093/1361529
getRotationMatrix(alpha, beta, gamma) {
  
    let out = [];
    let  _z = alpha;
    let _x = beta;
    let _y = gamma;
  
    let cX = Math.cos( _x );
    let cY = Math.cos( _y );
    let cZ = Math.cos( _z );
    let sX = Math.sin( _x );
    let sY = Math.sin( _y );
    let sZ = Math.sin( _z );
  
    out[0] = cZ * cY + sZ * sX * sY,    // row 1, col 1
    out[1] = cX * sZ,                   // row 2, col 1
    out[2] = - cZ * sY + sZ * sX * cY , // row 3, col 1
  
    out[3] = - cY * sZ + cZ * sX * sY,  // row 1, col 2
    out[4] = cZ * cX,                   // row 2, col 2
    out[5] = sZ * sY + cZ * cY * sX,    // row 3, col 2
  
    out[6] = cX * sY,                   // row 1, col 3
    out[7] = - sX,                      // row 2, col 3
    out[8] = cX * cY                    // row 3, col 3
  
  return out
  };

  // start listening to sensors when trip starts
  startAndStreamSensors(accCallback: Function, gyrCallback: Function, gpsCallback: Function) {
  let gyroNormArgs = {
    logger: function (data) {console.log ("Gyr-log:"+JSON.stringify(data))},
    gravityNormalized:false, 
    orientationBase:GyroNorm.GAME,
    frequency:1000,
    screenAdjusted:false,
  }


  let out= [];

  console.log (">>> initing gyronorm")
  
  //const GyroNorm = require('GyroNorm').GyroNorm;
  

  console.log ("********** GYRONORM INIT");


   this.gn.init(gyroNormArgs)
   .then (_ => {
    console.log ("********** GYRONORM INIT OK, STARTING");
      this.gn.start ( (gdata) => {
       // console.log ("**GDATA**"+JSON.stringify(gdata))

       const deg2rad = Math.PI / 180;
       let alpha = gdata.do.alpha;
       let beta = gdata.do.beta;
       let gamma = gdata.do.gamma;

       let rotatematrix = this.getRotationMatrix(alpha * deg2rad, beta * deg2rad, gamma * deg2rad);

       let relativeacc = new Array(3);
       let earthacc = new Array(3);
       let inv = new Array(9)
       relativeacc[0] = gdata.dm.x;
       relativeacc[1] = gdata.dm.y;
       relativeacc[2] = gdata.dm.z;

       //console.log ("FIRST MATRIX")
       mat3.invert(inv,rotatematrix);
       //console.log ("SECOND MATRIX")
       mat3.multiply(earthacc, inv, relativeacc);


       let accEarthX = earthacc[0];
       let accEarthY = earthacc[1];
       let accEarthZ = earthacc[2];
        
        let aMag = Math.sqrt(accEarthX*accEarthX + accEarthY*accEarthY + accEarthZ*accEarthZ)

        console.log (`---RAW DATA --- ` + JSON.stringify(gdata));
        console.log (`*** EARTH DATA X=${accEarthX}, Y=${accEarthY} Z=${accEarthZ}`)

        let accdata = {x:0, y:0, z:0 , mag:0};


        accdata.x = accEarthX
        accdata.y = accEarthY;
        accdata.z = accEarthZ;
        accdata.mag = aMag;

        // overwrite only mag
       // accdata.x = aMag;
        //accdata.y = 0;
        //accdata.z = 0;

        
        //console.log ("*** ACC MAG="+aMag);
        accCallback (accdata);

        /*

        https://developer.mozilla.org/en-US/docs/Web/API/Detecting_device_orientation#Motion_values_explained


        The DeviceOrientationEvent.alpha value represents the motion of the device around the z axis, represented in degrees with values ranging from 0 to 360.
        
        The DeviceOrientationEvent.beta value represents the motion of the device around the x axis, represented in degrees with values ranging from -180 to 180. This represents a front to back motion of the device.

        The DeviceOrientationEvent.gamma value represents the motion of the device around the y axis, represented in degrees with values ranging from -90 to 90. This represents a left to right motion of the device.
*/

        let gyrdata = {x:0, y:0, z:0};
        gyrdata.z = gdata.dm.alpha;
        gyrdata.x = gdata.dm.beta;
        gyrdata.y = gdata.dm.gamma;
        gyrCallback (gyrdata);

      })
   } )
    .catch ( err => console.log ("===> Norm err:" + JSON.stringify(err)));

    /*this.accSub = this.deviceMotion.watchAcceleration({ frequency: this.freq })
      .subscribe(data => {
       // accCallback(data);

      })
    this.gyrSub = this.gyroscope.watch({ frequency: this.freq })
      .subscribe(data => {
        let dataClone = JSON.stringify(data);
       // gyrCallback(data);
      })
*/
    this.perm.checkPermission(this.perm.PERMISSION.ACCESS_FINE_LOCATION)
      .then(_ => {
        this.gpsSub = this.geo.watchPosition()
          .subscribe(data => {
            gpsCallback (data);

          })
      })
      .catch(err => {
        this.utils.presentToast("Error latching to GPS", "error");

      });
  }
}
