import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { BLE } from '@ionic-native/ble';
import { NgZone } from '@angular/core';
import { CommonUtilsProvider } from '../../providers/common-utils/common-utils';


// currently a shell operation - discovery only and basic connect
// need to buy a BLE adapter for OBD and then code rest

@Component({
  selector: 'page-ble',
  templateUrl: 'ble.html',
})
export class BlePage {

  isScanning: boolean = false;
  devices = [];

  constructor(public navCtrl: NavController, public navParams: NavParams, public ble: BLE,public zone: NgZone, public utils: CommonUtilsProvider) {

    console.log (">>>> Inside BLE ");   

  }


  // Initiates bluetooth discovery
  startScan() {
    this.isScanning = true;
    this.devices = [];
    this.ble.startScan([]).subscribe(device => {
      console.log("GOT:" + JSON.stringify(device));
      if (!this.utils.contains(this.devices, device)) {
        this.zone.run(() => {
          this.devices.push(device);
        });

      }

    });
    setTimeout(() => { console.log("Timer"); this.stopScan() }, 20000)
  }

  // cancels BT discovery
  stopScan() {
    // handles timeout fake calls
    if (this.isScanning == false) return;
    this.isScanning = false;
    this.ble.stopScan()
      .then(data => {
        console.log("Scan Stopped");
      })
      .catch(err => { console.log("Error stopping scan") });
  }

  // shell for now
  connect(device) {
    this.ble.connect(device.id)
      .subscribe(res => {
        console.log("Success:" + JSON.stringify(res))
      },
      err => {
        console.log("Error:" + JSON.stringify(err))
      })

  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad BlePage');
  }
}
