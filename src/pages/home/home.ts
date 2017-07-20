import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { DeviceMotion, DeviceMotionAccelerationData } from '@ionic-native/device-motion';
import { Gyroscope, GyroscopeOrientation, GyroscopeOptions } from '@ionic-native/gyroscope';
import { Platform } from 'ionic-angular';
import { SocialSharing } from '@ionic-native/social-sharing';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})

export class HomePage {

  acc: any;  // latest accelerometer data
  gyro: any; // latest gyro data
  logState: string = 'Start'; // button state
  stateColor: string = 'primary'; // button color
  logs: any[] = []; // will hold history of acc + gyr data
  logRows: number = 0;
  freq: number = 1000;
  rnd: number = 0;

    constructor(public navCtrl: NavController, public deviceMotion: DeviceMotion, public plt: Platform, public gyroscope: Gyroscope, public socialSharing: SocialSharing) {
    plt.ready().then(() => {
      // listen to acc. data
      var as = this.deviceMotion.watchAcceleration({ frequency: this.freq }).subscribe((acceleration: DeviceMotionAccelerationData) => {
        this.processAcc(acceleration);
      });

      // listen to gyro data
      var gs = this.gyroscope.watch({ frequency: this.freq })
        .subscribe((gyroscope: GyroscopeOrientation) => {
         this.processGyr(gyroscope);
        });
    });

  }


  processAcc(acceleration) {
        this.acc = JSON.stringify(acceleration);
        if (this.isLogging()) { this.storeLog('Acc', this.acc); }
  }

  processGyr(gyroscope) {
    this.gyro = JSON.stringify(gyroscope);
    if (this.isLogging()) { this.storeLog('Gyro', this.gyro); }
  }

  // currently simply shares via email. No error checking, make sure email is associated
  // else error
  share() {
     let message = '';
     for (let i=0; i<this.logs.length; i++) {
       message = message + this.logs[i].date+":"+this.logs[i].type+this.logs[i].data+"\n";
     }

     this.socialSharing.shareViaEmail(message, 'sensor logs', ['']).then(() => {
  // Success!
    }).catch(() => {
  // Error!
      console.log ("Error - email ");
    });
  }

  storeLog(type, str) {
    //console.log("StoreLog");
    this.logs.push({ type: type, data: str, date:Date() })
    //console.log (JSON.stringify(this.logs));
    this.logRows = this.logs.length;
  }
  isLogging(): boolean {
    return this.logState == 'Stop';
  }

  toggleLog() {
    this.logState = (this.logState == 'Start') ? 'Stop' : 'Start';
    this.stateColor = (this.logState == 'Start') ? 'primary' : 'danger';
  }

  clear() {
    this.logs = [];
    this.logRows = 0;
  }

}
