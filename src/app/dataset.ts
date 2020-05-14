import { PopulationService } from './population/population.service';

export const GLOBAL_NAME = 'Global';

export interface Options {
    perCapita: boolean;
    smoothingFactor: number;

    /**
     * If true, the returned data starts from the day that 100 cases were reached
     */
    offset100: boolean;
}

export interface GraphingData {
    xAxisName: string;
    yAxisName: string;
    chartName: string;

    xAxisLabels: (number | string )[];
    yAxisData: number[];

    name: string;
}

export class Dataset {
    private static readonly countryColumn = 1;
    private static readonly provinceColumn = 0;
    private static readonly dataStartColumn = 4;

    /**
     * Smaller regions which this one is made up of (e.g. provinces in a country)
     */
    public subsets: Dataset[] = [];

    public country: string;
    public province: string;
    public name: string;

    public totalConfirmed = 0;
    public totalConfirmedPerCapita = 0;
    public daysTo100 = 0;

    public expand: boolean = false;

    /**
     * TODOs
     * * Doubling time (log(2)/log(average growth over last 7 days))
     */

    public dates: string[];
    public data: {
        [dataType: string]: number[];
    } = {};

    constructor(
        private populationService: PopulationService,
    ) {
    }

    public static CreateFromHeader(populationService: PopulationService, header: string[], record: string[]): Dataset {
        const dataset = new Dataset(populationService);

        dataset.dates = header.slice(Dataset.dataStartColumn).map((date) => {
            const parts = date.split('/');
            let month = parts[0];
            let day = parts[1];
            const year = '20' + parts[2]; // Prefix the 2-digit year with '20' to make it complete

            // Pad month and day to 2 digits
            if (month.length == 1) {
                month = '0' + month;
            }

            if (day.length == 1) {
                day = '0' + day;
            }

            // Return an RFC2822 compliant date
            return `${year}-${month}-${day}`;
        });
        dataset.country = record[Dataset.countryColumn];
        dataset.province = record[Dataset.provinceColumn] ||"";


        if (dataset.province.length > 0) {
            dataset.name = `${dataset.province}`;
        }
        else {
            dataset.name = dataset.country;
        }

        return dataset;
    }

    public addData(dataType: string, header: string[], record: string[]) {
        this.data[dataType] = record.slice(Dataset.dataStartColumn).map(count => Number(count));
        this.analyze()
    }

    /**
     * Perform certain analysis if all data is now present:
     * - Active cases
     * - Total confirmed cases
     * - Number of days to 100 cases
     */
    public analyze() {
        if (this.data['confirmed']) {
            this.totalConfirmed = this.data['confirmed'][this.data['confirmed'].length - 1];
            this.totalConfirmedPerCapita = 1000 * this.totalConfirmed / this.population();

            this.daysTo100 = this.data['confirmed'].length;
            for (let i = 0; i < this.data['confirmed'].length; i++) {
                if (this.data['confirmed'][i] >= 100) {
                    this.daysTo100 = i;
                    break;
                }
            }

            if (this.data['recovered'] && this.data['deaths']) {
                this.data['active'] = [...this.data['confirmed']];
                for (let i = 0; i < this.data['active'].length; i++) {
                    this.data['active'][i] -= this.data['recovered'][i];
                    this.data['active'][i] -= this.data['deaths'][i];
                }
            }
        }
    }

    public addDataset(dataset: Dataset, trackSubset: boolean = true): void {
        // For some reason there are rows for the province of 'Recovered' in Canada with no data. Ignore them.
        if (dataset.name === 'Recovered') {
            return;
        }

        if (this.country == null) {
            this.dates = [...dataset.dates];
            this.country = dataset.country;
            this.name = dataset.country;

            for (let dataType of Object.keys(dataset.data)) {
                this.data[dataType] = [...dataset.data[dataType]];
            }
        }
        else {
            for (let dataType of Object.keys(dataset.data)) {
                if (this.data[dataType] instanceof Array) {
                    for (let i = 0; i < dataset.data[dataType].length; i++) {
                        this.data[dataType][i] += dataset.data[dataType][i];
                    }
                }
                else {
                    this.data[dataType] = [...dataset.data[dataType]];
                }
            }
        }

        this.analyze();

        this.province = '';

        // Canada only has a row for number of recoveries at the national level. We want to include this
        // data, but don't want to have 'Canada' as a subset of itself.
        if (dataset.name === 'Canada' || !trackSubset) {
            return;
        }
        this.subsets.push(dataset);

    }
    public getRatiosSmooth(dataType: string, options: Options): GraphingData {
        const workingData = this.data[dataType] || [];
        let ratios = [];
        for (let i = options.smoothingFactor; i < workingData.length; i++) {
            ratios.push(100 * (
                Math.pow(
                    workingData[i]/workingData[i-options.smoothingFactor],
                    1/options.smoothingFactor
                ) - 1));
        }
        return {
            xAxisName: 'Date',
            yAxisName: 'Percent increase (%)',
            chartName: `Daily % increase (${options.smoothingFactor} day average)`,

            xAxisLabels: this.dates.slice(options.smoothingFactor),
            yAxisData: ratios,

            name: this.name,
        };
    }

    public getDaily(dataType: string, options: Options): GraphingData {
        const workingData = this.data[dataType] || [];
        let perCapitaFactor = options.perCapita ? 1000/this.population() : 1;
        return {
            xAxisName: 'Date',
            yAxisName: `Daily ${dataType} cases`,
            chartName: `Total daily ${dataType} cases`,

            xAxisLabels: this.dates,
            yAxisData: workingData.map(x => x * perCapitaFactor),

            name: this.name,
        };
    }

    public getChange(dataType: string, options: Options): GraphingData {
        const workingData = this.data[dataType] || [];
        let differences = [];
        let perCapitaFactor = options.perCapita ? 1000/this.population() : 1;
        for (let i = options.smoothingFactor; i < workingData.length; i++) {
            differences.push(perCapitaFactor * (workingData[i] - workingData[i-options.smoothingFactor] ) / options.smoothingFactor);
        }
        return {
            xAxisName: 'Date',
            yAxisName: `Change in ${dataType} cases`,
            chartName: `Change in daily ${dataType} cases (${options.smoothingFactor} day average)`,

            xAxisLabels: this.dates.slice(options.smoothingFactor),
            yAxisData: differences,

            name: this.name,
        };
    }

    public getData(graphType: string, dataType: string, options: Options): GraphingData {
        let returnData: GraphingData;
        switch (graphType) {
            case 'ratio': 
                returnData = this.getRatiosSmooth(dataType, options);
                break;
            case 'daily': 
                returnData = this.getDaily(dataType, options);
                break;
            case 'change': 
                returnData = this.getChange(dataType, options);
                break;

            default:
                throw new Error(`Graph type '${graphType}' does not exist`);
        }

        if (options.offset100) {
            returnData.yAxisData = returnData.yAxisData.slice(this.daysTo100);
            returnData.xAxisLabels = new Array(returnData.yAxisData.length);
            for (let i = 0; i < returnData.xAxisLabels.length; i++) {
                // Note: This has to be a number otherwise the graph gets screwed up,
                // since Chart.js tries to interpret it as a time.
                returnData.xAxisLabels[i] = i;
            }

            returnData.xAxisName = 'Days since 100 cases';
        }

        return returnData;
    }

    public toggleExpand() {
        this.expand = !this.expand;
    }

    public population(): number {
        if (this.name === GLOBAL_NAME) {
            return this.populationService.getGlobalPopulation();
        }
        else if (this.province != '' || this.name==='California') {
            return this.populationService.getRegionPopulation(this.country, this.province);
        }
        else {
            return this.populationService.getCountryPopulation(this.country);
        }
    }
}
