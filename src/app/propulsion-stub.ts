import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({ selector: 'pp-button', standalone: true, template: '<button><ng-content /></button>' })
export class ButtonComponent {
  @Input() label = '';
  @Input() variant = 'primary';
  @Output() ppOnSubmit = new EventEmitter<void>();
}

@Component({ selector: 'pp-dropdown-simple', standalone: true, template: '<select><ng-content /></select>' })
export class DropdownSimpleComponent {
  @Input() inputId = '';
  @Input() dropdownListItems: DropdownSimpleItem[] = [];
  @Output() ppOnSelectedValue = new EventEmitter<string>();
}

@Component({ selector: 'pp-header', standalone: true, template: '<header><ng-content /></header>' })
export class HeaderComponent {
  @Input() productName = '';
  @Input() homeHref = '/';
  @Input() color = '';
}

@Component({ selector: 'pp-password-input', standalone: true, template: '<input type="password" />' })
export class PasswordInputComponent {
  @Input() inputId = '';
  @Input() autocomplete = '';
}

@Component({ selector: 'pp-text-input', standalone: true, template: '<input type="text" />' })
export class TextInputComponent {
  @Input() inputId = '';
  @Input() placeholder = '';
}

export class DropdownSimpleItem {
  id: string;
  label: string;
  value: string;
  constructor(id: string, label: string, value: string) {
    this.id = id;
    this.label = label;
    this.value = value;
  }
}
