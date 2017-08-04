import { Injectable } from '@angular/core';
import { ToastController, LoadingController, AlertController } from 'ionic-angular';
import { Observable } from 'rxjs/Rx';
import * as moment from 'moment';


import { AppVersion } from '@ionic-native/app-version';
import { Platform } from 'ionic-angular';
import { Http } from '@angular/http';
import 'rxjs/add/operator/map';


const versionUrl:string = "https://raw.githubusercontent.com/hsccorp/sensorcollect/master/version.txt";

// TBD: firebase stuff is here too - need to move it out to its own service

@Injectable()
export class CommonUtilsProvider {

  loader: any;
  timer: any;
  version: string = "undefined";



  constructor(public toastCtrl: ToastController, public loadingCtrl: LoadingController, public alert: AlertController, public appVersion: AppVersion, public plt: Platform, public http:Http) {

    plt.ready().then(() => {
      this.appVersion.getVersionNumber()
        .then(ver => { this.version = ver; console.log("version=" + ver) });

    })
  }

  getRemoteVersion(): Promise <any> {
    let url = versionUrl+"?random="+Math.random();
    return new Promise((resolve, reject) => {
        this.http.get(url).map(res=>res).subscribe(data => {
            let ver = data["_body"];
            console.log ("Latest app version:"+ver);
            resolve(ver);
        },
          err => {console.log ("Latest App version error:"+JSON.stringify(err)); reject(err);}
        
      );
    });
  }

  // returns app version
  getVersion(): string {
    return this.version;
  }
  // pass -1 to dur for infinite
  presentLoader(text, dur = 6000, remove = true) {

    if (this.loader && remove) { this.loader.dismiss(); }
    this.loader = this.loadingCtrl.create({
      content: text,
      duration: dur
    });
    this.loader.present();
  }

  removeLoader() {
    if (this.loader) { this.loader.dismiss(); }
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

  


//credit: https://gist.github.com/alexey-bass/1115557
versionCompare(left, right)
{
    if (typeof left + typeof right != 'stringstring')
        return false;

    var a = left.split('.');
    var b = right.split('.');
    var i = 0;
    var len = Math.max(a.length, b.length);

    for (; i < len; i++)
    {
        if ((a[i] && !b[i] && parseInt(a[i]) > 0) || (parseInt(a[i]) > parseInt(b[i])))
        {
            return 1;
        }
        else if ((b[i] && !a[i] && parseInt(b[i]) > 0) || (parseInt(a[i]) < parseInt(b[i])))
        {
            return -1;
        }
    }

    return 0;
}

  

  // start a trip timer
  startTimer(timer) {
    this.timer = Observable.interval(1000)
      .subscribe(x => { timer.time = "(" + moment.utc(x * 1000).format("HH:mm:ss") + ")"; });
  }


  // stop trip timer
  stopTimer(timer) {
    this.timer.unsubscribe();
    timer.time = "";
  }

  

 
}