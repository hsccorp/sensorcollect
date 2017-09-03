import { Component, ViewChild } from '@angular/core';
import { NavController, ModalController, Platform } from 'ionic-angular';

import { SocialSharing } from '@ionic-native/social-sharing';
import { Chart } from 'chart.js';

import { Insomnia } from '@ionic-native/insomnia';
import { CommonUtilsProvider } from '../../providers/common-utils/common-utils';
import { SensorsProvider } from '../../providers/sensors/sensors';
import { DatabaseProvider } from '../../providers/database/database';
import { AlertController } from 'ionic-angular';
import { ViewTripsPage } from "../view-trips/view-trips";
import { AlertModalPage } from "../alert-modal/alert-modal";
import { BlePage } from "../ble/ble";
import { SpeechRecognition, SpeechRecognitionListeningOptionsAndroid, SpeechRecognitionListeningOptionsIOS } from '@ionic-native/speech-recognition';
import { NgZone } from '@angular/core';
import { AndroidPermissions } from '@ionic-native/android-permissions';

import * as Fuse from 'fuse.js';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})



export class HomePage {
 
  // modify these to make your own markers
  // name = what is displayed as a button
  // val = what is written in the log
  markers = [
    //  good markers
    { name: 'turn', val: 'turn', color: 'light', speech: 'turn' },
    { name: 'brake', val: 'brake', color: 'light', speech: 'brake' },
    { name: 'unknown', val: 'unknown', color: 'light', speech: 'unknown' },
    // bad markers
    { name: 'brake', val: 'hard-brake', color: 'alert', speech: 'hard brake' },
    { name: 'distract', val: 'distract', color: 'alert', speech: 'distract' },
    { name: 'speedup', val: 'speedup', color: 'alert', speech: 'speed up' },
    { name: 'turn', val: 'sharp-turn', color: 'alert', speech: 'sharp turn' },
  ]



  // will be used for fuzzy search after speech recognition
  myFuseOptions: Fuse.FuseOptions = {
    caseSensitive: false,
    keys: ['speech'],
    shouldSort: true,
  };
  myFuse = new Fuse(this.markers, this.myFuseOptions);

  // handles to DOM for graphs
  @ViewChild('accGraph') accCanvas;
  @ViewChild('gyroGraph') gyroCanvas;

  // models for DOM charts
  charts: {
    accChart: any,
    gyroChart: any,
  } = { accChart: null, gyroChart: null };


  progress: { val: number } = { val: -1 }; // upload indication

  // used for relative measurements
  //isRelative: false;
  oldSensorVals: { 
    acc: {x:number, y:number, z:number},
    gyr: {x:number, y:number, z:number},

};


  acc: any;  // latest accelerometer data
  gyro: any; // latest gyro data
  logState: string = 'Start'; // button state
  pause: boolean = false; // true if recording paused
  pauseColor: string = 'secondary';
  stateColor: string = 'primary'; // button color
  logs: any[] = []; // will hold history of acc + gyr data
  logRows: number = 0;
  viewMode: string = 'graph'; // controls segment display
  dirty: boolean = true; // hack for graph DOM attachment
  mLastAcc: number = 0; // not used, really
  mCurrAcc: number = 0; // not used, really
  mAcc: number = 0; // not used, really
  move: string = "no "; // heuristic to calc. if we picked up phone
  oldZ: number = -1000; // stores past Z axis val in acc (for distract analytics)
  moveCount: number = 0; // times you 'saw' the phone in a trip
  moveThreshold: number = 3; // tweak this for above sensitivity
  speed: number = 0; // holds GPS speed if applicable
  timer = { 'time': "" }; //trip timer
  currentTripName: string = "";
  pendingUpload: boolean = false; // if true, cloud upload failed
  remoteVer: string = "0.0.0"; // latest remote app version;
  isOutdated: boolean; // true if new version av.
  logCoords: boolean = true; // if true, will capture latLong
  speechAvailable: boolean = true; // if false, speech recog will be disabled
  latestSpeech: string = ""; // will hold latest words

  androidOptions: SpeechRecognitionListeningOptionsAndroid;
  iosOptions: SpeechRecognitionListeningOptionsIOS;

  // init
  constructor(public navCtrl: NavController,  public plt: Platform,  public socialSharing: SocialSharing, public insomnia: Insomnia,   public utils: CommonUtilsProvider, public alert: AlertController, public modal: ModalController, public speech: SpeechRecognition, public db: DatabaseProvider, public zone: NgZone, public perm: AndroidPermissions, public sensors:SensorsProvider) {
    //, 

    plt.ready().then(() => {
      if (this.plt.is('ios')) {
        console.log (">>>>>>>>>>>>>> HACKING BACKGROUND COLOR");
         window['plugins'].webviewcolor.change('#000');
      }
     
      this.db.init();
      this.db.getPendingUpload() // do we have a trip that did not upload?
        .then(succ => { this.pendingUpload = succ.status; this.currentTripName = succ.name; console.log("PENDING RETURNED " + JSON.stringify(succ)); })


      this.speech.isRecognitionAvailable()
        .then((available: boolean) => {
          console.log("Speech recognition:" + available);
          if (!available) {
            this.utils.presentToast("Speech recognition not supported", "error");
            this.speechAvailable = false;
          }
          else {
            this.getPermission()
              .then(succ => { console.log("Got speech permission"); })
              .catch(err => {
                console.log("Error getting speech permission");
                this.speechAvailable = false;
                this.utils.presentToast("Error getting speech permissions", "error");
              })

          }
        })
    });

  }


  // credit: https://learnionic2.com/2017/03/30/speech-to-text-with-ionic-2/
  // 
  async getPermission(): Promise<void> {
    try {
      let permission = await this.speech.requestPermission();
      console.log(permission);
      return permission;
    }
    catch (e) {
      console.error(e);
    }
  }

  async hasPermission(): Promise<boolean> {
    try {
      let permission = await this.speech.hasPermission();
      console.log(permission);
      return permission;
    }
    catch (e) {
      console.error(e);
    }
  }

  // called when user taps on the mic
  recognizeSpeech() {
    this.androidOptions = {
      prompt: 'Please start speaking'
    }

    this.iosOptions = {
      language: 'en-US'
    }

    if (this.plt.is('android')) {
      this.speech.requestPermission().then(
        succ => {
          this.speech.startListening(this.androidOptions).subscribe(data => { console.log(data); this.latestSpeech = data[0]; this.setSpeechMarker(this.latestSpeech) },
            error => console.log(error));
        }
      )

    }
    else if (this.plt.is('ios')) {
      this.speech.requestPermission().then(
        succ => {
          this.utils.presentLoader("Please speak...");
          setTimeout(() => {
            this.speech.stopListening();
            this.utils.removeLoader();

          }, 3000)
          this.speech.startListening(this.iosOptions)
            .subscribe(data => { console.log(data); this.speech.stopListening(); this.latestSpeech = data[0]; this.setSpeechMarker(this.latestSpeech) },
            error => console.log(error));
        }
      )

    }

  }

  clearLogin() {
    this.db.clearUser();
    this.utils.presentToast("cleared user");

  }

  // returns app version
  getVersion() {
    return this.utils.getVersion();
  }

  // loads view trip controller
  viewTrips() {
    console.log("View Trips");
    this.navCtrl.push(ViewTripsPage);
  }

  // hidden for now from ui
  ble() {
    console.log("View BLE");
    this.navCtrl.push(BlePage);
  }


  // this is called for a pending trip that was not uploaded to the cloud
  uploadPending(name) {
    console.log("Trying to upload " + name);
    this.upload(this.currentTripName)
      .then(succ => {
        console.log("all good with upload");
        this.db.setPendingUpload(false);
        this.pendingUpload = false;
      })
      .catch(err => {
        console.log("home bubble up: pending upload failed");
        this.db.setPendingUpload(true, this.currentTripName);

        this.pendingUpload = true;

      })


  }
  // uploads file to firebase
  upload(name): Promise<any> {
    console.log("upload");
    return this.db.doAuthWithPrompt()
      .then(succ => {
        return this.db.uploadDataToFirebase(name, this.progress);
      })
  }

  // called by start/stop trip
  toggleButtonState() {
    this.logState = (this.logState == 'Start') ? 'Stop' : 'Start';
    this.stateColor = (this.logState == 'Start') ? 'primary' : 'danger';
  }

  // pauses recording without stopping trips
  togglePause() {
    this.pause = !this.pause;
    this.pauseColor = (this.pauseColor == 'secondary') ? 'primary' : 'secondary';
  }


// callback handlers for subscription data
 accDataReceived(data) {
   // console.log ("acc data:"+JSON.stringify(data));

    /*if (this.isRelative){

      //console.log ("Relative comp");

      data.relX =data.x - this.oldSensorVals.acc.x;
      data.relY =data.y - this.oldSensorVals.acc.y;
      data.relZ  =data.z  - this.oldSensorVals.acc.z;

      this.oldSensorVals.acc.x = data.x;
      this.oldSensorVals.acc.y = data.y;
      this.oldSensorVals.acc.z = data.z;
    }*/

    this.processCharts(data, this.charts.accChart, 'acc');
  
  }

    gyroDataReceived(data) {
   // console.log ("gyr data:"+JSON.stringify(data));

    /*if (this.isRelative){
            data.relX =data.x - this.oldSensorVals.gyr.x;
            data.relY =data.y - this.oldSensorVals.gyr.y;
            data.relZ  =data.z  - this.oldSensorVals.gyr.z;
      
            this.oldSensorVals.gyr.x = data.x;
            this.oldSensorVals.gyr.y = data.y;
            this.oldSensorVals.gyr.z = data.z;
          }*/
    this.processCharts(data, this.charts.gyroChart, 'gyro');

  }

  gpsDataReceived(data) {
     // console.log ("GPS"+JSON.stringify(data));
         if (data.coords) {
          // this is meters per sec, convert to mph
          this.speed = data.coords.speed * 2.23694;
          if (this.isLogging()) {
            if (!this.logCoords) { // mask lat/long
              data.coords.latitude = 0;
              data.coords.longitude = 0;
              data.coords.altitude = 0;

            } 
            this.storeLog('gps', data.coords);
          }
        }
  }

  // init code to start a trip
  startTrip() {
    this.pause = false;
    this.pauseColor = 'secondary';
    this.moveCount = 0;
    //this.isRelative = false;

    this.oldSensorVals = {
      acc: {x:0, y:0, z:0},
      gyr: {x:0, y:0, z:0},

    };
    
    let im = this.modal.create(AlertModalPage, {}, { cssClass: "alertModal", enableBackdropDismiss: false });
    im.onDidDismiss(data => {
      console.log("RETURNED: " + JSON.stringify(data));

      if (data.isCancelled == false) {
        //this.isRelative = data.isRelative;
        this.logCoords = data.xy;
        this.clearArray(); // remove array
        this.db.deleteLog() // remove log file
          .then(_ => {
            // start new log and start trip
            this.currentTripName = data.name || 'unnamed trip';
            this.startTripHeader(this.currentTripName);
            this.toggleButtonState();
            this.utils.presentToast("trip recording started");
            this.sensors.startAndStreamSensors(this.accDataReceived.bind(this), this.gyroDataReceived.bind(this), this.gpsDataReceived.bind(this))
            this.utils.startTimer(this.timer);
            // make sure screen stays awake
            this.insomnia.keepAwake()
              .then((succ) => { console.log("Wakelock acqusition OK") })
              .catch((err) => { this.utils.presentToast("could not grab wakelock, screen will dim", "error"); });
          })
          .catch(err => { this.utils.presentToast('problem removing log file', 'error'); })
      }

    })
    im.present();
  }

  // aborts a trip without saving 
  abortTrip() {
    console.log("Inside abort trip");

    this.utils.stopTimer(this.timer);
    this.toggleButtonState();
    this.sensors.stopAllSensors();
    this.insomnia.allowSleepAgain()
      .then((succ) => { console.log("*** WAKE LOCK RELEASED OK **") })
      .catch((err) => { console.log("Error, releasing wake lock:" + err) });
    this.db.setPendingUpload(false, this.currentTripName);
    this.pendingUpload = false;
    this.utils.presentToast("Trip Aborted", "success");


  }

  // stops trip, and associated sensors
  stopTrip() {
    console.log("Inside stop trip");
    this.utils.stopTimer(this.timer);
    this.sensors.stopAllSensors();
    // make sure screen stays awake
    this.insomnia.allowSleepAgain()
      .then((succ) => { console.log("*** WAKE LOCK RELEASED OK **") })
      .catch((err) => { console.log("Error, releasing wake lock:" + err) });

    try {
      this.flushLog(true).then(_ => {
        let str = "]}\n";
        console.log("STOPPING TRIP, writing " + str);
        this.db.writeString(str);
        this.clearArray();
        this.toggleButtonState();
        this.utils.presentToast("trip recording stopped");
        this.upload(this.currentTripName)
          .then(succ => {
            console.log("all good with upload");
            this.db.setPendingUpload(false);
            this.pendingUpload = false;
          })
          .catch(err => {
            console.log("home bubble up: upload failed in stop trip");
            console.log(JSON.stringify(err));
            this.db.setPendingUpload(true, this.currentTripName);
            this.pendingUpload = true;

          })

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
    this.db.writeString(str)
      .then(resp => { })
      .catch(e => { "ERROR:" + e });

  }

  // given a sensor object, updates graph and log 
   processCharts = function (object, chart, type): Promise <boolean> {
    //console.log ("--- process start ---");
    return new Promise ((resolve,reject) => {
    //console.log ("Inside process with "+ JSON.stringify(object))
    if (!this.dirty) { // let's make sure there is no race when chart is re-creating
      
      // I don't think zone.run will work here
      // we need time for the view to render first?
      setTimeout(() => {
        chart.data.datasets[0].data.push(object.x);
        chart.data.datasets[1].data.push(object.y);
        chart.data.datasets[2].data.push(object.z);
        chart.data.labels.push("");

        chart.data.datasets[0].data.shift();
        chart.data.datasets[1].data.shift();
        chart.data.datasets[2].data.shift();
        chart.data.labels.shift();
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
    resolve (true);

    });

  }


  // this adds 'events' to the log. Use it for analysis - before you perform an action
  // you want to train, set an appropriate marker
  // allow marker even if paused. if paused, start.
  setMarker(str) {
    this.storeLog('Marker', str);
    this.utils.presentToast(str + ' marker set', 'success', 1500);
    // restart recording if paused
    if (!this.isLogging()) this.togglePause();
  }

  // uses speech recognition - may not be accurate words, so lets differentiate
  setSpeechMarker(str) {
    str = this.speechSanitize(str);
    console.log("SPEECH MARKER " + str);
    this.storeLog('SpeechMarker', str);
    this.utils.presentToast(str + ' marker set', 'success', 1500);
    // restart recording if paused
    if (!this.isLogging()) this.togglePause();
  }

  // corrects some common speech snafus
  // will heavily depend on accent
  speechSanitize(str) {
    let s = str.toLowerCase();
    let fuzzy = this.myFuse.search(s);

    if (!fuzzy.length) {
      console.log("Fuzzy search failed, going with manual sanitization");
      s = s.replace("heartbreak", "hard brake");
      s = s.replace(/break/g, "brake");
      s = s.replace(/heart/g, "hard");
      s = s.replace(/speed up/g, "speedup");
      s = s.replace(/ /g, "-");
    }
    else {
      s = fuzzy[0]["val"];
      console.log("Fuzzy returned: " + s);
    }


    console.log("FUZE");
    console.log(this.myFuse.search(str));
    return s;

  }


  // shares latest trip
  share() {
    let f = this.db.logFileLocation();
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


  flushLog(removeLastComma = false) {
    console.log(">>>>>>>Flushing logs...");
    return this.db.writeLog(this.logs, removeLastComma);
  }


  isLogging(): boolean {
    return this.logState == 'Stop' && this.pause == false;
  }


  // before trip is started, lets check if there is a pending trip to upload
  checkPendingUpload(): Promise<any> {
    return new Promise((resolve, reject) => {

      console.log("PENDING = " + this.pendingUpload);

      if (this.pendingUpload) {
        let alert = this.alert.create({
          title: 'Confirm',
          message: 'This will delete current unsaved trip',
          buttons: [
            {
              text: 'Cancel',
              handler: () => {
                console.log('Cancel clicked');
                reject(false);
              }
            },
            {
              text: 'Ok',
              handler: () => {
                console.log ("Resolving true");
                resolve(true);

              }
            }
          ]
        });
        alert.present();
      }
      else {
        resolve(true);
      }
    })

  }

  // called by UI
  toggleTrip() {
    if (this.logState == 'Stop') {
      // write to file if stopped
      this.stopTrip();
    }


    if (this.logState == 'Start') {
      this.checkPendingUpload()
        .then(succ => this.startTrip())
        .catch(err => console.log("Not starting a trip "+ JSON.stringify(err)))
    }
  }

  clearArray() {
    this.logs = [];
    this.logRows = 0;
  }

  // not used  - I removed delete - no sense now that logs are not cumulative
  confirmDelete() {
    let alert = this.alert.create({
      title: 'Confirm Deletion',
      message: 'This will permanently delete all stored trips',
      buttons: [
        {
          text: 'Cancel',
          handler: () => {
            console.log('Cancel clicked');
          }
        },
        {
          text: 'Ok',
          handler: () => {
            this.utils.presentToast("clearing log file");
            this.clearArray();
            this.db.deleteLog();

          }
        }
      ]
    });
    alert.present();
  }


  rawClicked() {
    console.log("raw clicked");
  }
  // given that DOM elements are removed on switching segments
  // we need to redraw/reattach charts

  chartClicked() {
    //this.utils.presentLoader("charting graph..");
    /*
    this.dirty = true;
    
    setTimeout(() => {
      console.log("re-drawing chart..");
      this.charts.accChart.destroy();
      this.charts.gyroChart.destroy();
      this.createChart(this.charts, this.accCanvas.nativeElement, 'acc', 'Accelerometer');
      this.createChart(this.charts, this.gyroCanvas.nativeElement, 'gyro', 'Gyroscope');
      ;
      this.utils.removeLoader();
    }, 500);*/
  }

  // instantiates charts. Generic function to handle different chart objects
  createChart(charthandle, elem, type, title = '') {
    console.log("*** Creating Chart");
    let chart;


     chart = new Chart(elem, {

      type: 'line',
      data: {
        labels: new Array(20).fill(""),
        datasets: [
          {
            label: 'X',
            data: new Array(20).fill(0),
            borderColor: '#ad2719',
            backgroundColor: 'rgba(231, 76, 60,0.4)',
            borderWidth: 2,
            fill: true,
          },
          {
            label: 'Y',
            data: new Array(20).fill(0),
            borderColor: '#148744',
            backgroundColor: 'rgba(39, 174, 96,0.4)',
            borderWidth: 2,
            fill: true,
          },

          {
            label: 'Z',
            data: new Array(20).fill(0),
            borderColor: 'rgba(142, 68, 173,1.0)',
            backgroundColor: 'rgba(155, 89, 182,0.3)',
            borderWidth: 2,
            fill: true,
          },
        ]
      },
      options: {
        title: {
          display: true,
          text: title,
        },
        responsive: true,
        
      animation: {
        duration: 100,
        easing: 'linear'
      },
      
        scales: {
          xAxes: [{
            gridLines: {
              color: "##7f8c8d",
            },
          }],

          yAxes: [{
            display: true,
            gridLines: {
              color: "##7f8c8d",
            },
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

  ionViewDidEnter() {
    this.plt.ready().then(() => {
      this.utils.getRemoteVersion()
        .then(ver => {
          this.remoteVer = ver;
          let localver = this.utils.getVersion();
          console.log(`remote: ${this.remoteVer}, local: ${localver}`);
          let c = this.utils.versionCompare(localver, this.remoteVer);
          if (c == -1) this.isOutdated = true;

          this.createChart(this.charts, this.accCanvas.nativeElement, 'acc', 'Accelerometer');
          this.createChart(this.charts, this.gyroCanvas.nativeElement, 'gyro', 'Gyroscope');
        })
    })
  }

}
