import { Injectable } from '@angular/core';

import countryArray from './data/countries.json';
import { RegionPopulations } from './data/regions'

/**
 * This is not terribly useful, but in cases where no data is available it makes per-capita graphs
 * less absurd.
 */
export const DEFAULT_POPULATION = 1000;

@Injectable({
    providedIn: 'root'
})
export class PopulationService {

    private countries: {
        [country: string]: number;
    } = {};

    private globalPopulation: number = 0;

    private globalCountries: Set<string> = new Set<string>();

    constructor() {
        for (let country of countryArray) {
            this.countries[country.country] = Number(country.population);
        }
    }

    /**
     * The "global" population should only include countries that have data, otherwise
     * per-capita values will be even more skewed than they already are by testing variations.
     *
     * This function must be called for every country before the global population is used
     */
    public addCountryToGlobe(country: string): void {
        if (this.globalCountries.has(country)) {
            return;
        }

        this.globalCountries.add(country);
        const countryPop = this.getCountryPopulation(country);

        if (!Number.isNaN(countryPop)) {
            this.globalPopulation += countryPop;
        }
    }

    public getGlobalPopulation(): number {
        return this.globalPopulation;
    }

    public getRegionPopulation(country: string, region: string): number {
        if (RegionPopulations[country] && RegionPopulations[country][region]) {
            return RegionPopulations[country][region];
        }
        else {
            console.warn(`Missing population for region '${region}' in country '${country}'`);
            return DEFAULT_POPULATION;
        }
    }

    public getCountryPopulation(country: string): number {
        switch (country) {
            // The John Hopkins boundaries/names don't line up well with the population data, so
            // manually set these
            case "Serbia":
                return 6963764;
            case "Russia":
                return 146745098;
            case "Montenegro":
                return 631219;
            case "Kosovo":
                return 1810463;
            case "Congo (Kinshasa)":
                return 11855000;
            case "Congo (Brazzaville)":
                return 5244369;
            case "Taiwan*":
                return 23780542;
            case "Diamond Princess":
                return 3711;
            case "MS Zaandam":
                return 1829;
            case "West Bank and Gaza":
                return 3340143;

            // These names don't line up nicely between the two sources, manually map them
            case "US":
                return this.countries['United States'];
            case "Holy See":
                return this.countries['Holy See (Vatican City State)'];
            case "Timor-Leste":
                return this.countries['East Timor'];
            case "Sri Lanka":
                return this.countries['SriLanka'];
            case "Libya":
                return this.countries['Libyan Arab Jamahiriya'];
            case "Korea, South":
                return this.countries['South Korea'];
            case "Fiji":
                return this.countries['Fiji Islands'];
            case "Eswatini":
                return this.countries['Swaziland'];
            case "Czechia":
                return this.countries['Czech Republic'];
            case "Cote d'Ivoire":
                return this.countries['Ivory Coast'];
            case "Cabo Verde":
                return this.countries['Cape Verde'];
            case "Burma":
                return this.countries['Myanmar'];

            default:
                if (this.countries[country] != undefined) {
                    return this.countries[country];
                }
                else {
                    console.warn(`Missing population for country '${country}'`);
                    return DEFAULT_POPULATION;
                }
        }
    }
}
