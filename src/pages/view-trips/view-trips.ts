import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { CommonUtilsProvider } from '../../providers/common-utils/common-utils';
import * as firebase from 'firebase/app';
import 'firebase/storage';
import { NgZone } from '@angular/core';
import { SocialSharing } from '@ionic-native/social-sharing';
import { ItemSliding } from 'ionic-angular';
import { InAppBrowser } from '@ionic-native/in-app-browser';



@Component({
  selector: 'page-view-trips',
  templateUrl: 'view-trips.html',
})
export class ViewTripsPage {
  trips:any[] = [];


  constructor(public navCtrl: NavController, public navParams: NavParams, public utils:CommonUtilsProvider, public zone:NgZone, public socialSharing:SocialSharing, public iab:InAppBrowser) {

  }

  displayTrip(trip,slider) {
     slider.close();
     this.utils.presentLoader("loading trip...");
     const browser = this.iab.create(trip.url, "_blank", "enableViewPortScale=yes,closebuttoncaption=Done");

     browser.on('loadstop').subscribe( resp => {console.log ("STOP");this.utils.removerLoader()});
     browser.on('loaderror').subscribe( resp => {console.log ("ERROR");this.utils.removerLoader()});


     //browser.close();

  }

  share(trip,slidingItem:ItemSliding) {
    let f = trip.url;
    let options = {
      subject: trip.name+' trip logs',
      message: 'Trip logs attached',
      files: [f],
      chooserTitle: 'Share via...'
    };

    slidingItem.close();

    this.socialSharing.shareWithOptions(options).then(() => {

    }).catch(() => {
      this.utils.presentToast('Error sharing', 'error');
    });
  }


  cloudGetTrips() {
     this.utils.presentLoader ("retrieving trips...",60000);
     let ref = firebase.database().ref('tripDataIndex/');
     let ltrips:any[] = [];
     ref.limitToLast(100).on('value', (snapshot) => {
      // console.log(snapshot.val());
     
       let result = snapshot.val();
       //console.log (JSON.stringify(result));
       for (let k in result) {
        ltrips.unshift({
          id: k,
          url: result[k].url,
          date: result[k].uploadedon,
          uploadedby: result[k].uploadedby,
          name:result[k].name,
          version: result[k].version

        });

        //console.log ("PUSHING: "+ JSON.stringify(ltrips[0]))
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


