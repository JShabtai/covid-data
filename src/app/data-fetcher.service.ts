import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { parse } from '@vanillaes/csv';
import { Observable } from 'rxjs';

import { PopulationService } from './population/population.service';

import { DatasetInterface, Dataset, GLOBAL_NAME } from './dataset';

@Injectable({
    providedIn: 'root'
})
export class DataFetcherService {
    public allData: Dataset | null = null;

    private observable: Observable<void>;

    constructor(
        private http: HttpClient,
        private populationService: PopulationService,
    ) { }

    private fetchAllData() {
        // TODO Download gzipped data
        return this.http.get(`/assets/alldata.json`, { responseType: "json" });
    }

    public fetchData(): Observable<object> {
        const fetchObservable = this.fetchAllData();
        fetchObservable.subscribe((data: DatasetInterface) => {
            data.name = GLOBAL_NAME;
            this.allData = new Dataset(this.populationService, data);
        });

        return fetchObservable;
    }
}
