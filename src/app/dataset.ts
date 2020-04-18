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


    public country: string;
    public province: string;
    public name: string;
    public latitude: number;
    public longitude: number;

    public dates: string[];
    public data: {
        [dataType: string]: number[];
    } = {};

    // This is not a great default, but it makes the graph usable for countries with no population data
    public population = 1;

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
                this.name = `${this.country}/${this.province}`;
            }
            else {
                this.name = this.country;
            }
        }
    }

    public addData(dataType: string, header: string[], record: string[]) {
        this.data[dataType] = record.slice(Dataset.dataStartColumn).map(count => Number(count));
        this.computeActive()
    }

    public computeActive() {
        if (this.data['confirmed'] && this.data['recovered'] && this.data['deaths']) {
            this.data['active'] = [...this.data['confirmed']];
            for (let i = 0; i < this.data['active'].length; i++) {
                this.data['active'][i] -= this.data['recovered'][i];
                this.data['active'][i] -= this.data['deaths'][i];
            }
        }
    }

    public addDataset(dataset: Dataset): void {
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

        this.computeActive();

        this.province = '';
    }
    public getRatiosSmooth(dataType: string, factor: number): GraphingData {
        const workingData = this.data[dataType] || [];
        let ratios = [];
        for (let i = factor; i < workingData.length; i++) {
            ratios.push(100 * (
                Math.pow(
                    workingData[i]/workingData[i-factor],
                    1/factor
                ) - 1));
        }
        return {
            xAxisName: 'Date',
            yAxisName: 'Percent increase (%)',
            chartName: `Daily % increase (${factor} day average)`,

            xAxisLabels: this.dates.slice(factor),
            yAxisData: ratios,

            name: this.name,
        };
    }

    public getDaily(dataType: string): GraphingData {
        const workingData = this.data[dataType] || [];
        return {
            xAxisName: 'Date',
            yAxisName: `Daily ${dataType} cases`,
            chartName: `Total daily ${dataType} cases`,

            xAxisLabels: this.dates,
            yAxisData: workingData,//.map(x => x /* * 1000/this.population */),

            name: this.name,
        };
    }

    public getChange(dataType: string, days: number): GraphingData {
        const workingData = this.data[dataType] || [];
        let differences = [];
        for (let i = days; i < workingData.length; i++) {
            differences.push((workingData[i] - workingData[i-days] ) / (days /* * this.population/1000*/));
        }
        return {
            xAxisName: 'Date',
            yAxisName: `Change in ${dataType} cases`,
            chartName: `Change in daily ${dataType} cases (${days} day average)`,

            xAxisLabels: this.dates.slice(days),
            yAxisData: differences,

            name: this.name,
        };
    }

    public getData(graphType: string, dataType: string, smoothingFactor: number): GraphingData {
        switch (graphType) {
            case 'ratio': 
                return this.getRatiosSmooth(dataType, smoothingFactor);
            case 'daily': 
                return this.getDaily(dataType);
            case 'change': 
                return this.getChange(dataType, smoothingFactor);

            default:
                throw new Error(`Graph type '${graphType}' does not exist`);
        }
    }
}
