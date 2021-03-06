import {Component, OnInit, OnDestroy, Inject} from '@angular/core';
import { LocationService } from '../../services/location.service';
import {Unsubscribe} from 'redux';
import {Subscription} from 'rxjs/Subscription';
import {TransmissionService} from '../../services/transmission.service';

@Component(
  {
  selector: 'app-content-passive',
  templateUrl: './content-passive.component.html',
  styleUrls: ['./content-passive.component.css']
  }
)
export class ContentPassiveComponent implements OnInit, OnDestroy
{
  public location: any;
  private readonly _unsubscribe: Unsubscribe;
  private _curLocSubscribe: Subscription;

  constructor(
    private locationService: LocationService,
    private transmissionService: TransmissionService,
    @Inject('AppStore') private appStore
  ) {
    this._unsubscribe = this.appStore.subscribe(() => {
      const state = this.appStore.getState();
      this.updateLocationInformation(state.currentLocation);
    });

    this._curLocSubscribe = this.locationService.currentLocation.subscribe(value =>
    {
      this.location = value;
      console.log(this.location);
    });
  }

  ngOnInit()
  {
    const state = this.appStore.getState();
    this.updateLocationInformation(state.currentLocation);
  }

  updateLocationInformation(value)
  {
    this.location = value;
  }

  ngOnDestroy() {
    this._unsubscribe();
    this._curLocSubscribe.unsubscribe();
  }

  registerLocationLike() {
    this.transmissionService.transmitLocationLike(true);
  }

  registerLocationUnlike() {
    this.transmissionService.transmitLocationLike(false);
  }
}
