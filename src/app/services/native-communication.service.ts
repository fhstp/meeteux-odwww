import {Inject, Injectable} from '@angular/core';
import { GodService } from './god.service';
import {LocationService} from './location.service';
import {LocationActions} from '../actions/LocationActions';
import { WindowRef } from '../WindowRef';

@Injectable()
export class NativeCommunicationService {
  public registerName: string;
  public isIOS = true;
  public isAndroid = false;
  public isWeb = false;

  constructor(
    private godService: GodService,
    private locationService: LocationService,
    @Inject('AppStore') private appStore,
    private locationActions: LocationActions,
    private winRef: WindowRef
  ) {}

  public transmitODRegister(result: any): void
  {
    const deviceAddress: string = result.deviceAddress;
    const deviceOS: string = result.deviceOS;
    const deviceVersion: string = result.deviceVersion;
    const deviceModel: string = result.deviceModel;

    const data = {identifier: this.registerName, deviceAddress, deviceOS, deviceVersion, deviceModel};
    this.godService.registerOD(data);
  }

  public transmitLocationRegister(result: any)
  {
    const minor: number = result.minor;
    const location = this.locationService.findLocation(minor);

    if (!location)
    {
      this.sendToNative('this is not a valid location', 'print');
      return;
    }

    // location is not the same as before
    if (!this.locationService.sameAsCurrentLocation(location.id))
    {
      if (this.locationService.currentLocation && this.locationService.currentLocation.locationTypeId === 2)
      {
        this.sendToNative('this is not a valid location - type 2', 'print');
        return;
      }

      const state = this.appStore.getState();
      const exhibitParentId = state.atExhibitParentId;
      const onExhibit = state.onExhibit;
      
      this.sendToNative('new valid location found - check and registerLocation at GoD', 'print');

      if ((location.locationTypeId !== 2 && !onExhibit) || (location.locationTypeId === 2 && exhibitParentId === location.parentId))
      {
        if (location.locationTypeId === 2)
        {
          this.godService.checkLocationStatus(location.id, res => {
            if (res === 'FREE')
            {
              this.godService.registerLocation(location.id);
              this.appStore.dispatch(this.locationActions.changeLocationSocketStatus(res));
            }
            else
            {
              this.appStore.dispatch(this.locationActions.changeLocationSocketStatus(res));
            }
          });
        }
        else
        {
          this.godService.registerLocation(location.id);
        }
      }
    }
  }

  // handels console.log - sends to native console if iOS || Android
  public sendToNative(messageBody, messageName){
    if (this.isWeb)
    {
      console.log(messageBody);
    }

    if (this.isIOS)
    {
      switch (messageName) {
        case 'print':
          this.winRef.nativeWindow.webkit.messageHandlers.print.postMessage(messageBody);
          break;
      
        case 'getDeviceInfos':
          this.winRef.nativeWindow.webkit.messageHandlers.getDeviceInfos.postMessage(messageBody);
          break;
        
        case 'registerOD':
          this.winRef.nativeWindow.webkit.messageHandlers.registerOD.postMessage(messageBody);
          break;

        case 'triggerSignal':
          this.winRef.nativeWindow.webkit.messageHandlers.triggerSignal.postMessage(messageBody);
          break;

        default:
          break;
      }
    }

    if (this.isAndroid)
    {
      switch (messageName) {
        case 'print':
          this.winRef.nativeWindow.MEETeUXAndroidAppRoot.print(messageBody);
          break;
      
        case 'getDeviceInfos':
          this.winRef.nativeWindow.MEETeUXAndroidAppRoot.getDeviceInfos();
          break;
        
        case 'registerOD':
          this.winRef.nativeWindow.MEETeUXAndroidAppRoot.registerOD();
          break;

        case 'triggerSignal':
          this.winRef.nativeWindow.MEETeUXAndroidAppRoot.triggerSignal();
          break;

        default:
          break;
      }
    }
  }

  public checkPlatform(){
    const userAgent: any = window.navigator.userAgent;
    let safariCheck = false;
    let chromeCheck = false;
    let androidCheck = false;

    if (userAgent.indexOf('Safari') !== (-1))
    {
      safariCheck = true;
    }
    if (userAgent.indexOf('Chrome') !== (-1))
    {
      chromeCheck = true;
    }
    if (userAgent.indexOf('Android') !== (-1))
    {
      androidCheck = true;
    }

    if (androidCheck){
      this.isAndroid = true;
      this.isIOS = false;
      return 'Android';
    }
    else if (safariCheck || chromeCheck)
    {
      if (!androidCheck)
      {
        this.isWeb = true;
        this.isIOS = false;
        return 'Web';
      }
    }
    return 'IOS';
  }
}
