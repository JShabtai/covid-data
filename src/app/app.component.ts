import { Component } from '@angular/core';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';

import { Observable } from 'rxjs';

import { AboutDialogComponent } from './about-dialog/about-dialog.component';
import { HelpDialogComponent } from './help-dialog/help-dialog.component';
import { DataFetcherService } from './data-fetcher.service';
import { Dataset } from './dataset';
import { parse } from 'csv-es';

import * as Chart from 'chart.js';

enum MenuSelection {
    None = '',
    Country = 'country',
    Options = 'options',
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'covid-data';

  public static readonly chartColours = [
      'rgb(255,80, 80)',
      'rgb(100,200, 100)',
      'rgb(75,75, 255)',
      'rgb(220,100, 200)',
      'rgb(120,200, 200)',
      'rgb(220,200, 100)',
      'rgb(150,95, 95)',
      'rgb(36,130, 36)',
      'rgb(25,25, 115)',
  ];

  public countries: {[country: string]: Dataset} = {};
  public regions: {[region: string]: Dataset} = {};

  public regionNames: string[] = [];
  public countryNames: string[] = [];

  public menuSelection = MenuSelection.Country ;
  public menuOpen = true;
  public selectedCountryList: string[] = [];
  public selectedCountries: Dataset[] = [];

  public headers: string[];
  public chart: Chart;

  public dataTypes: string[] = ['Confirmed', 'Active', 'Recovered', 'Deaths'];
  public dataType: string = this.dataTypes[0].toLowerCase();

  public graphTypes: string[] = ['Daily', 'Change', 'Ratio'];
  public graphType: string = this.graphTypes[0].toLowerCase();
  public offset100: boolean = true;

  public perCapita: boolean = true;
  public selectedOptions;

  public populationData: {
      [country: string]: number;
  } = {};

  constructor(
      private dataFetcher: DataFetcherService,
      private dialog: MatDialog,
  ) {
      const observable = new Observable(subscriber => {
          let count = 0;
          for (let dataType of ['confirmed', 'deaths', 'recovered']) {
              this.dataFetcher.fetchData(dataType)
              .subscribe((data: string) => {
                  this.addDataToDataset(dataType, data);

                  if (++count >= 4) {
                      subscriber.next();
                  }
              });
          }

          this.dataFetcher.fetchPopulation()
          .subscribe((data: string) => {
              const populations: {
                  country: string;
                  population: string;
              }[] = JSON.parse(data);
              for (let population of populations) {
                  this.populationData[population.country] = Number(population.population);
              }

              if (++count >= 4) {
                  subscriber.next();
              }
          });
      }).subscribe(() => {
          // Generate country data
          for (let region of this.regionNames) {
              this.addCountryData(this.regions[region]);
          }
          // this.countries[' Ontario'].population = 13448494;

          // These names don't line up nicely between the two sources, manually map them
          this.countries["US"].population = this.populationData['United States'];
          this.countries["Holy See"].population = this.populationData['Holy See (Vatican City State)'];
          this.countries["Timor-Leste"].population = this.populationData['East Timor'];
          this.countries["Sri Lanka"].population = this.populationData['SriLanka'];
          this.countries["Libya"].population = this.populationData['Libyan Arab Jamahiriya'];
          this.countries["Korea, South"].population = this.populationData['South Korea'];
          this.countries["Fiji"].population = this.populationData['Fiji Islands'];
          this.countries["Eswatini"].population = this.populationData['Swaziland'];
          this.countries["Czechia"].population = this.populationData['Czech Republic'];
          this.countries["Cote d'Ivoire"].population = this.populationData['Ivory Coast'];
          this.countries["Cabo Verde"].population = this.populationData['Cape Verde'];
          this.countries["Burma"].population = this.populationData['Myanmar'];

          // The John Hopkins data doesn't line up well with the population data, so
          // manually set these
          this.countries["Serbia"].population = 6963764;
          this.countries["Russia"].population = 146745098;
          this.countries["Montenegro"].population = 631219;
          this.countries["Kosovo"].population = 1810463;
          this.countries["Congo (Kinshasa)"].population = 11855000;
          this.countries["Congo (Brazzaville)"].population = 5244369;
          this.countries["Taiwan*"].population = 23780542;
          this.countries["Diamond Princess"].population = 3711;
          this.countries["MS Zaandam"].population = 1829;

          for (let country of this.countryNames) {
              if (typeof(this.populationData[country]) === 'number') {
                  this.countries[country].population = this.populationData[country];
              }
          }

          this.selectDefault();

          let global = new Dataset();
          global.population = 0;
          global.name = ' Global';
          global.country = ' Global';
          global.province = ' Global';
          global.dates = this.countries[this.countryNames[0]].dates;
          for (let country of this.countryNames) {
              global.addDataset(this.countries[country]);
              global.population += this.countries[country].population;
          }

          this.countries[global.name] = global;
          this.countryNames.push(global.name);
          this.countryNames.sort();
      });
  }

  private addDataToDataset(dataType: string, data: string) {
      const records = parse(data);
      const headers = records[0];

      this.headers = headers.slice(4);

      for (let record of records.slice(1)) {
          let dataset = new Dataset(headers, record);
          if (this.regions[dataset.name] instanceof Dataset) {
              dataset = this.regions[dataset.name];
          }
          else {
              this.regionNames.push(dataset.name);
              this.regions[dataset.name] = dataset;
          }
          dataset.addData(dataType, headers, record);
      }

      this.countryNames.sort();
      this.regionNames.sort();
  }

  private addCountryData(dataset: Dataset): void {
      if (!(this.countries[dataset.country] instanceof Dataset)) {
          const country = new Dataset();
          country.dates = dataset.dates;
          country.name = dataset.country;
          country.country = dataset.country;
          this.countries[dataset.country] = country;
          this.countryNames.push(dataset.country);
      }

      this.countries[dataset.country].addDataset(dataset);
  }

  // public setCountry(x, updateChart: boolean = true) {
  //     console.log(this.selectedOptions);
  //     if (this.selectedCountries.some(country => country.name === x)) {
  //         this.selectedCountries = this.selectedCountries.filter(country => country.name !== x);
  //         this.selectedCountryList.delete(x);
  //     }
  //     else {
  //         this.selectedCountries.push(this.countries[x]);
  //         this.selectedCountryList.add(x);
  //     }

  //     if (updateChart) {
  //         this.updateChart();
  //     }
  // }

  public updateChart() {
      const plots = this.selectedCountryList.map(c => this.countries[c].getData(this.graphType, this.dataType, {
          smoothingFactor: 7,
          perCapita: this.perCapita,
          offset100: this.offset100,
      }));
      let xLabels = plots.length > 0 ? plots[0].xAxisLabels : [];

      if (this.offset100) {
          for (let plot of plots) {
              if (plot.xAxisLabels.length > xLabels.length) {
                  xLabels = plot.xAxisLabels;
              }
          }
      }

      const canvas = <HTMLCanvasElement> document.getElementById("myChart");
      const ctx = canvas.getContext("2d");

      if (this.chart != null) {
          this.chart.destroy();
      }

      this.chart = new Chart(ctx, {
          // The type of chart we want to create
          type: 'line',

          // The data for our dataset
          data: {
              labels: xLabels,
              datasets: plots.map((country, index) => {
                  return {
                      label: country.name,
                      borderColor: AppComponent.chartColours[index % AppComponent.chartColours.length],
                      fill: false,
                      data: country.yAxisData
                  };
              }),
          },

          // Configuration options go here
          options: {
              title: {
                  display: true,
                  text: plots.length > 0 ? plots[0].chartName : '',
              },
              animation: {
                   duration: 0
              },
              scales: {
                  yAxes: [{
                      //type: 'logarithmic',
                      ticks: {
                          suggestedMin: 0,
                      },
                      scaleLabel: {
                          display: true,
                          labelString: plots.length > 0 ? plots[0].yAxisName : '',
                      }
                  }],
                  xAxes: [{
                      scaleLabel: {
                          display: true,
                          labelString: plots.length > 0 ? plots[0].xAxisName : '',
                      }
                  }]
              }
          }
      });
  }

  public onClick (x) {
      if (x === this.menuSelection) {
          this.menuSelection = MenuSelection.None;
      }
      else {
          this.menuSelection = x;
      }
  }

  public selectDefault() {
      // Must be alphabetical order or colours will be shuffled once the sidebar is used
      this.selectedCountryList = [
          'Canada',
          'France',
          'Italy',
          'Spain',
          'US',
          'United Kingdom',
      ].sort();

      this.updateChart();
  }

  public deselectAll() {
      this.selectedCountryList = [];
      this.updateChart();
  }

  // TODO Use binding
  public setPerCapita(event) {
      this.perCapita = event.checked;
      this.updateChart();
  }

  // TODO Use binding
  public setOffset100(event) {
      this.offset100 = event.checked;
      this.updateChart();
  }

  // TODO Preserve order of array. Maybe one way binding and update with this event?
  public onNgModelChange(event) {
      console.log(event);
      this.updateChart()
  }
  public searchCountries(search: string): string[] {
      return this.countryNames.filter((country) => {
          return (country.toLocaleLowerCase().indexOf(search.toLocaleLowerCase()) >= 0);
      });
  }

  public hideCountry(search: string, country: string): boolean {
      return country.toLocaleLowerCase().indexOf(search.toLocaleLowerCase()) < 0;
  }

  public openHelp() {
    const dialogRef = this.dialog.open(HelpDialogComponent, {
      height: '450px',
      width: '850px',
      data: {}
    });
  }

  public openAbout() {
    const dialogRef = this.dialog.open(AboutDialogComponent, {
      height: '450px',
      width: '850px',
      data: {}
    });
  }
}
