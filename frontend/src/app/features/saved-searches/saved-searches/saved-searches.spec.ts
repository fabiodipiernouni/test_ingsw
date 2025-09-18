import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SavedSearches } from './saved-searches';

describe('SavedSearches', () => {
  let component: SavedSearches;
  let fixture: ComponentFixture<SavedSearches>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SavedSearches]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SavedSearches);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
