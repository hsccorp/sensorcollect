import { Injectable } from '@angular/core';
import { ToastController, LoadingController, AlertController } from 'ionic-angular';
import { CommonUtilsProvider } from '../common-utils/common-utils';
import { AngularFireDatabaseModule, AngularFireDatabase, FirebaseListObservable } from 'angularfire2/database';
import * as firebase from 'firebase/app';
import 'firebase/storage';
import { Storage } from '@ionic/storage';
import { File } from '@ionic-native/file';

import 'rxjs/add/operator/map';
import { Http } from '@angular/http';
import { NgZone } from '@angular/core';


@Injectable()
export class DatabaseProvider {

  logFile: string = 'triplog.txt';
  user: { email: string, password: string } = { email: '', password: '' };

  constructor(public toastCtrl: ToastController, public loadingCtrl: LoadingController, public file: File, public storage: Storage, public alert: AlertController, public utils: CommonUtilsProvider, public zone:NgZone, public http:Http, public db: AngularFireDatabase,) {
    console.log('Hello DatabaseProvider Provider');

    storage.ready().then(() => {
      console.log("Storage engine is:" + storage.driver)
    })
  }

  // create an empty log file on start if needed
  init() {
    this.file.checkFile(this.file.dataDirectory, this.logFile)
      .then(succ => { console.log("log file exists"); })
      .catch(_ => { console.log("**CREATING LOG"); this.file.createFile(this.file.dataDirectory, this.logFile, true) });

    this.getPendingUpload()
      .then(succ => {
        if (succ == undefined) {
          console.log("CLEARING PENDING");
          this.setPendingUpload(false);
        }

      })

  }

  // write a text string to the logs - used for headers
  writeString(str) {
    console.log(this.file.dataDirectory + " " + this.logFile + " " + str);
    return this.file.writeFile(this.file.dataDirectory, this.logFile, str, { replace: false, append: true });
  }

  // dump a fragment of logs to a file
  writeLog(logs_object) {
    // don't JSON stringify full array as these are chunks

    let str = "";
    for (let i = 0; i < logs_object.length; i++) {
      str = str + "              " + JSON.stringify(logs_object[i]) + "," + "\n";
    }

    return this.file.writeFile(this.file.dataDirectory, this.logFile, str, { replace: false, append: true });

  }

  removeTrip(trip) {
    // remove the DB index
    let ref = firebase.database().ref('tripDataIndex/');
    ref.child(trip.id).remove()
      .then(succ => this.utils.presentToast("trip deleted"))
      .catch(err => {
        this.utils.presentToast("error deleting trip", "error");
        console.log("Error:" + JSON.stringify(err));
      })


    // also delete the actual log file associated to the DB
    let sref = firebase.storage().ref().child(trip.storageRef);
    sref.delete()
      .then(succ => { console.log("Storage deleted too"); })
      .catch(err => { console.log("Error deleting storage:" + JSON.stringify(err)) })
  }


  listTripsDynamic(dispArr, status) {

       // any time data changes, this event will be called
    // so deletions are automatically taken care of
    this.utils.presentLoader("retrieving trips...", 60000);
    
        let ref = firebase.database().ref('tripDataIndex/');
    ref.limitToLast(300).on('value', (snapshot) => {
      let result = snapshot.val();
      let ltrips: any[] = [];
      //console.log (JSON.stringify(result));
      for (let k in result) {
      console.log ("Pushing "+result[k].name);
        ltrips.unshift({
          id: k,
          url: result[k].url,
          date: result[k].uploadedon,
          uploadedby: result[k].uploadedby,
          name: result[k].name,
          version: result[k].version,
          storageRef: result[k].storageRef
        });

      }
      // the array update can occur outside Angular's refresh digest
      this.zone.run(() => {
        dispArr.data = ltrips;
        if (!dispArr.data.length) {status.text = "No trips found"}
        this.utils.removeLoader();

      })

    },
    (error)=>{this.utils.removeLoader();this.utils.presentToast("Error accessing data","error")});

  }

  getDBIndex() {
    return firebase.database().ref('tripDataIndex/');
  }


 

  logFileLocation() {
    return this.file.dataDirectory + this.logFile;
  }

  deleteLog() {
    return this.file.writeFile(this.file.dataDirectory, "triplog.txt", "", { replace: true });
  }


  // if the app user has not provided credentials for firebase DB, this will ask
  // for it. 
  promptForPassword(): Promise<any> {
    return new Promise((resolve, reject) => {
      let alert = this.alert.create({
        title: 'Database authorization',
        message: 'Please enter database password',
        inputs: [{
          name: 'email',
          value: 'mltrainer@hsc.com',
          type: 'email'
        },
        {
          name: 'password',
          placeholder: 'Password',
          type: 'password'
        }
        ],
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
            handler: data => { reject(data) }
          },

          {
            text: 'Ok',
            handler: data => {
              console.log("Saving " + JSON.stringify(data));
              this.storage.set('user', data);
              resolve(data);

            }
          },

        ],
      });
      alert.present();
    });
  }

  // called if credentials are wrong, so user is prompted again
  clearUser() {
    console.log("clearing user");
    this.storage.remove('user')
      .catch(e => { console.log("user clear error:" + JSON.stringify(e)) });
  }

  getUser(): Promise<any> {
    return this.storage.get('user');
  }

  setPendingUpload(status, name = ""): Promise<any> {
    console.log("Pending called with " + status + " " + name);
    return this.storage.set('pendingUpload', { status: status, name: name })
  }

  getPendingUpload(): Promise<any> {
    return this.storage.get('pendingUpload')
  }

  getCachedUser() {
    return this.user;
  }

  doAuthWithPrompt(): Promise<any> {
    return this.getUser()
      .then(user => {
        console.log("Got user:" + JSON.stringify(user));
        if (user == undefined || !user.email || !user.password) {
          return this.promptForPassword()
            .then(data => {
              return this.doAuth(data.email, data.password);
            })
        }
        else {
          console.log ("doAuthWithPassword callign doAuth");
          return this.doAuth(user.email, user.password)
        };

      })
      .catch(e => { return Promise.reject(false); })

  }

  doAuth(u, p): Promise<any> {
    return new Promise((resolve, reject) => {
      console.log(`->Inside doAuth with ${u}:${p}`);
      this.user.email = u;
      this.user.password = p;
      firebase.auth().signInWithEmailAndPassword(u, p)
        .then(succ => {
          console.log("**** Signed in");
          resolve(succ);
        })
        .catch(error => {
          console.log("Auth Error:" + JSON.stringify(error));
          this.utils.presentToast(error["code"], "error");
          this.clearUser();
          reject(error);
        })

    })

  }

  // upload trip data to firebase. called by doAuth
  // after all auth validation is done
  uploadDataToFirebase(name, prg): Promise<any> {

    return new Promise((resolve, reject) => {

      console.log("cloud upload called for " + name);
      //this.presentLoader("loading...");
      let storageRef = firebase.storage().ref();
      console.log("storage ref is " + storageRef);
      return this.file.readAsArrayBuffer(this.file.dataDirectory, this.logFile)
        .then(succ => {
          console.log("File read");
          console.log(succ);
          let blob = new Blob([succ], { type: "text/plain" });
          console.log("Blob  created");
          let uploadUrl = storageRef.child(`tripdata/${name}.txt`);
          let uploadTask = uploadUrl.put(blob);
          uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED,
            (snapshot) => {
              let progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
              if (prg) prg.val = progress;
            },
            (error) => {
              console.log("Firebase put error " + JSON.stringify(error));
              setTimeout(() => { prg.val = -1; }, 500);
              this.utils.presentToast("upload error", "error")
              reject(error)
            },
            () => { // over
              prg.val = 100;
              setTimeout(() => { prg.val = -1; }, 500);
              // write download URL to realtime DB so we can iter it later
              // there is no API in storage today to iterate
              let downloadURL = uploadTask.snapshot.downloadURL;
              console.log("Download url is " + downloadURL);
              //let key = 'tripDataIndex/'+name;
              //console.log ("key="+key);
              firebase.database().ref('tripDataIndex/').push()
                .set({
                  'url': downloadURL,
                  'uploadedon': Date(),
                  'uploadedby': this.user.email,
                  'name': name,
                  'version': this.utils.getVersion(),
                  'storageRef': `tripdata/${name}.txt`
                })
                .then(succ => { this.utils.presentToast("upload complete"); resolve(succ) })
                .catch(err => { console.log("ERROR " + err); this.utils.presentToast("error creating index", "error"); reject(err) })

            }
          )
        })
        .catch(err => { console.log("Cordova Read Error " + err); reject(err) })
    }) // new promise
  }



}


