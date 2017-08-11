import { Injectable } from '@angular/core';
import { CommonUtilsProvider } from '../common-utils/common-utils';
import 'rxjs/add/operator/map';
import { DeviceMotion, DeviceMotionAccelerationData } from '@ionic-native/device-motion';
import { Gyroscope, GyroscopeOrientation } from '@ionic-native/gyroscope';
import { Geolocation, Geoposition } from '@ionic-native/geolocation';
import { AndroidPermissions } from '@ionic-native/android-permissions';
import { Observable } from 'rxjs/Observable';

// Service to start/listen/unsubscribe sensors

@Injectable()
export class SensorsProvider {

  // will hold subscriptions to sensors

  accSub: any;
  gyrSub: any;
  gpsSub: any;

  freq: number = 500; // sampling freq for gps/gyr

  constructor(public deviceMotion: DeviceMotion, public gyroscope: Gyroscope, public perm: AndroidPermissions, public geo: Geolocation, public utils: CommonUtilsProvider) {
    console.log('Hello SensorsProvider Provider');
  }

  // unsubscribe from varios sensors
  stopAllSensors() {
    try {
      this.accSub.unsubscribe();
      this.gyrSub.unsubscribe();
      //navigator.geolocation.clearWatch(this.sensorHandles.gpsSub); // not sure why this is needed
      this.gpsSub.unsubscribe();
    }
    catch (e) {
      console.log("stop sensor error: " + e);
    }

  }

  // start listening to sensors when trip starts
  startAndStreamSensors(accCallback: Function, gyrCallback: Function, gpsCallback: Function) {

    this.accSub = this.deviceMotion.watchAcceleration({ frequency: this.freq })
      .subscribe(data => {
        accCallback(data);

      })
    this.gyrSub = this.gyroscope.watch({ frequency: this.freq })
      .subscribe(data => {
        let dataClone = JSON.stringify(data);
        gyrCallback(data);
      })

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
