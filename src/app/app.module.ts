import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule } from '@angular/core';
import { IonicApp, IonicErrorHandler, IonicModule } from 'ionic-angular';
import { SplashScreen } from '@ionic-native/splash-screen';
import { StatusBar } from '@ionic-native/status-bar';

import { MyApp } from './app.component';
import { HomePage } from '../pages/home/home';
import {AlertModalPage} from '../pages/alert-modal/alert-modal';
import { ViewTripsPage } from '../pages/view-trips/view-trips';

import { DeviceMotion } from '@ionic-native/device-motion';
import { Gyroscope } from '@ionic-native/gyroscope';
import { SocialSharing } from '@ionic-native/social-sharing';
import { Insomnia } from '@ionic-native/insomnia';
import { Geolocation } from '@ionic-native/geolocation';
import { AndroidPermissions } from '@ionic-native/android-permissions';
import { CommonUtilsProvider } from '../providers/common-utils/common-utils';
import { File } from '@ionic-native/file';
import { AngularFireModule } from 'angularfire2';
import {AngularFireDatabaseModule} from 'angularfire2/database';
import { AngularFireAuthModule } from 'angularfire2/auth';

import { ProgressBarComponent } from '../components/progress-bar/progress-bar';
import { IonicStorageModule } from '@ionic/storage';
import { InAppBrowser } from '@ionic-native/in-app-browser';
import { AppVersion } from '@ionic-native/app-version';
import { HttpModule } from '@angular/http';
//import { BLE } from '@ionic-native/ble';
//import {BlePage} from "../pages/ble/ble";
import { SpeechRecognition } from '@ionic-native/speech-recognition';
import { DatabaseProvider } from '../providers/database/database';
import { ReversePipe } from '../pipes/reverse/reverse';



// Initialize Firebase
  export const firebaseConfig = {
   apiKey: "AIzaSyCldDUKjFcG0YTS6Oj1n2kn0oT9cFQN878",
    authDomain: "tripdata-3eb84.firebaseapp.com",
    databaseURL: "https://tripdata-3eb84.firebaseio.com",
    projectId: "tripdata-3eb84",
    storageBucket: "tripdata-3eb84.appspot.com",
    messagingSenderId: "329888799939"
  };


@NgModule({
  declarations: [
    MyApp,
    HomePage,
    ViewTripsPage,
    AlertModalPage,
    ProgressBarComponent,
    //BlePage,
    ReversePipe
  ],
  imports: [
    AngularFireModule.initializeApp(firebaseConfig),
    AngularFireDatabaseModule,
    AngularFireAuthModule,
    BrowserModule,
    IonicModule.forRoot(MyApp),
    HttpModule,
    IonicStorageModule.forRoot({name:'__tripDB', driverOrder:['sqlite','websql','indexeddb']})
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    HomePage,
    ViewTripsPage,
    AlertModalPage,
    //BlePage
  ],
  providers: [
    Geolocation,
    StatusBar,
    SplashScreen,
    DeviceMotion,
    Gyroscope,
    SocialSharing,
    Insomnia,
    AndroidPermissions,
    CommonUtilsProvider,
    File,
    InAppBrowser,
    AppVersion,
    //BLE,
    SpeechRecognition,
    {provide: ErrorHandler, useClass: IonicErrorHandler},
    DatabaseProvider
  ]
})
export class AppModule {}
