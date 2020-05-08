import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';

import { MaterialModule } from './material-module';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HelpDialogComponent } from './help-dialog/help-dialog.component';
import { AboutDialogComponent } from './about-dialog/about-dialog.component';
import { CountryGraphComponent } from './country-graph/country-graph.component';

@NgModule({
  declarations: [
    AppComponent,
    HelpDialogComponent,
    AboutDialogComponent,
    CountryGraphComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    FormsModule,
    MatSelectModule,
    MatCheckboxModule,
    MatListModule,
    MatSidenavModule,
    MaterialModule,
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
