import { Component, OnInit, OnDestroy } from '@angular/core';
import { GodService } from '../god.service';
import {LocationService} from '../location.service';

@Component({
  selector: 'app-content-table-on',
  templateUrl: './content-table-on.component.html',
  styleUrls: ['./content-table-on.component.css']
})
export class ContentTableOnComponent implements OnInit {
  private connectionSuccess: boolean;
  private location: any;
  private locationName: string;

  constructor(
    private godService: GodService,
    private locationService: LocationService
  ) { }

  ngOnInit() {
    this.location = this.locationService.currentLocation;
    this.locationName = this.location.description;
    // TODO get IP address from LocationService
    const ip = this.location.ipAddress;

    // TODO open SocketConnection connectOD(user)
    // if success set connectionSuccess true
    this.connectionSuccess = false;

  }

  ngOnDestroy() {
    // TODO socket-Verbindung schließen disconnectOD
  }
}
