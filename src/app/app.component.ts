import { MediaMatcher } from '@angular/cdk/layout';
import { Component, ViewChild } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSidenav } from '@angular/material/sidenav';

import { Observable } from 'rxjs';

import { AboutDialogComponent } from './about-dialog/about-dialog.component';
import { HelpDialogComponent } from './help-dialog/help-dialog.component';
import { CountryGraphComponent } from './country-graph/country-graph.component';
import { DataFetcherService } from './data-fetcher.service';
import { PopulationService } from './population/population.service';
import { Dataset, GLOBAL_NAME } from './dataset';
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
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'covid-data';

  private _mobileQueryListener: () => void;

  public mobileQuery: MediaQueryList;

  public selectedComponent: string = 'countryGraph';

  @ViewChild('countryGraph') countryGraph: CountryGraphComponent;

  constructor(
      private media: MediaMatcher,
      private dialog: MatDialog,
  ) {
      this.mobileQuery = media.matchMedia('(max-width: 600px)');
  }

  protected ngOnDestroy(): void {
    this.mobileQuery.removeListener(this._mobileQueryListener);
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
