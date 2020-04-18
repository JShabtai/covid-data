import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

const globalConfirmedPath = '';

@Injectable({
  providedIn: 'root'
})
export class DataFetcherService {

  constructor(
      private http: HttpClient,
  ) { }

  fetchPopulation() {
      return this.http.get(`/assets/population.json`, { responseType: "text" });
  }

  fetchData(dataType: string) {
      return this.http.get(`/assets/time_series_covid19_${dataType}_global.csv`, { responseType: "text" });
  }
}
