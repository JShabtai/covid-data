import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CovidgraphComponent } from './covidgraph.component';

describe('CovidgraphComponent', () => {
  let component: CovidgraphComponent;
  let fixture: ComponentFixture<CovidgraphComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CovidgraphComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CovidgraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
