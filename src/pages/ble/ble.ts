import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { BLE } from '@ionic-native/ble';
import { NgZone } from '@angular/core';

/**
 * Generated class for the BlePage page.
 *
 * See http://ionicframework.com/docs/components/#navigation for more info
 * on Ionic pages and navigation.
 */

@Component({
  selector: 'page-ble',
  templateUrl: 'ble.html',
})
export class BlePage {

  isScanning:boolean = false;
  devices = [];

  constructor(public navCtrl: NavController, public navParams: NavParams, public ble: BLE, public zone:NgZone) {
  }

  contains(a, obj) {
    for (var i = 0; i < a.length; i++) {
        if (a[i].id == obj.id) {
            return true;
        }
    }
    return false;
}

  startScan(){
    this.isScanning = true;
    this.devices = [];
    this.ble.startScan([]).subscribe (device=> {
      console.log ("GOT:"+JSON.stringify(device));
      if (!this.contains(this.devices, device)) {
        this.zone.run(() => {
        this.devices.push(device);
        });

      }
         
    });

    setTimeout ( () => { console.log ("Timer");this.stopScan()},20000)

  
 }

 stopScan(){

    // handles timeout fake calls
    if (this.isScanning ==false) return;

    this.isScanning = false;
    this.ble.stopScan()
    .then ( data => {
      console.log ("Scan Stopped");
    })
    .catch (err => {console.log ("Error stopping scan")});
 }

connect(device) {

  this.ble.connect(device.id)
  .subscribe(res=>{
    console.log ("Success:"+JSON.stringify(res))
  }, 
  err=>{
    console.log ("Error:"+JSON.stringify(err))
  })

}

  ionViewDidLoad() {
    console.log('ionViewDidLoad BlePage');
  }

}
