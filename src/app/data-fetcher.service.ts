import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { parse } from '@vanillaes/csv';
import { Observable } from 'rxjs';

import { PopulationService } from './population/population.service';

import { Dataset, GLOBAL_NAME } from './dataset';

const globalConfirmedPath = '';

@Injectable({
    providedIn: 'root'
})
export class DataFetcherService {
    public countries: {[country: string]: Dataset} = {};
    public states: {[state: string]: Dataset} = {};
    public regions: {[region: string]: Dataset} = {};

    private observable: Observable<void>;

    constructor(
        private http: HttpClient,
        private populationService: PopulationService,
    ) { }

    private fetchGlobalData(dataType: string) {
        return this.http.get(`/assets/time_series_covid19_${dataType}_global.csv`, { responseType: "text" });
    }

    private fetchUsData(dataType: string) {
        return this.http.get(`/assets/time_series_covid19_${dataType}_US.csv`, { responseType: "text" });
    }

    public fetchData(): Observable<void> {
        if (!(this.observable instanceof Observable)) {
            const fetchObservable = new Observable<void>(subscriber => {
                let count = 0;
                for (let dataType of ['confirmed', 'deaths', 'recovered']) {
                    this.fetchGlobalData(dataType)
                    .subscribe((data: string) => {
                        this.addDataToDataset(dataType, data);

                        if (++count >= 5) {
                            subscriber.next();
                        }
                    });
                }

                // Currently there is no recovered data for individual states
                for (let dataType of ['confirmed', 'deaths']) {
                    this.fetchUsData(dataType)
                    .subscribe((data: string) => {
                        this.addUsData(dataType, data);

                        if (++count >= 5) {
                            subscriber.next();
                        }
                    });
                }
            });

            this.observable = new Observable<void> ((subscriber) => {
                fetchObservable.subscribe(() => {
                    // Generate country data
                    for (let region of Object.keys(this.regions)) {
                        this.addCountryData(this.regions[region]);
                    }

                    this.countries['US'].subsets = Object.values(this.states);

                    let global = new Dataset(this.populationService);
                    global.name = GLOBAL_NAME;
                    global.country = GLOBAL_NAME;
                    global.province = GLOBAL_NAME;
                    global.dates = this.countries[Object.keys(this.countries)[0]].dates;

                    for (let country of Object.keys(this.countries)) {
                        this.populationService.addCountryToGlobe(country);
                        global.addDataset(this.countries[country], false);
                    }

                    this.countries[global.name] = global;

                    subscriber.next();
                });
            });
        }

        return this.observable;
    }

    private addCountryData(dataset: Dataset): void {
        if (!(this.countries[dataset.country] instanceof Dataset)) {
            const country = new Dataset(this.populationService);
            country.dates = dataset.dates;
            country.name = dataset.country;
            country.country = dataset.country;
            this.countries[dataset.country] = country;
        }

        this.countries[dataset.country].addDataset(dataset);
    }

    private addDataToDataset(dataType: string, data: string): void {
        const records = parse(data);
        const headers = records[0];

        for (let record of records.slice(1)) {
            let dataset = Dataset.CreateFromHeader(this.populationService, headers, record);
            if (this.regions[dataset.name] instanceof Dataset) {
                dataset = this.regions[dataset.name];
            }
            else {
                this.regions[dataset.name] = dataset;
            }
            dataset.addData(dataType, headers, record);
        }
    }

    private addUsData(dataType: string, data: string): void {
        // TODO This is messy and needs to be tidied up...
        const records = parse(data);
        const headers = records[0];

        for (let record of records.slice(1)) {
            const dataset = new Dataset(this.populationService);

            dataset.dates = headers.slice(11)
            dataset.country = 'US'
            dataset.province = record[6];
            dataset.name = record[6];

            dataset.data[dataType] = record.slice(11).map(Number);

            if (dataset.province === '') {
                continue;
            }

            if (this.states[dataset.name] instanceof Dataset) {
                const state = this.states[dataset.name];
                state.addDataset(dataset, false);
                // Need to set the province (state) again because addDataset clears it. Yeah, this
                // logic needs reworking. Should probably pre-process this server-side, TBH.
                state.province = record[6];
            }
            else {
                this.states[dataset.name] = dataset;
            }
        }
    }
}
