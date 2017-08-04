import { Component } from '@angular/core';
import { NavController, NavParams, ViewController } from 'ionic-angular';

// Styled modal that can replace an alert controller
// had to do this because alerts do not support a mix of input types

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
