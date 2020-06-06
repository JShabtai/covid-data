import { MediaMatcher } from '@angular/cdk/layout';
import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSidenav } from '@angular/material/sidenav';

import { Observable } from 'rxjs';

import { AboutDialogComponent } from '../about-dialog/about-dialog.component';
import { HelpDialogComponent } from '../help-dialog/help-dialog.component';
import { DataFetcherService } from '../data-fetcher.service';
import { PopulationService } from '../population/population.service';
import { Dataset } from '../dataset';
import { parse } from '@vanillaes/csv';

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
        private media: MediaMatcher,
        private dialog: MatDialog,
    ) {
        const subscription = this.dataFetcher.fetchData().subscribe(() => {
            // Toggle because the layout gets screwed up and I'm not sure why but closing
            // and opening fixes it. TODO look into this...
            // I think it has something to do with the width changing as countries are added.
            this.toggle();
            this.toggle();

            this.selectDefault();

            // Unsubscribe so we don't keep resetting the selection when new data is available
            subscription.unsubscribe();
        });
        this.mobileQuery = media.matchMedia('(max-width: 600px)');
    }

    protected ngOnDestroy(): void {
        this.mobileQuery.removeListener(this._mobileQueryListener);
    }

    public getCountries(): Dataset[] {
        if (this.dataFetcher.allData == null) {
            return [];
        }

        // TODO Using spread outside of first element is sloww
        return [this.dataFetcher.allData, ...this.dataFetcher.allData.subsets];
    }

    public updateChart() {
        const plots = this.selectedCountryList.map(c => c.getData(this.graphType, this.dataType, {
            smoothingFactor: 7,
            perCapita: this.perCapita,
            offset100: this.offset100,
        }));
        console.log(plots);
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
        ].sort().map(name => this.dataFetcher.allData.subsets.find(dataset => dataset.name === name));

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
