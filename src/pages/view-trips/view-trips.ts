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
  trips: any[] = [];


  constructor(public navCtrl: NavController, public navParams: NavParams, public utils: CommonUtilsProvider, public zone: NgZone, public socialSharing: SocialSharing, public iab: InAppBrowser) {
  }

  // displays the trip log in a new window
  displayTrip(trip, slider) {
    slider.close();
    this.utils.presentLoader("loading trip...");
    const browser = this.iab.create(trip.url, "_blank", "enableViewPortScale=yes,closebuttoncaption=Done");

    browser.on('loadstop').subscribe(resp => { console.log("STOP"); this.utils.removerLoader() });
    browser.on('loaderror').subscribe(resp => { console.log("ERROR"); this.utils.removerLoader() });


  }

  // tbd - this view already logs in, so relogin on 
  // delete likely not necc. need to read up on 
  // session validity
  delete(trip, si) {
    si.close();

    // make sure you are logged in as the same user
    // as the trip you want to delete. ideally, this should
    // be at the firebase auth layer. Maybe someday.
    if (trip.uploadedby != this.utils.getCachedUser().email) {
      this.utils.presentToast("Trip not uploaded by you", "error", 3000);
      return;
    }
    // remove the DB index
    let ref = firebase.database().ref('tripDataIndex/');
    ref.child(trip.id).remove()
      .then(succ => this.utils.presentToast("trip deleted"))
      .catch(err => {
        this.utils.presentToast("error deleting trip", "error");
        console.log("Error:" + JSON.stringify(err));
      })


    // also delete the actual log file associated to the DB
    let sref = firebase.storage().ref().child(trip.storageRef);
    sref.delete()
      .then(succ => { console.log("Storage deleted too"); })
      .catch(err => { console.log("Error deleting storage:" + JSON.stringify(err)) })

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

  cloudGetTrips() {
    this.utils.presentLoader("retrieving trips...", 60000);
    let ref = firebase.database().ref('tripDataIndex/');
    let ltrips: any[] = [];

    // any time data changes, this event will be called
    // so deletions are automatically taken care of
    ref.limitToLast(300).on('value', (snapshot) => {
      let result = snapshot.val();
      //console.log (JSON.stringify(result));
      for (let k in result) {
        ltrips.unshift({
          id: k,
          url: result[k].url,
          date: result[k].uploadedon,
          uploadedby: result[k].uploadedby,
          name: result[k].name,
          version: result[k].version,
          storageRef: result[k].storageRef
        });

      }
      // the array update can occur outside Angular's refresh digest
      this.zone.run(() => {
        this.trips = ltrips;
        this.utils.removerLoader();
      })

    });
  }

  // authenticates and then downloads
  cloudGetTripsWithAuth() {
    this.utils.doAuthWithPrompt()
      .then(succ => { this.cloudGetTrips() })
      .catch(err => { });
  }


  ionViewDidLoad() {
    console.log('ionViewDidLoad ViewTripsPage');
    this.cloudGetTripsWithAuth();
  }

}


