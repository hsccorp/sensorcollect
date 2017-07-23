import { Injectable } from '@angular/core';
import { ToastController, LoadingController } from 'ionic-angular';
import { File } from '@ionic-native/file';
import { Observable } from 'rxjs/Rx';
import * as moment from 'moment';
import { AngularFireDatabaseModule, AngularFireDatabase, FirebaseListObservable } from 'angularfire2/database';
import * as firebase from 'firebase/app';
import 'firebase/storage';

//declare var firebase: any;

@Injectable()
export class CommonUtilsProvider {

  loader:any;
  logFile:string = 'triplog.txt';
  timer:any;
  

  constructor(public toastCtrl: ToastController,public loadingCtrl: LoadingController, public file:File,  public db: AngularFireDatabase) {
   
  }

  // pass -1 to dur for infinite
  presentLoader(text, dur=6000,remove=true) {

    if (this.loader && remove) {this.loader.dismiss();}
    this.loader = this.loadingCtrl.create ({
      content:text,
      duration:dur
    });
    this.loader.present();
  }

  removerLoader() {
    if (this.loader) {this.loader.dismiss();}
  }

  // wrapper to present a toast with different colors
  // error = red
  // any other val = green
  presentToast(text, type?, dur?) {

    var cssClass = 'successToast';
    if (type == 'error') cssClass = 'errorToast';

    let toast = this.toastCtrl.create({
      message: text,
      duration: dur || 1800,
      position: 'top',
      cssClass: cssClass
    });
    toast.present();
  }

  initLog() {
      this.file.checkFile(this.file.dataDirectory,this.logFile)
      .then(succ=>{console.log("log file exists");})
      .catch(_=>{console.log ("**CREATING LOG"); this.file.createFile(this.file.dataDirectory, this.logFile, true)});
  } 

  writeString(str) {
      console.log (this.file.dataDirectory+" "+this.logFile+" "+ str);
    return this.file.writeFile(this.file.dataDirectory,this.logFile,str, {replace:false, append:true});
  }

  writeLog(logs_object) {
    // don't JSON stringify as these are chunks

    let str = "";
    for (let i=0; i < logs_object.length; i++) {
        str = str + "              "+JSON.stringify(logs_object[i])+","+"\n";
    }
    
    return this.file.writeFile(this.file.dataDirectory,this.logFile,str,{replace:false, append:true});

  }

  logFileLocation() {
      return this.file.dataDirectory + this.logFile;
  }

  deleteLog() {
     
      this.presentToast("clearing log file");
      return this.file.writeFile(this.file.dataDirectory,"triplog.txt","",{replace:true});
  }

  startTimer(timer) {
    
    this.timer = Observable.interval(1000)
    .subscribe(x=>{timer.time = "("+moment.utc(x*1000).format("HH:mm:ss")+")";});
  }

   stopTimer(timer) {
    
    this.timer.unsubscribe();
    timer.time = "";
  }

  cloudUpload(prg) {
    console.log ("cloud upload");
    //this.presentLoader("loading...");
    let storageRef = firebase.storage().ref();
    console.log ("storage ref is "+storageRef);
    this.file.readAsArrayBuffer(this.file.dataDirectory, this.logFile)
    .then (succ=>{
      console.log ("File read");
      let blob = new Blob([succ],{type:"text/plain"});
      console.log ("Blob  created");
      let name = "file-"+Date()+".txt";
      let uploadTask = storageRef.child(`tripdata/${name}`).put(blob); 
      uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED,
        (snapshot) => {
          let progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          prg.val = progress;
          //this.presentLoader(`uploading:${progress}%`,60000,false);
          
        },
        (error) => {console.log ("Firebase put error "+error);prg.val = -1; this.presentToast("upload error","error") },
        () => {prg.val = -1; this.presentToast("upload complete")}
      )

    })

    .catch (err=>{console.log ("Cordova Read Error "+err);})

  }

}