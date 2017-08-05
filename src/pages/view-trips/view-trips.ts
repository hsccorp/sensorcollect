import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { CommonUtilsProvider } from
  '../../providers/common-utils/common-utils';
import { DatabaseProvider } from '../../providers/database/database';

import { NgZone } from '@angular/core';
import { SocialSharing } from '@ionic-native/social-sharing';
import { ItemSliding } from 'ionic-angular';
import { InAppBrowser } from '@ionic-native/in-app-browser';
import { AngularFireDatabase, FirebaseListObservable } from 'angularfire2/database';

@Component({
  selector: 'page-view-trips',
  templateUrl: 'view-trips.html',
})
export class ViewTripsPage {
  trips: FirebaseListObservable<any[]>;
  status = { text: "loading trips..." };

  constructor(public navCtrl: NavController, public navParams: NavParams, public utils: CommonUtilsProvider, public zone: NgZone, public socialSharing: SocialSharing, public iab: InAppBrowser, public db: DatabaseProvider) {
  }

  // displays the trip log in a new window
  displayTrip(trip, slider) {
    slider.close();
    this.utils.presentLoader("loading trip...");
    const browser = this.iab.create(trip.url, "_blank", "enableViewPortScale=yes,closebuttoncaption=Done");
    browser.on('loadstop').subscribe(resp => { console.log("STOP"); this.utils.removeLoader() });
    browser.on('loaderror').subscribe(resp => { console.log("ERROR"); this.utils.removeLoader() });
  }

  // tbd - this view already logs in, so relogin on 
  // delete likely not necc. need to read up on 
  // session validity
  delete(trip, si) {
    si.close();

    // make sure you are logged in as the same user
    // as the trip you want to delete. ideally, this should
    // be at the firebase auth layer. Maybe someday.
    if (trip.uploadedby != this.db.getCachedUser().email && this.db.getCachedUser().email != "arjun@hsc.com") {
      this.utils.presentToast("Trip not uploaded by you", "error", 3000);
      return;
    }
    let sref = trip.storageRef;
    this.trips.remove(trip.$key);
    this.db.removeTripStorage(sref);
  }

  // social sharing for the selected trip
  share(trip, slidingItem: ItemSliding) {
    let f = trip.url;
    let options = {
      subject: trip.name + ' trip logs',
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


  // iterates firebase and retrieves last 300 trips
  // should be enough

  // TBD: Handle offline error
  cloudGetTrips() {
    
    this.trips = this.db.getTripsInDB();

    this.trips
      .subscribe(items => {
        console.log("***CHANGED***");
        //console.log (JSON.stringify(items));
        this.utils.removeLoader();
      })
  }


  // authenticates and then downloads
  cloudGetTripsWithAuth() {
    this.db.doAuthWithPrompt()
      .then(succ => { this.cloudGetTrips() })
      .catch(err => { });
  }

  ionViewDidEnter() {
     console.log('ionViewDidEnter ViewTripsPage');
     this.utils.presentLoader("retrieving trips...", 60000);
    this.cloudGetTripsWithAuth();


  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad ViewTripsPage');
    
  }

}


