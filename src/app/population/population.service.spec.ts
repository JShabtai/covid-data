import { TestBed } from '@angular/core/testing';

import { PopulationService } from './population.service';

describe('PopulationService', () => {
  let service: PopulationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PopulationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
