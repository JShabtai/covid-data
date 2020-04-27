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

    xAxisLabels: string[];
    yAxisData: number[];

    name: string;
}

export class Dataset {
    private static readonly countryColumn = 1;
    private static readonly provinceColumn = 0;
    private static readonly latitudeColumn = 2;
    private static readonly longitudeColumn = 3;
    private static readonly dataStartColumn = 4;

    /**
     * Smaller regions which this one is made up of (e.g. provinces in a country)
     */
    public subsets: Dataset[] = [];

    public country: string;
    public province: string;
    public name: string;
    public latitude: number;
    public longitude: number;

    public totalConfirmed = 0;
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

    // This is not a great default, but it makes the graph usable for countries with no population data
    // The per-capita view will be the same as the normal view
    public population = 1000;

    constructor();
    constructor(header: string[], record: string[]);
    constructor(header?: string[], record?: string[]) {
        if (header instanceof Array && record instanceof Array) {
            this.dates = header.slice(Dataset.dataStartColumn);
            this.country = record[Dataset.countryColumn];
            this.province = record[Dataset.provinceColumn] ||"";
            this.latitude = Number(record[Dataset.latitudeColumn]);
            this.longitude = Number(record[Dataset.longitudeColumn]);


            if (this.province.length > 0) {
                this.name = `${this.province}`;
            }
            else {
                this.name = this.country;
            }
        }
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
            this.totalConfirmed = this.data['confirmed'][this.data['confirmed'].length - 1]

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

    public addDataset(dataset: Dataset): void {
        // For some reason there are rows for the province of 'Recovered' in Canada with no data. Ignore them.
        if (dataset.name === 'Recovered') {
            return;
        }

        if (this.country == null) {
            this.dates = [...dataset.dates];
            this.country = dataset.country;
            this.name = dataset.country;
            this.latitude = dataset.latitude;
            this.longitude = dataset.longitude;

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
        if (dataset.name !== 'Canada') {
            this.subsets.push(dataset);
        }

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
        let perCapitaFactor = options.perCapita ? 1000/this.population : 1;
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
        let perCapitaFactor = options.perCapita ? 1000/this.population : 1;
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
                returnData.xAxisLabels[i] = String(i);
            }

            returnData.xAxisName = 'Days since 100 cases';
        }

        return returnData;
    }

    public toggleExpand() {
        console.log('toggling ' + this.name);
        this.expand = !this.expand;
    }
}
