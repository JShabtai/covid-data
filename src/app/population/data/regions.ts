export type Population = number;

export interface Region {
    [region: string]: Population;
}

export interface RegionsByCountry {
    [country: string] : Region;
}

export const RegionPopulations: RegionsByCountry = {
    // From https://en.wikipedia.org/wiki/Population_of_Canada_by_province_and_territory
    // April 27, 2020
    Canada: {
        Alberta: 4067175,
        "British Columbia": 4648055,
        Manitoba: 1278365,
        "New Brunswick": 747101,
        "Newfoundland and Labrador": 519716,
        "Northwest Territories": 41786,
        "Nova Scotia": 923598,
        Ontario: 13448494,
        "Prince Edward Island": 142907,
        Quebec: 8164361,
        Saskatchewan: 1098352,
        Yukon: 35874,
    },
}
