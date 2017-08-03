import { Component } from '@angular/core';
import { NavController, NavParams, ViewController } from 'ionic-angular';


/**
 * Generated class for the AlertModalPage page.
 *
 * See http://ionicframework.com/docs/components/#navigation for more info
 * on Ionic pages and navigation.
 */

@Component({
  selector: 'page-alert-modal',
  templateUrl: 'alert-modal.html',
})
export class AlertModalPage {
  inputData = {xy:true, name:"", obd:true, isCancelled:false};
  constructor(public navCtrl: NavController, public navParams: NavParams, public viewCtrl:ViewController) {
    console.log ("*** Modal constructor");
  }

  inputCancelled() {
    console.log ("Cancelled");
    this.inputData.isCancelled = true;
    this.viewCtrl.dismiss(this.inputData);
  }

  inputSubmitted() {
    console.log ("Submitted");
    console.log (JSON.stringify(this.inputData));
    this.inputData.isCancelled = false;
    this.viewCtrl.dismiss(this.inputData);
  }

 
  
  ionViewDidLoad() {
  }

}
