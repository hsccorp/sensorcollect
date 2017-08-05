import { Component, ViewChild } from '@angular/core';
import { NavController, ModalController, Platform } from 'ionic-angular';
import { DeviceMotion, DeviceMotionAccelerationData } from '@ionic-native/device-motion';
import { Gyroscope, GyroscopeOrientation } from '@ionic-native/gyroscope';
import { Geolocation } from '@ionic-native/geolocation';
import { SocialSharing } from '@ionic-native/social-sharing';
import { Chart } from 'chart.js';
import { AndroidPermissions } from '@ionic-native/android-permissions';
import { Insomnia } from '@ionic-native/insomnia';
import { CommonUtilsProvider } from '../../providers/common-utils/common-utils';
import { DatabaseProvider } from '../../providers/database/database';
import { AlertController } from 'ionic-angular';
import { ViewTripsPage } from "../view-trips/view-trips";
import { AlertModalPage } from "../alert-modal/alert-modal";
import { BlePage } from "../ble/ble";
import { SpeechRecognition, SpeechRecognitionListeningOptionsAndroid, SpeechRecognitionListeningOptionsIOS } from '@ionic-native/speech-recognition';

import * as Fuse from 'fuse.js';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})

export class HomePage {
  // will hold subscriptions to sensors
  gpsSub: any = null;
  accSub: any = null;
  gyrSub: any = null;

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
  pause: boolean = false; // true if recording paused
  pauseColor: string = 'dark';
  stateColor: string = 'primary'; // button color
  logs: any[] = []; // will hold history of acc + gyr data
  logRows: number = 0;
  freq: number = 500; // sampling freq for gps/gyr
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
  constructor(public navCtrl: NavController, public deviceMotion: DeviceMotion, public plt: Platform, public gyroscope: Gyroscope, public socialSharing: SocialSharing, public insomnia: Insomnia, private geo: Geolocation, public perm: AndroidPermissions, public utils: CommonUtilsProvider, public alert: AlertController, public modal: ModalController, public speech: SpeechRecognition, public db: DatabaseProvider) {
    //, 

    plt.ready().then(() => {
      this.db.init();
      this.db.getPendingUpload() // do we have a trip that did not upload?
        .then(succ => { this.pendingUpload = succ.status; this.currentTripName = succ.name; console.log("PENDING RETURNED " + JSON.stringify(succ)); })
      this.createChart(this.charts, this.accCanvas.nativeElement, 'acc', 'Accelerometer');
      this.createChart(this.charts, this.gyroCanvas.nativeElement, 'gyro', 'Gyroscope');

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
    this.utils.presentToast ("cleared user");

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
          if (this.isLogging()) {
            if (!this.logCoords) {
              data.coords.latitude = 0;
              data.coords.longitude = 0;
              data.coords.altitude = 0;

            }
            this.storeLog('gps', data.coords);
          }
        }
      });
  }

  // called by start/stop trip
  toggleButtonState() {
    this.logState = (this.logState == 'Start') ? 'Stop' : 'Start';
    this.stateColor = (this.logState == 'Start') ? 'primary' : 'danger';
  }

  // pauses recording without stopping trips
  togglePause() {
    this.pause = !this.pause;
    this.pauseColor = (this.pauseColor == 'dark') ? 'primary' : 'dark';
  }

  // init code to start a trip
  startTrip() {
    this.pause = false;
    this.pauseColor = 'dark';
    this.moveCount = 0;

    let im = this.modal.create(AlertModalPage, {}, { cssClass: "alertModal", enableBackdropDismiss: false });
    im.onDidDismiss(data => {
      console.log("RETURNED: " + JSON.stringify(data));
      if (data.isCancelled == false) {
        this.logCoords = data.xy;
        this.clearArray(); // remove array
        this.db.deleteLog() // remove log file
          .then(_ => {
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
    this.stopAllSensors();
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
    this.stopAllSensors();
    // make sure screen stays awake
    this.insomnia.allowSleepAgain()
      .then((succ) => { console.log("*** WAKE LOCK RELEASED OK **") })
      .catch((err) => { console.log("Error, releasing wake lock:" + err) });

    try {
      this.flushLog().then(_ => {
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
  process(object, chart, type) {
    if (!this.dirty) { // let's make sure there is no race when chart is re-creating
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
      // I don't think zone.run will work here
      // we need time for the view to render first?
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


  flushLog() {
    console.log(">>>>>>>Flushing logs...");
    return this.db.writeLog(this.logs);
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
        .catch(_ => console.log("Not starting a trip"))
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

  // given that DOM elements are removed on switching segments
  // we need to redraw/reattach charts

  segmentClicked() {
    this.utils.presentLoader("charting graph..");
    this.dirty = true;
    this.charts.accChart.destroy();
    this.charts.gyroChart.destroy();
    setTimeout(() => {
      console.log("re-drawing chart..");
      this.createChart(this.charts, this.accCanvas.nativeElement, 'acc', 'Accelerometer');
      this.createChart(this.charts, this.gyroCanvas.nativeElement, 'gyro', 'Gyroscope');
      ;
      this.utils.removeLoader();
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
    this.plt.ready().then(() => {
      this.utils.getRemoteVersion()
        .then(ver => {
          this.remoteVer = ver;
          let localver = this.utils.getVersion();
          console.log(`remote: ${this.remoteVer}, local: ${localver}`);
          let c = this.utils.versionCompare(localver, this.remoteVer);
          if (c == -1) this.isOutdated = true;
        })
    })
  }

}
