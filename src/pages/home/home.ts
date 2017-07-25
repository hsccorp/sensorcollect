import { Component, ViewChild } from '@angular/core';
import { NavController } from 'ionic-angular';
import { DeviceMotion, DeviceMotionAccelerationData } from '@ionic-native/device-motion';
import { Gyroscope, GyroscopeOrientation } from '@ionic-native/gyroscope';
import { Geolocation } from '@ionic-native/geolocation';
import { Platform } from 'ionic-angular';
import { SocialSharing } from '@ionic-native/social-sharing';
import { Chart } from 'chart.js';
import { AndroidPermissions } from '@ionic-native/android-permissions';
import { Insomnia } from '@ionic-native/insomnia';
import { CommonUtilsProvider } from '../../providers/common-utils/common-utils';
import { AlertController } from 'ionic-angular';
import {ViewTripsPage} from "../view-trips/view-trips";

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})



export class HomePage {


  // will hold subscriptions to sensors
  gpsSub: any = null;
  accSub: any = null;
  gyrSub: any = null;

   markers = [
  {name:'left', val:'left', color:'light'},
  {name:'right', val:'right', color:'light'},
  {name:'brake', val:'brake', color:'light'},
  {name:'unknown', val:'unknown', color:'light'},

  {name:'brake', val:'hard-brake', color:'alert'},
  {name:'distract', val:'distract', color:'alert'},
  {name:'speedup', val:'speedup', color:'alert'},
  {name:'left', val:'hard-left', color:'alert'},
  {name:'right', val:'hard-right', color:'alert'},

]

  // handles to DOM for graphs
  @ViewChild('acc') accCanvas;
  @ViewChild('gyro') gyroCanvas;

  // models for DOM charts
  charts: {
    accChart: any,
    gyroChart: any,
  } = { accChart: null, gyroChart: null };

  progress: { val: number } = { val: -1 }; // upload indication

  acc: any;  // latest accelerometer data
  gyro: any; // latest gyro data
  logState: string = 'Start'; // button state
  pause:boolean = false; // true if recording paused
  pauseColor:string = 'dark';
  stateColor: string = 'primary'; // button color
  logs: any[] = []; // will hold history of acc + gyr data
  logRows: number = 0;
  freq: number = 500;
  viewMode: string = 'graph'; // controls segment display
  dirty: boolean = true; // hack for graph DOM attachment
  mLastAcc: number = 0;
  mCurrAcc: number = 0;
  mAcc: number = 0;
  move: string = "no "; // heuristic to calc. if we picked up phone
  oldZ: number = -1000;
  moveCount: number = 0; // times you 'saw' the phone in a trip
  moveThreshold: number = 3; // tweak this for above sensitivity
  speed: number = 0; // holds GPS speed if applicable
  timer = { 'time': "" }; //trip timer
  currentTripName:string ="";


  // init
  constructor(public navCtrl: NavController, public deviceMotion: DeviceMotion, public plt: Platform, public gyroscope: Gyroscope, public socialSharing: SocialSharing, public insomnia: Insomnia, private geo: Geolocation, public perm: AndroidPermissions, public utils: CommonUtilsProvider, public alert: AlertController) {

    plt.ready().then(() => {
      this.utils.initLog();
      this.createChart(this.charts, this.accCanvas.nativeElement, 'acc', 'Accelerometer');
      this.createChart(this.charts, this.gyroCanvas.nativeElement, 'gyro', 'Gyroscope');
    });

  }

  viewTrips() {
    console.log ("View Trips");
    this.navCtrl.push(ViewTripsPage);
  }

  // uploads file to firebase
  upload(name) {
    console.log("upload");
    this.utils.doAuthWithPrompt()
    .then (succ => {this.utils.uploadDataToFirebase(name,this.progress);})
    .catch (err => {});

  }
    
  
  // unsubscribe from all sensors once trip ends
  stopAllSensors() {
    try {
      this.accSub.unsubscribe();
      this.gyrSub.unsubscribe();
      navigator.geolocation.clearWatch(this.gpsSub); // not sure why this is needed
      this.gpsSub.unsubscribe();
    }
    catch (e) {
      console.log("stop sensor error: " + e);
    }

  }

  // start listening to sensors when trip starts
  startAllSensors() {
    // listen to acc. data
    this.accSub = this.deviceMotion.watchAcceleration({ frequency: this.freq }).subscribe((acceleration: DeviceMotionAccelerationData) => {
      this.process(acceleration, this.charts.accChart, 'acc');
    });

    // listen to gyro data
    this.gyrSub = this.gyroscope.watch({ frequency: this.freq })
      .subscribe((gyroscope: GyroscopeOrientation) => {
        //console.log("Gyro:" + JSON.stringify(gyroscope));
        this.process(gyroscope, this.charts.gyroChart, 'gyro');

      });

    this.perm.checkPermission(this.perm.PERMISSION.ACCESS_FINE_LOCATION).then(
      success => { this.latchGPS(); }, err => { this.utils.presentToast("Error latching to GPS", "error"); });


  }

  // attaches to the GPS and logs readings, for speeds
  latchGPS() {
    console.log(">>>>GPS Latching...");
    this.gpsSub = this.geo.watchPosition({ enableHighAccuracy: true })
      .subscribe((data) => {
        //console.log("GPS:" + JSON.stringify(data));
        if (data.coords) {
          // this is meters per sec, convert to mph
          this.speed = data.coords.speed * 2.23694;
          if (this.isLogging()) { this.storeLog('gps', data.coords); }

        }

      });
  }

  // called by start/stop trip
  toggleButtonState() {
    this.logState = (this.logState == 'Start') ? 'Stop' : 'Start';
    this.stateColor = (this.logState == 'Start') ? 'primary' : 'danger';
    console.log("******* BUTTON IS NOW " + this.logState);
  }

  togglePause() {
    this.pause = !this.pause;
    this.pauseColor = (this.pauseColor == 'dark') ? 'primary': 'dark';
  }


  // init code to start a trip
  startTrip() {
    this.pause = false;
    this.pauseColor = 'dark';
    this.moveCount = 0;
    let alert = this.alert.create({
      title: 'Name your trip',
      inputs: [{
        name: 'name',
        placeholder: 'Your trip name',
      }],

      buttons: [{
        text: 'Cancel',
        role: 'cancel',
        handler: data => {
          console.log('Cancel clicked');
        }

      },
      {
        text: 'Ok',
        handler: data => {
        this.clearArray(); // remove array
        this.utils.deleteLog() // remove log file
        .then (_=>{
          // start new log and start trip
          this.currentTripName = data.name || 'unnamed trip';
          this.startTripHeader(this.currentTripName);
          this.toggleButtonState();
          this.utils.presentToast("trip recording started");
          this.startAllSensors();
          this.utils.startTimer(this.timer);
          // make sure screen stays awake
          this.insomnia.keepAwake()
            .then((succ) => { console.log("*** POWER OK **") })
            .catch((err) => { this.utils.presentToast("could not grab wakelock, screen will dim", "error"); });
        })
        .catch (err=>{this.utils.presentToast('problem removing log file', 'error');})
      
        },
      }],
    });
    alert.present();

  }

  // stops trip, and associated sensors
  stopTrip() {
    console.log("Inside stop trip");
    this.utils.stopTimer(this.timer);
    this.stopAllSensors();
    // make sure screen stays awake
    this.insomnia.allowSleepAgain()
      .then((succ) => { console.log("*** WAKE LOCK RELEASED OK **") })
      .catch((err) => { console.log("Error, releasing wake lock:" + err) });

    try {

      this.flushLog().then(_ => {
        let str = "]}\n";
        console.log("STOPPING TRIP, writing " + str);
        this.utils.writeString(str);
        this.clearArray();
        this.toggleButtonState();
        this.utils.presentToast("trip recording stopped");
        this.upload(this.currentTripName);
        //this.utils.cloudUpload(this.progress);
      }, (error) => (console.log(error)));
    }
    catch (err) { console.log("CATCH=" + err); }

  }

  // called by start trip. Writes a header 
  // we need this because weare writing logs in chunks
  // that eventually need to represent valid JSON objects
  startTripHeader(tname) {
    let str = "{\n    \"id\":\"" + tname + "\",\n";
    str += "    \"sensors\":[\n";
    console.log("STARTING TRIP, writing " + str);
    this.utils.writeString(str)
      .then(resp => { })
      .catch(e => { "ERROR:" + e });

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
      this.mAcc = this.mAcc * 0.9 + delta; // not sure what we will do with this, yet

      // see if phone move matches threshold. Lets make sure we don't double count
      // active moves
      if ((Math.abs(object.z - this.oldZ) >= this.moveThreshold) && (this.move == 'no ')) {
        if (this.oldZ != -1000) {
          this.move = 'YES';
          this.moveCount++;
          // log real value, not abs. As it turns out hard braking is also Z dependant and 
          // possibly the opp. of this. Needs investigation.
          if (this.isLogging()) { this.storeLog('Analytics', { 'value': object.z - this.oldZ, 'threshold': this.moveThreshold, 'action': 'Move' }) }
        }

      }
      else {
        this.move = 'no ';
      }

      this.oldZ = object.z;

      if (this.isLogging()) { this.storeLog('Acc', object); }

    } // if acc

    else if (type == 'gyro') {
      this.gyro = JSON.stringify(object);
      if (this.isLogging()) { this.storeLog('Gyro', object); }
    }

    else // some other data point 
    {

      if (this.isLogging()) { this.storeLog(type, object); }
    }

  }

  // this adds 'events' to the log. Use it for analysis - before you perform an action
  // you want to train, set an appropriate marker
  // allow marker even if paused
  setMarker(str) {

      this.storeLog('Marker', str);
      this.utils.presentToast(str + ' market set', 'success', 1500);
      // restart recording if paused
      if (!this.isLogging()) this.togglePause();
  }

  
  share() {
    let f = this.utils.logFileLocation();
    let options = {
      subject: 'TripData trip logs',
      message: 'Trip logs attached',
      files: [f],
      chooserTitle: 'Share via...'
    };


    this.socialSharing.shareWithOptions(options).then(() => {

    }).catch(() => {
      this.utils.presentToast('Error sharing', 'error');
    });
  }

  // writes to memory, and periodically flushes
  storeLog(type, obj) {
    this.logs.push({ type: type, data: obj, date: Date() })
    this.logRows = this.logs.length;
    if (this.logRows > 100) { this.flushLog(); this.clearArray(); }
  }


  flushLog() {
    console.log(">>>>>>>Flushing logs...");
    return this.utils.writeLog(this.logs);
  }


  isLogging(): boolean {
    return this.logState == 'Stop' && this.pause == false;
  }



  toggleTrip() {
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
            this.utils.presentToast("clearing log file");
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
    this.utils.presentLoader("charting graph..");
    this.dirty = true;
    this.charts.accChart.destroy();
    this.charts.gyroChart.destroy();
    setTimeout(() => {
      console.log("re-drawing chart..");
      this.createChart(this.charts, this.accCanvas.nativeElement, 'acc', 'Accelerometer');
      this.createChart(this.charts, this.gyroCanvas.nativeElement, 'gyro', 'Gyroscope');
      ;
      this.utils.removerLoader();
    }, 500);
  }

  // instantiates charts. Generic function to handle different chart objects
  createChart(charthandle, elem, type, title = '') {
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
        title: {
          display: true,
          text: title,
        },
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
