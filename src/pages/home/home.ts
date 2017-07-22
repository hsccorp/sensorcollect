import { Component, ViewChild } from '@angular/core';
import { NavController } from 'ionic-angular';
import { DeviceMotion, DeviceMotionAccelerationData } from '@ionic-native/device-motion';
import { Gyroscope, GyroscopeOrientation, GyroscopeOptions } from '@ionic-native/gyroscope';
import { Geolocation } from '@ionic-native/geolocation';
import { Platform } from 'ionic-angular';
import { SocialSharing } from '@ionic-native/social-sharing';
import { Chart } from 'chart.js';
import { DecimalPipe } from '@angular/common';
import { AndroidPermissions } from '@ionic-native/android-permissions';

import { Insomnia } from '@ionic-native/insomnia';
import { CommonUtilsProvider } from '../../providers/common-utils/common-utils';
import { AlertController } from 'ionic-angular';

var gps;

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})

export class HomePage {

  @ViewChild('acc') accCanvas;
  @ViewChild('gyro') gyroCanvas;

  charts: {
    accChart: any,
    gyroChart: any,
  } = { accChart: null, gyroChart: null };
  acc: any;  // latest accelerometer data
  gyro: any; // latest gyro data
  logState: string = 'Start'; // button state
  stateColor: string = 'primary'; // button color
  logs: any[] = []; // will hold history of acc + gyr data
  logRows: number = 0;
  freq: number = 500;
  viewMode: string = 'graph'; // controls segment display
  dirty: boolean = true; // hack for graph DOM attachment
  mLastAcc: number = 0;
  mCurrAcc: number = 0;
  mAcc: number = 0;
  move: string = "no"; // heuristic to calc. if we picked up phone
  oldZ: number = -1000;
  moveCount: number = 0; // times you 'saw' the phone in a trip
  moveThreshold: number = 3; // tweak this for above sensitivity
  speed: number = 0; // holds GPS speed if applicable



  constructor(public navCtrl: NavController, public deviceMotion: DeviceMotion, public plt: Platform, public gyroscope: Gyroscope, public socialSharing: SocialSharing, public insomnia: Insomnia, private geo: Geolocation, public perm: AndroidPermissions, public utils: CommonUtilsProvider, public alert: AlertController) {


    plt.ready().then(() => {
      //this.charts = {};
      this.utils.initLog();

      this.createChart(this.charts, this.accCanvas.nativeElement, 'acc');
      this.createChart(this.charts, this.gyroCanvas.nativeElement, 'gyro');

      // listen to acc. data
      var as = this.deviceMotion.watchAcceleration({ frequency: this.freq }).subscribe((acceleration: DeviceMotionAccelerationData) => {
        this.process(acceleration, this.charts.accChart, 'acc');
      });

      // listen to gyro data
      var gs = this.gyroscope.watch({ frequency: this.freq })
        .subscribe((gyroscope: GyroscopeOrientation) => {
          this.process(gyroscope, this.charts.gyroChart, 'gyro');

        });

    
      
      this.perm.checkPermission(this.perm.PERMISSION.ACCESS_FINE_LOCATION).then(
        success => { this.latchGPS(); }, err => { this.utils.presentToast("Error latching to GPS", "error"); });

    

      // make sure screen stays awake
      this.insomnia.keepAwake()
        .then((succ) => { console.log("*** POWER OK **") })
        .catch((err) => { this.utils.presentToast("could not grab wakelock, screen will dim", "error"); });

    });

  }

  toggleButtonState() {
    this.logState = (this.logState == 'Start') ? 'Stop' : 'Start';
    this.stateColor = (this.logState == 'Start') ? 'primary' : 'danger';
  }

  startTrip() {
    this.moveCount = 0;
    let alert = this.alert.create({
      title: 'Name your trip',
      inputs: [{
        name: 'name',
        placeholder: 'My Trip',
      }],

      buttons: [{
        text: 'Cancel',
        role: 'cancel',
        handler: data => {
          console.log('Cancel clicked');
          this.startTripHeader(Date());
          this.toggleButtonState();
          this.utils.presentToast("trip recording started");
        }

      },
      {
        text: 'Ok',
        handler: data => {
          this.startTripHeader(data.name || Date());
          this.toggleButtonState();
        },
      }],
    });
    alert.present();

  }

  latchGPS() {
        console.log (">>>>GPS Latching...");
         gps = this.geo.watchPosition();

          gps.subscribe((data) => {
            console.log("GPS:" + JSON.stringify(data));
            if (data.coords) {
              this.speed = data.coords.speed;
              if (this.isLogging()) { this.storeLog('gps', JSON.stringify(data.coords)); }

            }

          });
      }

  // given a sensor object, updates graph and log 
  process(object, chart, type) {
    if (!this.dirty) { // let's make sure there is no race when chart is re-creating
      //console.log("Pushing "+type+":" + object.x);

      chart.data.datasets[0].data.shift();
      chart.data.datasets[0].data.push(object.x);
      chart.data.labels.shift();
      chart.data.labels.push("");


      chart.data.datasets[1].data.shift();
      chart.data.datasets[1].data.push(object.y);
      chart.data.labels.shift();
      chart.data.labels.push("");

      chart.data.datasets[2].data.shift();
      chart.data.datasets[2].data.push(object.z);
      chart.data.labels.shift();
      chart.data.labels.push("");

      setTimeout(() => {
        //console.log("updating chart..");
        chart.update();
      }, 100);
    }
    else {
      console.log("dirty");
    }

    if (type == 'acc') // accelerometer
    {

      this.acc = JSON.stringify(object);
      this.mLastAcc = this.mCurrAcc;

      this.mCurrAcc = Math.sqrt(object.x * object.x + object.y * object.y + object.z * object.z);
      let delta = this.mCurrAcc - this.mLastAcc;
      this.mAcc = this.mAcc * 0.9 + delta;

      // see if phone move matches threshold. Lets make sure we don't double count
      // active moves
      if ((Math.abs(object.z - this.oldZ) >= this.moveThreshold) && (this.move == 'no')) {
        if (this.oldZ != -1000) {
          this.move = 'YES';
          this.moveCount++;
          if (this.isLogging()) { this.storeLog('Move', { 'value': Math.abs(object.z - this.oldZ), 'threshold': this.moveThreshold }) }
        }

      }
      else {
        this.move = 'no';
      }

      this.oldZ = object.z;

      if (this.isLogging()) { this.storeLog('Acc', this.acc); }

    } // if acc

    else if (type == 'gyro') {
      this.gyro = JSON.stringify(object);
      if (this.isLogging()) { this.storeLog('Gyro', this.gyro); }
    }

    else // some other data point 
    {

      if (this.isLogging()) { this.storeLog(type, JSON.stringify(object)); }
    }

  }


  setMarker(str) {

       if (this.isLogging()) { 
         this.storeLog('Marker', str ); 
         this.utils.presentToast(str+' market set','success',1500);
        }

  }

  // currently simply shares via email. No error checking, make sure email is associated
  // else error
  share() {
    let f = this.utils.logFileLocation();
    let options = {
      message: 'Trip logs attached',
      files: [f],
      chooserTitle: 'Share via...'
    };


    this.socialSharing.shareWithOptions(options).then(() => {

    }).catch(() => {
      this.utils.presentToast('Error sharing', 'error');
    });
  }

  storeLog(type, str) {
    //console.log("StoreLog");
    this.logs.push({ type: type, data: str, date: Date() })
    //console.log (JSON.stringify(this.logs));
    this.logRows = this.logs.length;
    if (this.logRows > 100) { this.flushLog(); this.clearArray(); }
  }


  flushLog() {
    console.log(">>>>>>>Flushing logs...");
    return this.utils.writeLog(this.logs);
  }


  isLogging(): boolean {
    return this.logState == 'Stop';
  }

  stopTrip() {

    console.log ("Inside stop trip");

    try {
          
    this.flushLog().then(_ => {
      let str = "]},\n";
      console.log("STOPPING TRIP, writing " + str);
      this.utils.writeString(str);
      this.clearArray();
      this.toggleButtonState();
      this.utils.presentToast("trip recording stopped");
    }, (error)=>(console.log(error)));
  }
  catch (err) {console.log ("CATCH="+err);}

  }

  startTripHeader(tname) {
    let str = "{\n    id:\"" + tname + "\",\n";
    str += "    sensors:[\n";
    console.log("STARTING TRIP, writing " + str);
    this.utils.writeString(str)
    .then (resp=>console.log("OK:"+resp))
    .catch (e=> { "ERROR:"+e});
  
  }

  toggleLog() {
    if (this.logState == 'Stop') {
      // write to file if stopped
      this.stopTrip();
    }

    if (this.logState == 'Start') {

      this.startTrip();
    }
  }

  clearArray() {
    this.logs = [];
    this.logRows = 0;
  }

  confirmDelete() {
    let alert = this.alert.create({
      title: 'Confirm Deletion',
      message: 'This will permanently delete all stored trips',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => {
            console.log('Cancel clicked');
          }
        },
        {
          text: 'Ok',
          handler: () => {
            this.clearArray();
            this.utils.deleteLog();

          }
        }
      ]
    });
    alert.present();
  }


  segmentClicked() {
    console.log("SEGMENT CLICKED");
    this.dirty = true;
    this.charts.accChart.destroy();
    this.charts.gyroChart.destroy();
    setTimeout(() => {
      console.log("re-drawing chart..");
      this.createChart(this.charts, this.accCanvas.nativeElement, 'acc');
      this.createChart(this.charts, this.gyroCanvas.nativeElement, 'gyro');
      ;
    }, 100);
  }

  createChart(charthandle, elem, type) {
    console.log("*** Creating Chart");
    let chart;
    chart = new Chart(elem, {

      type: 'line',
      data: {
        labels: ["", "", "", "", "", "", "", "", "", ""],
        datasets: [
          {
            label: 'X',
            data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            //backgroundColor: 'rgb(255,0,0)',
            borderColor: 'rgb(255,0,0)',
            borderWidth: 2,
            fill: false,
          },
          {
            label: 'Y',
            data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            //backgroundColor: 'rgb(255,0,0)',
            borderColor: 'rgb(0,255,0)',
            borderWidth: 2,
            fill: false,
          },

          {
            label: 'Z',
            data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            //backgroundColor: 'rgb(255,0,0)',
            borderColor: 'rgb(0,0,255)',
            borderWidth: 2,
            fill: false,
          },
        ]
      },
      options: {
        responsive: true,

        scales: {


          yAxes: [{
            display: true,

            ticks: {
              min: -16,
              max: 16,

            }
          }]
        }
      }

    });

    if (type == 'acc')
      charthandle.accChart = chart;
    else
      charthandle.gyroChart = chart;



    this.dirty = false;
  }

  ionViewDidLoad() {
    console.log("*********** LOADED VIEW ");

  }

}
