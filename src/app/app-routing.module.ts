import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CovidgraphComponent } from './covidgraph/covidgraph.component';

import { AppComponent } from './app.component';

const routes: Routes = [
        // { path: '', component: AppComponent },
        // { path: '/coviddata', component: CovidgraphComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
