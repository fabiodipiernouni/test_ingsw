import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PropertyUpload } from './property-upload';

describe('PropertyUpload', () => {
  let component: PropertyUpload;
  let fixture: ComponentFixture<PropertyUpload>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PropertyUpload]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PropertyUpload);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
