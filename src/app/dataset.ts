import { PopulationService } from './population/population.service';

export const GLOBAL_NAME = 'Global';

export interface Datapoint extends Record<string, number | undefined> {
    confirmed: number;
    recovered: number;
    deaths: number;
    active?: number;
};

type TimeSeriesData = Record<string, Datapoint>;

export interface DatasetInterface {
    name: string;
    data: TimeSeriesData;
    subsets: Record<string, DatasetInterface>;
}

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

    description?: string;
}


export class Dataset {
    /**
     * Smaller regions which this one is made up of (e.g. provinces in a country)
     */
    public subsets: Dataset[] = [];

    public name: string;
    public parentName: string | null;

    public totalConfirmed = 0;
    public totalConfirmedPerCapita = 0;
    public daysTo100 = 0;

    public expand: boolean = false;

    public dates: string[];

    public data: TimeSeriesData = {};

    constructor(
        private populationService: PopulationService,
        dataset: DatasetInterface,
        parentName: string = null,
    ) {
        this.name = dataset.name;
        this.parentName = parentName;

        this.data= dataset.data;
        this.dates = Object.keys(this.data).sort();

        for (let name of Object.keys(dataset.subsets).sort()) {
            const subset = new Dataset(populationService, dataset.subsets[name], this.name)

            if (subset.totalConfirmed <= 0) {
                continue;
            }

            this.subsets.push(subset);

            if (this.parentName == null) {
                this.populationService.addCountryToGlobe(name);
            }
        }

        this.analyze();
    }


    /**
     * Perform certain analysis if all data is now present:
     * - Active cases
     * - Total confirmed cases
     * - Number of days to 100 cases
     */
    public analyze() {
        let lastDay = this.dates[this.dates.length - 1];
        this.totalConfirmed = this.data[lastDay].confirmed;
        this.totalConfirmedPerCapita = 1000 * this.totalConfirmed / this.population();

        this.daysTo100 = this.dates.length;
        for (let i = 0; i < this.dates.length; i++) {
            if (this.data[this.dates[i]].confirmed >= 100) {
                this.daysTo100 = i;
                break;
            }
        }

        for (let date of this.dates) {
            const datapoint = this.data[date];
            datapoint.active = datapoint.confirmed - datapoint.recovered - datapoint.deaths;
        }
    }

    private getDataArrays(dataType: string):  number[]  {
        const ret: number[] = [];

        for (let date of this.dates) {
            ret.push(this.data[date][dataType]);
        }

        return ret;
    }

    public getRatiosSmooth(dataType: string, options: Options): GraphingData {
        const workingData = this.getDataArrays(dataType);
        let ratios = [];
        for (let i = options.smoothingFactor; i < this.dates.length; i++) {
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
        const workingData = this.getDataArrays(dataType);
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
        const workingData = this.getDataArrays(dataType);
        let differences = [];
        let perCapitaFactor = options.perCapita ? 1000/this.population() : 1;
        for (let i = options.smoothingFactor; i < this.dates.length; i++) {
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

    public deltaConfirmedActiveRatio(options: Options): GraphingData {
        const active = this.getDataArrays('active');
        const confirmed = this.getDataArrays('confirmed');
        let data = [0];
        let perCapitaFactor = options.perCapita ? 1000/this.population() : 1;
        for (let i = 1; i < this.dates.length; i++) {
            data.push(100 * (confirmed[i] - confirmed[i-1] ) / active[i]);
        }

        return {
            xAxisName: 'Date',
            yAxisName: `New cases per confirmed case (%)`,
            chartName: `Change in daily confirmed cases per current active case`,

            xAxisLabels: this.dates,
            yAxisData: data,

            name: this.name,
            description: `This shows the number of new confirmed cases as a percentage of the current active cases. <br />
            This is intended to see how quickly the COVID is spreading, and how effective regional measures are at reducing spread. <br />
            <b>Note</b>: This graph will only be useful if the dataset has recovered data. In some datasets
            (namely individual states in the US) the recovered data is always 0, making this graph
            virtually useless for those datasets.`
        };
    }

    public getData(graphType: string, dataType: string, options: Options): GraphingData {
        let returnData: GraphingData;

        if (dataType === 'new confirmed per active') {
            returnData = this.deltaConfirmedActiveRatio(options);
        }
        else {
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

    public canExpand(): boolean {
        return this.subsets.length > 0 && this.name != GLOBAL_NAME;
    }

    public toggleExpand() {
        this.expand = !this.expand;
    }

    public population(): number {
        if (this.parentName == null) {
            return this.populationService.getGlobalPopulation();
        }
        else if (this.parentName === GLOBAL_NAME) {
            return this.populationService.getCountryPopulation(this.name);
        }
        else {
            return this.populationService.getRegionPopulation(this.parentName, this.name);
        }
    }
}
