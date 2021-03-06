import {Inject, Injectable} from '@angular/core';
import { Router } from '@angular/router';
import { WindowRef } from '../../WindowRef';
import {LocationService} from '../location.service';
import {GodSocketService} from './god-socket.service';
import {LocationActions} from '../../store/actions/LocationActions';
import {UserActions} from '../../store/actions/UserActions';
import {StatusActions} from '../../store/actions/StatusActions';
import { NativeCommunicationService } from '../native/native-communication.service';
import { AlertService } from '../alert.service';
import * as ErrorTypes from '../../config/ErrorMessageTypes';
import * as SuccessTypes from '../../config/SuccessMessageTypes';

@Injectable()
export class GodService {

  constructor(
    private router: Router,
    private winRef: WindowRef,
    private locationService: LocationService,
    private socket: GodSocketService,
    @Inject('AppStore') private store,
    private locationActions: LocationActions,
    private userActions: UserActions,
    private statusActions: StatusActions,
    private utilitiesService: NativeCommunicationService,
    private alertService: AlertService
  )
  {
    this.socket.on('news', msg =>
    {
      this.utilitiesService.sendToNative(msg, 'print');
    });

    this.socket.on('disconnect', () => {
      const error: Message = {code: ErrorTypes.LOST_CONNECTION_TO_GOD, message: 'Lost connection to Server'};
      this.store.dispatch(this.statusActions.changeErrorMessage(error));
    });

    this.socket.on('reconnect', () => {
      const success: Message = {code: SuccessTypes.SUCCESS_RECONNECTED_TO_GOD, message: 'Reconnected to Server'};
      this.store.dispatch(this.statusActions.changeSuccessMessage(success));
    });
  }

  public registerOD(data: any): any
  {
    this.socket.emit('registerOD', data);

    this.socket.on('registerODResult', result =>
    {
      this.utilitiesService.sendToNative(result, 'print');
      const res = result.data;
      const message = result.message;

      if (message.code > 299)
      {
        this.store.dispatch(this.statusActions.changeErrorMessage(message));
        return;
      }
      this.store.dispatch(this.userActions.changeUser(res.user));
      this.store.dispatch(this.userActions.changeLookupTable(res.locations));
      this.store.dispatch(this.userActions.changeToken(res.token));
      this.store.dispatch(this.statusActions.changeLoggedIn(true));

      this.locationService.setToStartPoint();

      this.router.navigate(['/mainview']).then( () =>
        {
          // send success to native & start beacon scan
          this.utilitiesService.sendToNative('success', 'registerOD');
        }
      );

      this.socket.removeAllListeners('registerODResult');
    });
  }

  public registerODGuest(data: any): any
  {
    this.socket.emit('registerODGuest', data);

    this.socket.on('registerODGuestResult', result =>
    {
      const res = result.data;
      const message = result.message;

      if (message.code > 299)
      {
        this.store.dispatch(this.statusActions.changeErrorMessage(message));
        return;
      }

      this.store.dispatch(this.userActions.changeUser(res.user));
      this.store.dispatch(this.userActions.changeLookupTable(res.locations));
      this.store.dispatch(this.userActions.changeToken(res.token));
      this.store.dispatch(this.statusActions.changeLoggedIn(true));

      this.locationService.setToStartPoint();

      this.router.navigate(['/mainview']).then( () =>
        {
          this.utilitiesService.sendToNative('success', 'registerOD');
        }
      );

      this.socket.removeAllListeners('registerODGuestResult');
    });
  }

  public registerODGuestToReal(data: any): any
  {
    console.log('ODGuestToReal before emit');
    this.socket.emit('makeToRealUser', data);

    this.socket.on('makeToRealUserResult', result =>
    {
      this.utilitiesService.sendToNative(result, 'print');
      const res = result.data;
      const message = result.message;

      if (message.code > 299)
      {
        this.store.dispatch(this.statusActions.changeErrorMessage(message));
        return;
      }
      this.store.dispatch(this.userActions.changeUser(res.user));
      // this.store.dispatch(this.userActions.changeLookupTable(res.locations));
      this.store.dispatch(this.userActions.changeToken(res.token));
      // this.store.dispatch(this.statusActions.changeLoggedIn(true));

      this.locationService.setToStartPoint();

      this.router.navigate(['/mainview']).then( () =>
        {
        }
      );

      this.socket.removeAllListeners('makeToRealUserResult');
    });
  }

  public registerLocation(id: number, dismissed: boolean): any
  {
    const state = this.store.getState();
    const user = state.user;
    this.socket.emit('registerLocation', {location: id, user: user.id, dismissed});

    this.socket.on('registerLocationResult', result =>
    {
      const loc = result.data.location;
      const dis = result.data.dismissed;
      const message = result.message;

      if (message.code > 299)
      {
        this.store.dispatch(this.statusActions.changeErrorMessage(message));
        this.utilitiesService.sendToNative('RegisterLocation: FAILED', 'print');
        return;
      }

      if (dis === false)
      {
        this.locationService.updateCurrentLocation(loc);
        this.utilitiesService.sendToNative('New Location is ' + this.locationService.currentLocation, 'print');
        const currLoc = this.locationService.currentLocation.value;

        this.router.navigate([currLoc.contentURL]).then(() => { });
      }

      this.socket.removeAllListeners('registerLocationResult');
    });
  }

  public registerTimelineUpdate(id: number): any
  {
    const state = this.store.getState();
    const user = state.user;

    this.socket.emit('registerTimelineUpdate', {location: id, user: user.id});

    this.socket.on('registerTimelineUpdateResult', result =>
    {
      const lookuptable = result.data.locations;
      const message = result.message;

      if (message.code > 299)
      {
        this.store.dispatch(this.statusActions.changeErrorMessage(message));
        this.utilitiesService.sendToNative('RegisterTimelineUpdate: FAILED', 'print');
        return;
      }

      // TODO: TRIGGER SCROLL HERE
      const data = {location: id};
      this.alertService.sendMessageLocationid(data);
      const elm: HTMLElement = document.getElementById('ghostScrollbutton') as HTMLElement;
      elm.click();

      this.utilitiesService.sendToNative('success', 'triggerSignal');
      this.store.dispatch(this.userActions.changeLookupTable(lookuptable));

      this.socket.removeAllListeners('registerTimelineUpdateResult');
    });
  }

  public registerLocationLike(location: any, like: boolean): void
  {
    const state = this.store.getState();
    const user = state.user;
    this.socket.emit('registerLocationLike', {location: location.id, like, user: user.id});

    this.socket.on('registerLocationLikeResult', result =>
    {
      const res = result.data;
      const message = result.message;

      this.store.dispatch(this.userActions.changeLookupTable(res.locations));

      const currLoc = this.locationService.currentLocation.value;
      this.locationService.updateCurrentLocation(currLoc.id);

      if (message.code > 299)
      {
        this.store.dispatch(this.statusActions.changeErrorMessage(message));
        return;
      }

      this.socket.removeAllListeners('registerLocationLikeResult');
    });
  }

  public checkLocationStatus(data: any, callback: any = null): void
  {
    this.socket.emit('checkLocationStatus', data);

    this.socket.on('checkLocationStatusResult', result =>
    {
      const res = result.data;
      const message = result.message;

      if (message.code > 299)
      {
        this.store.dispatch(this.statusActions.changeErrorMessage(message));
        return;
      }

      const location = this.locationService.findLocation(res.location);

      if (location.locationTypeId !== 2) {
        this.store.dispatch(this.locationActions.changeLocationStatus(res.status));
      }

      if (callback != null)
      {
        callback(res.status);
      }

      this.socket.removeAllListeners('checkLocationStatusResult');
    });
  }

  public disconnectedFromExhibit(parentLocation, location): void
  {
    this.socket.emit('disconnectedFromExhibit', {parentLocation, location});

    this.socket.on('disconnectedFromExhibitResult', result =>
    {
      const res = result.data;
      const message = result.message;
      this.utilitiesService.sendToNative('Disconnected from Exhibit-' + parentLocation + ': ' + result, 'print');

      if (message.code > 299)
      {
        this.store.dispatch(this.statusActions.changeErrorMessage(message));
        return;
      }

      if(this.store.getState().isLoggedIn === true)
      {
        this.registerLocation(res.parent, false);
      }

      this.socket.removeAllListeners('disconnectedFromExhibitResult');
    });
  }

  public autoLogin(token: String): void
  {
    this.socket.emit('autoLoginOD', token);

    this.socket.on('autoLoginODResult', result =>
    {

      const data = result.data;
      const message = result.message;

      if (message.code > 299)
      {
        this.store.dispatch(this.statusActions.changeErrorMessage(message));
        return;
      }

      this.store.dispatch(this.userActions.changeUser(data.user));
      this.store.dispatch(this.userActions.changeLookupTable(data.locations));
      this.store.dispatch(this.userActions.changeToken(data.token));
      this.store.dispatch(this.statusActions.changeLoggedIn(true));
      this.store.dispatch(this.statusActions.changeLanguage(data.user.contentLanguageId));

      this.locationService.setToStartPoint();

      this.router.navigate(['/mainview']).then( () =>
      {
        // send success to native & start beacon scan
        this.utilitiesService.sendToNative('success', 'registerOD');
      });

      this.socket.removeAllListeners('autoLoginODResult');
    });
  }

  public loginOD(data: any): void
  {
    this.socket.emit('loginOD', data);

    this.socket.on('loginODResult', result =>
    {
      const data = result.data;
      const message = result.message;

      if (message.code > 299)
      {
        this.store.dispatch(this.statusActions.changeErrorMessage(message));
        this.alertService.setMessageWrongLoginCheck(true);
        return;
      }
      this.alertService.setMessageWrongLoginCheck(false);
      this.store.dispatch(this.userActions.changeUser(data.user));
      this.store.dispatch(this.userActions.changeLookupTable(data.locations));
      this.store.dispatch(this.userActions.changeToken(data.token));
      this.store.dispatch(this.statusActions.changeLoggedIn(true));
      this.store.dispatch(this.statusActions.changeLanguage(data.user.contentLanguageId));

      this.locationService.setToStartPoint();

      this.router.navigate(['/mainview']).then( () =>
      {
        // send success to native & start beacon scan
        this.utilitiesService.sendToNative('success', 'loginOD');
      });

      this.socket.removeAllListeners('loginODResult');
    });
  }

  public checkUsernameExists(username: String): void
  {
    console.log('checkUsername');
    this.socket.emit('checkUsernameExists', username);

    this.socket.on('checkUsernameExistsResult', result =>
    {
      // const data = {result: result, bothChecked: bothChecked};
      // this.alertService.sendUsernameRegisterCheckResult(data);
      this.socket.removeAllListeners('checkUsernameExistsResult');
      return result;
    });
  }

  public checkEmailExists(email: String): void
  {
    console.log('checkEmail');
    this.socket.emit('checkEmailExists', email);

    this.socket.on('checkEmailExistsResult', result =>
    {
      // this.alertService.sendEmailRegisterCheckResult(result);
      this.socket.removeAllListeners('checkEmailExistsResult');
      return result;
    });
  }

  public checkUserOrEmailExists(data: any): void
  {
    this.socket.emit('checkNameOrEmailExists', data);

    this.socket.on('checkNameOrEmailExistsResult', result =>
    {
      this.alertService.sendMessageUserOrEmailRegisterCheck(result);
      this.socket.removeAllListeners('checkNameOrEmailExistsResult');
      return result;
    });
  }

  public checkWifi(wifiSSID: any): void
  {
    this.socket.emit('checkWifiSSID', wifiSSID);

    this.socket.on('checkWifiSSIDResult', result =>
    {
      const isCorrect = result.data.check;

      if(isCorrect)
      {
        this.utilitiesService.sendToNative('correctWifi','getWifiStatusResult');
        this.utilitiesService.sendToNative('bluetoothCheck','activateBluetoothCheck');
      }
      else
      {
        this.utilitiesService.sendToNative('openWifiDialogNative','openWifiDialogNative');
      }
    this.socket.removeAllListeners('checkWifiSSIDResult');
    });
  }

  public updateUserCredentials(data: any){
    this.socket.emit('changeODCredentials', data);

    this.socket.on('changeODCredentialsResult', result =>
    {
      const res = result.data;
      const message = result.message;
      console.log(message);

      if (message.code > 299)
      {
        this.store.dispatch(this.statusActions.changeErrorMessage(message));
        this.alertService.sendMessageChangedCred(false);
        return;
      }
      this.alertService.sendMessageChangedCred(true);
      this.alertService.sendMessageExistingCredentialsOnChange(false);
      this.store.dispatch(this.userActions.changeUser(res.user));
      this.store.dispatch(this.userActions.changeToken(res.token));

      return result;
    });
  }

  public deleteUserAccount(data){
    this.socket.emit('deleteOD', data);
  }

  public updateUserLanguage(lang: number): any
  {
    const state = this.store.getState();
    const user = state.user;

    this.socket.emit('updateUserLanguage', {language: lang, user: user.id});

    this.socket.on('updateUserLanguageResult', result =>
    {
      const lookuptable = result.data.locations;
      const language = result.data.language;
      const message = result.message;

      if (message.code > 299)
      {
        this.store.dispatch(this.statusActions.changeErrorMessage(message));
        this.utilitiesService.sendToNative('RegisterTimelineUpdate: FAILED', 'print');
        return;
      }

      this.store.dispatch(this.statusActions.changeLanguage(language));
      this.store.dispatch(this.userActions.changeLookupTable(lookuptable));

      this.socket.removeAllListeners('registerLocationResult');
    });
  }
}
