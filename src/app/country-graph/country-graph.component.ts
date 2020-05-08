import { MediaMatcher } from '@angular/cdk/layout';
import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSidenav } from '@angular/material/sidenav';

import { Observable } from 'rxjs';

import { AboutDialogComponent } from '../about-dialog/about-dialog.component';
import { HelpDialogComponent } from '../help-dialog/help-dialog.component';
import { DataFetcherService } from '../data-fetcher.service';
import { PopulationService } from '../population/population.service';
import { Dataset, GLOBAL_NAME } from '../dataset';
import { parse } from 'csv-es';

// The Chart library (and zoom plugin) are included with the angular 'scripts' config.
// Here we just need the typings, but we don't want to import the module itself otherwise we would
// use that instance instead of the global one which the zoom plugin installs itself into.
// So import the module, and alias the type. The module won't actually be included in the build,
// only the typings will be used at compile time.
import * as ChartTypings from 'chart.js';
declare const Chart: typeof ChartTypings;

enum MenuSelection {
    None = '',
    Country = 'country',
    Options = 'options',
}

@Component({
  selector: 'app-country-graph',
  templateUrl: './country-graph.component.html',
  styleUrls: ['./country-graph.component.css']
})
export class CountryGraphComponent implements OnInit {
  ngOnInit(): void {
  }

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
  public states: {[state: string]: Dataset} = {};
  public regions: {[region: string]: Dataset} = {};

  public menuSelection = MenuSelection.Country ;
  public menuOpen = true;
  public selectedCountryList: Dataset[] = [];

  public chart: Chart;
  public isZoomed: boolean = false;

  public dataTypes: string[] = ['Confirmed', 'Active', 'Recovered', 'Deaths'];
  public dataType: string = this.dataTypes[0].toLowerCase();

  public graphTypes: string[] = ['Daily', 'Change', 'Ratio'];
  public graphType: string = this.graphTypes[0].toLowerCase();
  public offset100: boolean = true;

  public perCapita: boolean = true;
  public selectedOptions;

  public mobileQuery: MediaQueryList;
  private _mobileQueryListener: () => void;

  @ViewChild('sideNav') sideNav: MatSidenav;

  constructor(
      private dataFetcher: DataFetcherService,
      private populationService: PopulationService,
      private media: MediaMatcher,
      private dialog: MatDialog,
  ) {
      const observable = new Observable(subscriber => {
          let count = 0;
          for (let dataType of ['confirmed', 'deaths', 'recovered']) {
              this.dataFetcher.fetchGlobalData(dataType)
              .subscribe((data: string) => {
                  this.addDataToDataset(dataType, data);

                  if (++count >= 5) {
                      subscriber.next();
                  }
              });
          }

          // Currently there is no recovered data for individual states
          for (let dataType of ['confirmed', 'deaths']) {
              this.dataFetcher.fetchUsData(dataType)
              .subscribe((data: string) => {
                  this.addUsData(dataType, data);

                  if (++count >= 5) {
                      subscriber.next();
                  }
              });
          }
      }).subscribe(() => {
          // Toggle because the layout gets screwed up and I'm not sure why but closing
          // and opening fixes it. TODO look into this...
          // I think it has something to do with the width changing as countries are added.
          this.sideNav.toggle();
          this.sideNav.toggle();

          // Generate country data
          for (let region of Object.keys(this.regions)) {
              this.addCountryData(this.regions[region]);
          }

          this.countries['US'].subsets = Object.values(this.states);

          this.selectDefault();

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
      });

      this.mobileQuery = media.matchMedia('(max-width: 600px)');
  }

  protected ngOnDestroy(): void {
    this.mobileQuery.removeListener(this._mobileQueryListener);
  }

  public getCountries(): Dataset[] {
      return Object.keys(this.countries).sort((first, second) => {
              if (first === GLOBAL_NAME) {
                  return -1;
              }
              else if (second === GLOBAL_NAME) {
                  return 1;
              }
              else {
                  if (first < second) {
                      return -1;
                  }
                  else if (second < first) {
                      return 1;
                  }
                  else {
                      return 0;
                  }
              }
          }).map((country) => {
          return this.countries[country];
      });
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

  public updateChart() {
      const plots = this.selectedCountryList.map(c => c.getData(this.graphType, this.dataType, {
          smoothingFactor: 7,
          perCapita: this.perCapita,
          offset100: this.offset100,
      }));
      let xLabels = [];

      for (let plot of plots) {
          if (plot.xAxisLabels.length > xLabels.length) {
              xLabels = plot.xAxisLabels;
          }
      }

      const canvas = <HTMLCanvasElement> document.getElementById("covidChart");
      const ctx = canvas.getContext("2d");

      if (this.chart != null) {
          this.chart.destroy();
      }
      const xAxes: Chart.ChartXAxe[] = [{
          // Have to use 'time' even for non-time based graphs because the zoom plugin only
          // seems to work correctly in that case (otherwise cannot zoom on X, only Y)
          type: 'time',
          scaleLabel: {
              display: true,
              labelString: plots.length > 0 ? plots[0].xAxisName : '',
          },
      }];

      let tooltips = {};

      if (this.offset100) {
          // The values which are number of days since 100 cases get interpreted as seconds since
          // epoch. Override the tooltip and display callbacks to just display the number.
          xAxes[0].ticks = {
              callback: function(value, index, values) {
                  return String(index);
              }
          };

          tooltips= {
              callbacks: {
                  title: function(tooltipItems, data) {
                      return String(tooltipItems[0].index);
                  }
              }
          };
      }
      else {
          xAxes[0].time = {
              unit: 'day',
          }
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
                      borderColor: CountryGraphComponent.chartColours[index % CountryGraphComponent.chartColours.length],
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
                      // type: 'logarithmic',
                      ticks: {
                          suggestedMin: 0,
                      },
                      scaleLabel: {
                          display: true,
                          labelString: plots.length > 0 ? plots[0].yAxisName : '',
                      }
                  }],
                  xAxes,

              },
              plugins: {
                  zoom: {
                      pan: {
                          enabled: false,
                      },
                      zoom: {
                          sensitivity: 0,
                          enabled: true,
                          mode: 'xy',
                          drag: true,
                          onZoomComplete: (chart) => {
                              this.isZoomed = true;
                          }
                      },
                  },
              },
              tooltips,
          },
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
      ].sort().map(name => this.countries[name]);

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
      this.updateChart()
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

  public resetZoom() {
      this.isZoomed = false;
      // Chart typing doesn't include the resetZoom() function added by the plugin
      (this.chart as any).resetZoom();
  }

  public toggle() {
      this.sideNav.toggle();
  }
}
