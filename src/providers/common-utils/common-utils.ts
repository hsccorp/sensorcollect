import { Injectable } from '@angular/core';
import { ToastController, LoadingController } from 'ionic-angular';
import { File } from '@ionic-native/file';

@Injectable()
export class CommonUtilsProvider {

  loader:any;
  logFile:string = 'triplog.txt';

  constructor(public toastCtrl: ToastController,public loadingCtrl: LoadingController, public file:File) {
   
  }

  // pass -1 to dur for infinite
  presentLoader(text, dur=6000) {

    if (this.loader) {this.loader.dismiss();}
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
}