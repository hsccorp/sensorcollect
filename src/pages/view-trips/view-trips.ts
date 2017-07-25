import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { CommonUtilsProvider } from '../../providers/common-utils/common-utils';

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

  constructor(public navCtrl: NavController, public navParams: NavParams, public utils:CommonUtilsProvider) {
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad ViewTripsPage');
  }

}
