import { TestBed } from '@angular/core/testing';

import { DataFetcherService } from './data-fetcher.service';

describe('DataFetcherService', () => {
  let service: DataFetcherService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DataFetcherService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
