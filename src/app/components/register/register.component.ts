import { Component, OnInit, Inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { WindowRef } from '../../WindowRef';
import {UserActions} from '../../store/actions/UserActions';
import { NativeCommunicationService } from '../../services/native/native-communication.service';
import { FormBuilder, FormGroup, Validators, FormControl, ValidatorFn } from '@angular/forms';
import {TransmissionService} from '../../services/transmission.service';
import { AlertService } from '../../services/alert.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
@Injectable()
export class RegisterComponent implements OnInit
{
  public registerName: string;
  public registerEmail: string;
  public registerPassword: string;
  public confirmPassword_: string;
  private errorCredentialMessage: string;

  public subscriptionExistingCred: Subscription;
  private existingEmail: boolean;
  private existingUser: boolean;
  private wrongCred: boolean;

  nameFormControl = new FormControl('', [Validators.required]);
  emailFormControl = new FormControl('', [Validators.required]);
  passwordFormControl = new FormControl('', [Validators.required,
    Validators.pattern('(?=.*[0-9])(?=.*[A-Z])(?=.*[a-z])(?=.*[!@#$%^*&?)§(\/])[A-Za-z0-9!@#$%^*&?)§(\/].{5,}')]);
  confirmPasswordFormControl = new FormControl('', [Validators.required]);

  signupForm: FormGroup = new FormGroup({
    name: this.nameFormControl,
    email: this.emailFormControl,
    password: this.passwordFormControl,
    confirmPassword: this.confirmPasswordFormControl
  });

  constructor(
    private router: Router,
    private transmissionService: TransmissionService,
    private winRef: WindowRef,
    @Inject('AppStore') private appStore,
    private userActions: UserActions,
    private nativeCommunicationService: NativeCommunicationService,
    private fb: FormBuilder,
    private alertService: AlertService
  ) {
    this.subscriptionExistingCred = this.alertService.getMessageExistingCredentials().subscribe(message => {
      this.existingUser = message.user;
      this.existingEmail = message.email;
      if(this.existingUser && this.existingEmail){
        this.wrongCred = true;
        this.errorCredentialMessage = 'These username and email already exists';
      }else if(this.existingUser){
        this.wrongCred = true;
        this.errorCredentialMessage = 'This username already exists';
      }else if(this.existingEmail){
        this.wrongCred = true;
        this.errorCredentialMessage = 'This email already exists';
      }else{
        this.wrongCred = true;
        this.errorCredentialMessage = 'These credentials don\'t match';
      }
    });
  }

  public requestDeviceInfos(isGuest: boolean)
  {
    this.transmissionService.registerName = this.nameFormControl.value;
    this.transmissionService.registerEmail = this.emailFormControl.value;
    this.transmissionService.registerPassword = this.passwordFormControl.value;
    this.transmissionService.registerIsGuest = isGuest;
    // console.log(this.registerEmail + ' ' + this.registerName + ' ' + this.registerPassword);

    const state = this.appStore.getState();
    const platform = state.platform;

    this.nativeCommunicationService.sendToNative('getDeviceInfos', 'getDeviceInfos');

    if (platform !== 'IOS' && platform !== 'Android')
    {
      const data = {deviceAddress: 'deviceAddress', deviceOS: 'deviceOS', deviceVersion: 'deviceVersion', deviceModel: 'deviceModel'};
      this.transmissionService.transmitODRegister(data);
    }
  }

  ngOnInit()
  {
    this.registerName = '';
    this.registerPassword = '';
    this.registerEmail = '';

    this.signupForm.get('confirmPassword').setValidators(this.matchingpassword('password'));
  }

  getPasswordErrorMessage() {
    return this.passwordFormControl.hasError('required') ? 'You must enter a value' :
      this.passwordFormControl.hasError('pattern') ?
      'Please use at least 6 characters with at least 1 upper case, 1 lower case, ' +
      '1 number and 1 special character! Example: ! $ § % & / ( ) = ?' : '';
  }
  getConfirmPasswordErrorMessage() {

    return this.confirmPasswordFormControl.hasError('required') ? 'You must enter a value' :
      this.confirmPasswordFormControl.hasError('matchingpassword') ? 'The password is not the same' : 'The password is not the same';
  }
  getRequiredErrorMessage(field) {
    return this.signupForm.get(field).hasError('required') ? 'You must enter a value' : '';
  }



  matchingpassword(field: string): ValidatorFn {
    return (control: FormControl): {[key: string]: any} => {
      const group = control.parent;
      const fieldToCompare = group.get(field);
      let notMatching;

      if(String(fieldToCompare.value) === String(control.value) && String(control.value) !== ''){
        notMatching = false;
      }else{
        notMatching = true;
      }
      return notMatching ? {'matching': {value: control.value}} : null;
    };
  }

  getExistsErrorMessage(){
    return this.errorCredentialMessage;
  }

}
