import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Subject } from 'rxjs/Subject';

@Injectable()
export class AlertService {
  private subjectAlert = new Subject<any>();
  private subjectResponse = new Subject<any>();

  sendMessage(message: any) {
      this.subjectAlert.next(message);
  }

  getMessage(): Observable<any> {
      return this.subjectAlert.asObservable();
  }

  sendMessageResponse(message: any) {
    this.subjectResponse.next(message);
  }

  getMessageResponse(): Observable<any> {
      return this.subjectResponse.asObservable();
  }
}