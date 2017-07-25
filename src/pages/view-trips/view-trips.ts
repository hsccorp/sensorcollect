import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { CommonUtilsProvider } from '../../providers/common-utils/common-utils';
import * as firebase from 'firebase/app';
import 'firebase/storage';
import { NgZone } from '@angular/core';

/**
 * Generated class for the ViewTripsPage page.
 *
 * See http://ionicframework.com/docs/components/#navigation for more info
 * on Ionic pages and navigation.
 */

@Component({
  selector: 'page-view-trips',
  templateUrl: 'view-trips.html',
})
export class ViewTripsPage {
  trips:any[] = [];


  constructor(public navCtrl: NavController, public navParams: NavParams, public utils:CommonUtilsProvider, public zone:NgZone) {

  }


  cloudGetTrips() {
     let ref = firebase.database().ref('tripDataIndex/');
     let ltrips:any[] = [];
     ref.on('value', (snapshot) => {
      // console.log(snapshot.val());
      this.utils.presentLoader ("retrieving trips...",-1);
       let result = snapshot.val();
       //console.log (JSON.stringify(result));
       for (let k in result) {
        ltrips.push({
          id: k,
          url: result[k].url,
          date: result[k].uploadedon
        });

        console.log ("PUSHING: "+ JSON.stringify(ltrips[0]))
      }
      this.zone.run(() => {
        this.trips = ltrips;
        this.utils.removerLoader();
      })

     });
  }

  cloudGetTripsWithAuth() {

    this.utils.doAuthWithPrompt()
    .then (succ => {this.cloudGetTrips()})
    .catch (err => {});
  }


  ionViewDidLoad() {
    console.log('ionViewDidLoad ViewTripsPage');
    this.cloudGetTripsWithAuth();
  }

}


